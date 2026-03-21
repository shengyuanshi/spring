import express from 'express';

const app = express();
const port = process.env.PORT || 8787;
const jobs = new Map();

const DEFAULT_MOONSHOT_MODEL = process.env.MOONSHOT_MODEL || 'kimi-k2.5';
const DEFAULT_MOONSHOT_VISION_MODEL = process.env.MOONSHOT_VISION_MODEL || 'kimi-k2.5';
const DEFAULT_GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';

app.use(express.json({ limit: '20mb' }));

const parseJsonResponse = (text) => {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = fencedMatch?.[1] || text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Model did not return valid JSON.');
  }

  return JSON.parse(raw.slice(start, end + 1));
};

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const sanitizeSvg = (svgMarkup) => {
  const trimmed = svgMarkup.trim();
  if (trimmed.startsWith('<svg')) {
    return trimmed;
  }

  return `<svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg">${trimmed}</svg>`;
};

const createJob = () => {
  const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const job = {
    id,
    status: 'queued',
    stage: 'queued',
    error: null,
    flower: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  jobs.set(id, job);
  return job;
};

const updateJob = (jobId, updates) => {
  const currentJob = jobs.get(jobId);
  if (!currentJob) return;
  jobs.set(jobId, {
    ...currentJob,
    ...updates,
    updatedAt: Date.now(),
  });
};

const withTimeout = async (promise, ms, label) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
};

const withRetry = async (factory, retries, label) => {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await factory(attempt);
    } catch (error) {
      lastError = error;
      console.error(`[custom-flower] ${label} attempt ${attempt + 1} failed`, error);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`${label} failed`);
};

const callMoonshot = async ({ apiKey, messages, model = DEFAULT_MOONSHOT_MODEL }) => {
  const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 1,
      messages,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Moonshot API failed: ${detail}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Moonshot API returned empty content.');
  }

  return content;
};

const extractGeminiImage = (payload) => {
  const parts = payload.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((part) => part.inlineData?.data || part.inline_data?.data);
  const inlineData = imagePart?.inlineData || imagePart?.inline_data;

  if (!inlineData?.data) {
    return null;
  }

  const mimeType = inlineData.mimeType || inlineData.mime_type || 'image/png';
  return `data:${mimeType};base64,${inlineData.data}`;
};

const callGeminiImageModel = async ({ apiKey, prompt, model }) => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini API failed: ${detail}`);
  }

  return await response.json();
};

const callGeminiImage = async ({ apiKey, prompt }) => {
  const primaryPayload = await callGeminiImageModel({
    apiKey,
    prompt,
    model: DEFAULT_GEMINI_IMAGE_MODEL,
  });

  const primaryImage = extractGeminiImage(primaryPayload);
  if (primaryImage) {
    return primaryImage;
  }

  throw new Error(
    `Gemini API did not return image data. Payload: ${JSON.stringify(primaryPayload).slice(0, 800)}`,
  );
};

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

const generateCustomFlower = async ({ imageDataUrl, moonshotApiKey, geminiApiKey, jobId }) => {
    updateJob(jobId, { status: 'running', stage: 'identify' });

    if (!imageDataUrl) {
      throw new Error('Missing imageDataUrl.');
    }

    if (!moonshotApiKey) {
      throw new Error('Missing Moonshot API key.');
    }

    if (!geminiApiKey) {
      throw new Error('Missing Gemini API key.');
    }

    const identifyPrompt = [
      '你是专业植物学作者和产品内容策划，请根据用户上传的花朵照片识别花朵，并只返回 JSON。',
      '不要输出 markdown，不要解释。',
      'JSON 字段必须包含：',
      'name, englishName, description, features, color, bloomTime, funFact, growthType, density, branchType, monetPrompt, svgPrompt',
      '约束：',
      '1. features 必须是 4 条中文短句数组。',
      '2. growthType 只能是 tree 或 ground。',
      '3. density 只能是 dense、medium、sparse 之一。',
      '4. branchType 只能是 straight、curved、twisted 之一。',
      '5. color 返回适合花卡主题色的十六进制颜色。',
      '6. monetPrompt 用中文描述如何生成一张莫奈风格的该花朵艺术图。',
      '7. svgPrompt 用中文描述该花朵的 SVG 视觉特征，强调花瓣、花蕊、枝叶、姿态与种植时的观感。',
    ].join('\n');

    console.log('[custom-flower] identify:start');
    const identified = await withRetry(async () => {
      const identifyResponse = await withTimeout(callMoonshot({
        apiKey: moonshotApiKey,
        model: DEFAULT_MOONSHOT_VISION_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You identify flowers from images and return structured JSON only.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: identifyPrompt },
              { type: 'image_url', image_url: { url: imageDataUrl } },
            ],
          },
        ],
      }), 120000, 'Moonshot identify');

      return parseJsonResponse(identifyResponse);
    }, 1, 'identify');
    console.log('[custom-flower] identify:done');
    const flowerId = `${slugify(identified.englishName || identified.name || 'custom-flower')}-${Date.now()}`;

    const monetPrompt = [
      identified.monetPrompt || `以莫奈印象派风格绘制 ${identified.name}`,
      '画面要保留花朵主要识别特征，色彩柔和、笔触松弛、背景像花园晨雾，适合作为花朵卡片主图。',
      '单朵或小簇花朵居中，避免文字、边框、水印。',
    ].join('，');

    updateJob(jobId, { stage: 'monet-image' });
    console.log('[custom-flower] monet-image:start');
    const generatedImage = await withTimeout(callGeminiImage({
      apiKey: geminiApiKey,
      prompt: monetPrompt,
    }), 90000, 'Gemini image');
    console.log('[custom-flower] monet-image:done');

    const svgPrompt = [
      '你是 SVG 插画设计师，请根据下面信息输出一个可直接渲染的 SVG 字符串。',
      '要求：',
      '1. 必须返回完整 <svg>...</svg>，不要 markdown。',
      '2. viewBox 使用 0 0 120 140。',
      '3. 背景透明。',
      '4. 风格偏简洁、可爱、适合网页种植动画。',
      '5. 结构包含花瓣、花蕊、枝干/花茎、叶片。',
      '6. 所有颜色直接写死在 SVG 里，不要使用外部 CSS。',
      '7. 整体底部留出花茎落点，适合作为从底部长出的花。',
      `花朵名称：${identified.name}`,
      `英文名：${identified.englishName}`,
      `描述：${identified.description}`,
      `特征：${Array.isArray(identified.features) ? identified.features.join('；') : ''}`,
      `视觉方向：${identified.svgPrompt || ''}`,
    ].join('\n');

    updateJob(jobId, { stage: 'svg' });
    console.log('[custom-flower] svg:start');
    const svgMarkup = await withRetry(async () => {
      const svgResponse = await withTimeout(callMoonshot({
        apiKey: moonshotApiKey,
        model: DEFAULT_MOONSHOT_MODEL,
        messages: [
          {
            role: 'system',
            content: 'Return only valid SVG markup.',
          },
          {
            role: 'user',
            content: svgPrompt,
          },
        ],
      }), 120000, `Moonshot svg (${DEFAULT_MOONSHOT_MODEL})`);

      const sanitized = sanitizeSvg(svgResponse);
      if (!sanitized.includes('<svg') || !sanitized.includes('</svg>')) {
        throw new Error('Moonshot svg returned invalid markup.');
      }

      return sanitized;
    }, 1, 'svg');
    console.log('[custom-flower] svg:done');

    updateJob(jobId, { stage: 'packaging' });

    const flower = {
      id: flowerId,
      source: 'custom',
      name: identified.name,
      englishName: identified.englishName,
      image: generatedImage,
      originalImage: imageDataUrl,
      generatedImage,
      svgMarkup,
      description: identified.description,
      features: Array.isArray(identified.features) ? identified.features.slice(0, 4) : [],
      color: identified.color || '#E8D9C8',
      bloomTime: identified.bloomTime || '未知花期',
      funFact: identified.funFact || '这是用户自定义识别生成的花朵。',
      growthType: identified.growthType === 'tree' ? 'tree' : 'ground',
      density: ['dense', 'medium', 'sparse'].includes(identified.density) ? identified.density : 'medium',
      branchType: ['straight', 'curved', 'twisted'].includes(identified.branchType) ? identified.branchType : 'curved',
      createdAt: Date.now(),
    };

    console.log('[custom-flower] complete');
    updateJob(jobId, { status: 'completed', stage: 'completed', flower });
    return flower;
};

app.post('/api/custom-flowers/jobs', async (req, res) => {
  const { imageDataUrl, moonshotApiKey, geminiApiKey } = req.body ?? {};
  const job = createJob();

  res.status(202).json({
    jobId: job.id,
    status: job.status,
    stage: job.stage,
  });

  try {
    await generateCustomFlower({ imageDataUrl, moonshotApiKey, geminiApiKey, jobId: job.id });
  } catch (error) {
    console.error(error);
    updateJob(job.id, {
      status: 'failed',
      stage: 'failed',
      error: error instanceof Error ? error.message : 'Failed to generate custom flower.',
    });
  }
});

app.get('/api/custom-flowers/jobs/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found.' });
  }

  res.json(job);
});

app.listen(port, () => {
  console.log(`Spring API server listening on http://127.0.0.1:${port}`);
});
