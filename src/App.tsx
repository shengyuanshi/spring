import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { renderToStaticMarkup } from 'react-dom/server';
import './App.css';
import { flowers } from './data/flowers';
import { useFaceMesh } from './hooks/useFaceMesh';
import { useMediaPipe } from './hooks/useMediaPipe';
import { useCustomFlowers } from './hooks/useCustomFlowers';
import { useApiSettings } from './hooks/useApiSettings';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import { buildApiUrl } from './lib/api';
import { buildAssetUrl } from './lib/assets';
import { TreeFlower, type TreeFlowerRef } from './components/flowers/TreeFlower';
import { GroundFlower, type GroundFlowerRef } from './components/flowers/GroundFlower';
import { CustomFlower, type CustomFlowerRef } from './components/flowers/CustomFlower';
import { HandSkeleton } from './components/HandSkeleton';
import type { CustomFlower as CustomFlowerType, Flower, FlowerApiSettings, GeneratedFlowerPayload } from './types/flowers';

interface PlantedFlower {
  id: string;
  flowerId: string;
  x?: number;
  y?: number;
  xRatio: number;
  yRatio: number;
  scale: number;
  rotation: number;
  growthType: 'tree' | 'ground';
  density?: 'dense' | 'medium' | 'sparse';
  branchType?: 'straight' | 'curved' | 'twisted';
  timestamp: number;
}

interface SavedGardenState {
  selectedFlowers: string[];
  activeFlower: string | null;
  plantedFlowers: PlantedFlower[];
}

const GARDEN_STATE_STORAGE_KEY = 'spring.garden-state';

function App() {
  const heroImageUrl = buildAssetUrl('hero-bg.jpg');
  const polaroidBgUrl = buildAssetUrl('polaroid-monet-bg.png');
  const bgmUrl = new URL('../夏日入侵企画_勇气_伴奏.mp3', import.meta.url).href;
  const [currentView, setCurrentView] = useState<'hero' | 'selector' | 'garden'>('hero');
  const [selectedFlowers, setSelectedFlowers] = useState<string[]>([]);
  const [activeFlower, setActiveFlower] = useState<string | null>(null);
  const [plantedFlowers, setPlantedFlowers] = useState<PlantedFlower[]>([]);
  const [showDetail, setShowDetail] = useState<Flower | CustomFlowerType | null>(null);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [canPlant, setCanPlant] = useState(true);
  const [windActive, setWindActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingSettings, setPendingSettings] = useState<FlowerApiSettings>({ moonshotApiKey: '', geminiApiKey: '' });
  const [authEmail, setAuthEmail] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [authStep, setAuthStep] = useState<'email' | 'code'>('email');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isGeneratingFlower, setIsGeneratingFlower] = useState(false);
  const [generationStage, setGenerationStage] = useState<string>('idle');
  const [startupStage, setStartupStage] = useState<'idle' | 'camera' | 'face' | 'hand' | 'ready'>('idle');
  const [isCapturingGarden, setIsCapturingGarden] = useState(false);
  const [polaroidPreview, setPolaroidPreview] = useState<string | null>(null);
  const [gardenSize, setGardenSize] = useState({ width: 0, height: 0 });
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  
  const gardenSectionRef = useRef<HTMLElement>(null);
  const gardenRef = useRef<HTMLDivElement>(null);
  const flowerRefs = useRef<Map<string, TreeFlowerRef | GroundFlowerRef | CustomFlowerRef>>(new Map());
  const lastPlantTime = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const captureInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const PLANT_COOLDOWN = 800;
  const showDebug = false;

  const sleep = (ms: number) => new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0.9;
    void audio.play()
      .then(() => {
        setIsMusicPlaying(true);
      })
      .catch((playError) => {
        console.info('Autoplay was blocked by the browser:', playError);
        setIsMusicPlaying(false);
      });
  }, []);
  
  const {
    videoRef,
    isInitialized: faceInitialized,
    isLoading,
    error,
    isMouthOpen,
    mouthOpenness,
    mouthRoundness,
    isBlowingShape,
    resultCount: faceResultCount,
    landmarkCount: faceLandmarkCount,
    startCamera,
    stopCamera
  } = useFaceMesh();

  // Hand tracking for finger planting
  const {
    videoRef: handVideoRef,
    isInitialized: handInitialized,
    isLoading: handLoading,
    error: handError,
    fingerPosition,
    isFingerTouching,
    resultCount: handResultCount,
    landmarkCount: handLandmarkCount,
    startCamera: startHandCamera,
    stopCamera: stopHandCamera,
    handData
  } = useMediaPipe();
  const { customFlowers, addCustomFlower, removeCustomFlower } = useCustomFlowers();
  const { settings, updateSettings } = useApiSettings();
  const { hasSupabaseAuthConfig, isLoading: authLoading, user, sendOtp, verifyOtp, signOut } = useSupabaseAuth();
  const allFlowers = useMemo<(Flower | CustomFlowerType)[]>(() => [...customFlowers, ...flowers], [customFlowers]);
  const authUserLabel = user?.email || '邮箱登录';

  useEffect(() => {
    setPendingSettings(settings);
  }, [settings]);

  useEffect(() => {
    try {
      const value = window.localStorage.getItem(GARDEN_STATE_STORAGE_KEY);
      if (!value) return;

      const parsed = JSON.parse(value) as Partial<SavedGardenState>;
      setSelectedFlowers(Array.isArray(parsed.selectedFlowers) ? parsed.selectedFlowers : []);
      setActiveFlower(typeof parsed.activeFlower === 'string' ? parsed.activeFlower : null);
      const normalizedPlants = Array.isArray(parsed.plantedFlowers)
        ? parsed.plantedFlowers.map((plant) => {
            const candidate = plant as Partial<PlantedFlower>;
            return {
              ...candidate,
              xRatio: typeof candidate.xRatio === 'number'
                ? candidate.xRatio
                : typeof candidate.x === 'number'
                  ? candidate.x / Math.max(window.innerWidth, 1)
                  : 0.5,
              yRatio: typeof candidate.yRatio === 'number'
                ? candidate.yRatio
                : typeof candidate.y === 'number'
                  ? candidate.y / Math.max(window.innerHeight, 1)
                  : 0.5,
            } as PlantedFlower;
          })
        : [];
      setPlantedFlowers(normalizedPlants);
    } catch (loadError) {
      console.error('Failed to load garden state:', loadError);
    }
  }, []);

  useEffect(() => {
    if (!gardenRef.current) return;

    const updateGardenSize = () => {
      if (!gardenRef.current) return;
      setGardenSize({
        width: gardenRef.current.clientWidth,
        height: gardenRef.current.clientHeight,
      });
    };

    updateGardenSize();

    const observer = new ResizeObserver(() => {
      updateGardenSize();
    });

    observer.observe(gardenRef.current);
    window.addEventListener('resize', updateGardenSize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateGardenSize);
    };
  }, [currentView]);

  useEffect(() => {
    try {
      const payload: SavedGardenState = {
        selectedFlowers,
        activeFlower,
        plantedFlowers,
      };
      window.localStorage.setItem(GARDEN_STATE_STORAGE_KEY, JSON.stringify(payload));
    } catch (saveError) {
      console.error('Failed to persist garden state:', saveError);
    }
  }, [activeFlower, plantedFlowers, selectedFlowers]);

  // Start camera when entering garden
  useEffect(() => {
    if (currentView === 'garden' && !cameraStarted) {
      let cancelled = false;

      const startWithRetry = async (
        label: 'face' | 'hand',
        startFn: (video: HTMLVideoElement) => Promise<void>,
        targetVideo: HTMLVideoElement,
      ) => {
        let lastError: unknown = null;

        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            setStartupStage(label);
            await startFn(targetVideo);
            return;
          } catch (err) {
            lastError = err;
            console.error(`${label} startup attempt ${attempt + 1} failed:`, err);
            await sleep(350);
          }
        }

        throw lastError;
      };

      const initCameras = async () => {
        if (!videoRef.current || !handVideoRef.current) return;

        try {
          setCameraError(null);
          setStartupStage('camera');

          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'user',
              width: { ideal: 640 },
              height: { ideal: 480 }
            },
            audio: false
          });

          if (cancelled) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }

          streamRef.current = stream;
          videoRef.current.srcObject = stream;
          handVideoRef.current.srcObject = stream;

          await Promise.all([
            videoRef.current.play(),
            handVideoRef.current.play()
          ]);

          await sleep(200);
          await startWithRetry('face', startCamera, videoRef.current);
          await sleep(250);
          await startWithRetry('hand', startHandCamera, handVideoRef.current);

          if (!cancelled) {
            setCameraStarted(true);
            setStartupStage('ready');
          }
        } catch (err) {
          console.error('Camera bootstrap error:', err);
          if (!cancelled) {
            setCameraError('无法访问摄像头，请检查浏览器权限设置');
            setStartupStage('idle');
          }
        }
      };

      void initCameras();

      return () => {
        cancelled = true;
      };
    }
  }, [currentView, cameraStarted, handVideoRef, startCamera, startHandCamera, videoRef]);

  useEffect(() => {
    if (currentView !== 'garden') {
      stopCamera();
      stopHandCamera();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (handVideoRef.current) {
        handVideoRef.current.srcObject = null;
      }
      setCameraStarted(false);
      setStartupStage('idle');
    }
  }, [currentView, handVideoRef, stopCamera, stopHandCamera, videoRef]);

  // Handle finger pinching to plant
  useEffect(() => {
    if (currentView === 'garden' && fingerPosition && isFingerTouching && activeFlower && canPlant) {
      const garden = gardenRef.current;
      if (!garden) return;

      const rect = garden.getBoundingClientRect();
      // Mirror X coordinate because camera is mirrored
      const x = (1 - fingerPosition.x) * rect.width;
      const y = fingerPosition.y * rect.height;

      // Check if within garden bounds (avoid UI areas)
      if (y > 100 && y < rect.height - 100) {
        plantFlower(x, y);
      }
    }
  }, [fingerPosition, isFingerTouching, activeFlower, canPlant, currentView]);

  // Handle mouth open = wind effect
  useEffect(() => {
    if (currentView === 'garden') {
      setWindActive(isBlowingShape);
      
      // Apply wind to all flowers
      if (isBlowingShape) {
        const windStrength = Math.max((mouthOpenness + mouthRoundness) / 2, 0.22);
        flowerRefs.current.forEach((ref) => {
          if (ref && 'applyWind' in ref) {
            ref.applyWind(windStrength);
          }
        });
      }
    }
  }, [currentView, isBlowingShape, mouthOpenness, mouthRoundness]);

  // Plant cooldown effect
  useEffect(() => {
    if (!canPlant) {
      const timer = setTimeout(() => {
        setCanPlant(true);
      }, PLANT_COOLDOWN);
      return () => clearTimeout(timer);
    }
  }, [canPlant]);

  // Flower base scales
  const flowerBaseScales: Record<string, number> = {
    baihuashanbitao: 1.0,
    zidingxiang: 1.2,
    baidingxiang: 1.2,
    huadingxiang: 1.0,
    landingxiang: 0.7,
    zhugecai: 0.8,
    fudicai: 0.5,
    ziyeli: 0.9,
    yuyemei: 1.1,
    chouli: 1.3
  };

  const getFlowerById = useCallback((flowerId: string) => {
    return allFlowers.find((flower) => flower.id === flowerId);
  }, [allFlowers]);

  const plantFlower = useCallback((x: number, y: number) => {
    if (!activeFlower) return;
    
    const now = Date.now();
    if (now - lastPlantTime.current < PLANT_COOLDOWN) return;
    lastPlantTime.current = now;
    setCanPlant(false);
    
    const flower = getFlowerById(activeFlower);
    if (!flower) return;
    
    const baseScale = flowerBaseScales[activeFlower] || 1.0;
    const randomVariation = 0.7 + Math.random() * 0.6;
    const finalScale = baseScale * randomVariation;
    
    const newPlant: PlantedFlower = {
      id: `${now}-${Math.random()}`,
      flowerId: activeFlower,
      x,
      y,
      xRatio: x / Math.max(gardenRef.current?.clientWidth || 1, 1),
      yRatio: y / Math.max(gardenRef.current?.clientHeight || 1, 1),
      scale: finalScale,
      rotation: -15 + Math.random() * 30,
      growthType: flower.growthType,
      density: flower.density,
      branchType: flower.branchType,
      timestamp: now
    };
    
    setPlantedFlowers(prev => [...prev, newPlant]);
  }, [activeFlower, getFlowerById]);

  const handleGardenClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeFlower) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    plantFlower(x, y);
  };

  const clearGarden = () => {
    setPlantedFlowers([]);
    flowerRefs.current.clear();
  };

  const getPlantPosition = useCallback((planted: PlantedFlower) => {
    const width = gardenSize.width || gardenRef.current?.clientWidth || window.innerWidth;
    const height = gardenSize.height || gardenRef.current?.clientHeight || window.innerHeight;

    if (typeof planted.xRatio === 'number' && typeof planted.yRatio === 'number') {
      return {
        x: planted.xRatio * width,
        y: planted.yRatio * height,
      };
    }

    return {
      x: planted.x ?? width * 0.5,
      y: planted.y ?? height * 0.5,
    };
  }, [gardenSize.height, gardenSize.width]);

  const getRenderedPlantBounds = useCallback(() => {
    if (!gardenSectionRef.current) return [];

    const containerRect = gardenSectionRef.current.getBoundingClientRect();
    const plantNodes = Array.from(gardenSectionRef.current.querySelectorAll<SVGSVGElement>('svg[data-capture-plant="true"]'));

    return plantNodes
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          left: rect.left - containerRect.left,
          right: rect.right - containerRect.left,
          top: rect.top - containerRect.top,
          bottom: rect.bottom - containerRect.top,
        };
      })
      .filter((bounds) => bounds.right > bounds.left && bounds.bottom > bounds.top);
  }, []);

  const loadImage = useCallback((src: string) => {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      image.src = src;
    });
  }, []);

  const svgMarkupToImage = useCallback(async (markup: string) => {
    let svgMarkup = markup;
    if (!svgMarkup.includes('xmlns=')) {
      svgMarkup = svgMarkup.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    try {
      return await loadImage(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  }, [loadImage]);

  const renderPlantImage = useCallback(async (planted: PlantedFlower) => {
    const flower = getFlowerById(planted.flowerId);
    if (!flower) return null;

    if ('source' in flower && flower.source === 'custom') {
      return svgMarkupToImage(flower.svgMarkup);
    }

    if (planted.growthType === 'tree') {
      const markup = renderToStaticMarkup(
        <TreeFlower
          flowerId={planted.flowerId}
          x={40 * planted.scale}
          y={100 * planted.scale}
          scale={planted.scale}
          density={planted.density}
          branchType={planted.branchType}
        />,
      );
      return svgMarkupToImage(markup);
    }

    const markup = renderToStaticMarkup(
      <GroundFlower
        flowerId={planted.flowerId}
        x={20 * planted.scale}
        y={55 * planted.scale}
        scale={planted.scale}
      />,
    );
    return svgMarkupToImage(markup);
  }, [getFlowerById, svgMarkupToImage]);

  const drawRenderedPlantsToCanvas = useCallback(async (
    ctx: CanvasRenderingContext2D,
    sourceX: number,
    sourceY: number,
    sourceWidth: number,
    sourceHeight: number,
    photoX: number,
    photoY: number,
    photoWidth: number,
    photoHeight: number,
  ) => {
    const sceneScale = Math.min(
      photoWidth / Math.max(sourceWidth, 1),
      photoHeight / Math.max(sourceHeight, 1),
    );

    for (const planted of plantedFlowers) {
      const image = await renderPlantImage(planted);
      if (!image) continue;

      const flower = getFlowerById(planted.flowerId);
      const position = getPlantPosition(planted);

      let baseWidth = 80 * planted.scale;
      let baseHeight = 100 * planted.scale;
      let anchorXRatio = 0.5;
      let anchorYRatio = 1;

      if (flower && 'source' in flower && flower.source === 'custom') {
        baseWidth = 100 * planted.scale;
        baseHeight = 120 * planted.scale;
        anchorXRatio = 0.5;
        anchorYRatio = 110 / 120;
      } else if (planted.growthType === 'ground') {
        baseWidth = 40 * planted.scale;
        baseHeight = 55 * planted.scale;
        anchorXRatio = 0.5;
        anchorYRatio = 1;
      }

      const targetBoxWidth = baseWidth * sceneScale;
      const targetBoxHeight = baseHeight * sceneScale;
      const fitScale = Math.min(
        targetBoxWidth / Math.max(image.width, 1),
        targetBoxHeight / Math.max(image.height, 1),
      );

      const destWidth = image.width * fitScale;
      const destHeight = image.height * fitScale;
      const destX = photoX + (position.x - sourceX) * sceneScale - destWidth * anchorXRatio;
      const destY = photoY + (position.y - sourceY) * sceneScale - destHeight * anchorYRatio;

      if (destX + destWidth < photoX || destX > photoX + photoWidth || destY + destHeight < photoY || destY > photoY + photoHeight) {
        continue;
      }

      ctx.drawImage(image, destX, destY, destWidth, destHeight);
    }
  }, [getFlowerById, getPlantPosition, plantedFlowers, renderPlantImage]);

  const readFileAsDataUrl = useCallback((file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('读取图片失败'));
      reader.readAsDataURL(file);
    });
  }, []);

  const optimizeImageDataUrl = useCallback((dataUrl: string) => {
    return new Promise<string>((resolve) => {
      const image = new Image();
      image.onload = () => {
        const maxWidth = 768;
        const scale = Math.min(1, maxWidth / image.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.onerror = () => resolve(dataUrl);
      image.src = dataUrl;
    });
  }, []);

  const generateCustomFlower = useCallback(async (file: File) => {
    if (!settings.moonshotApiKey || !settings.geminiApiKey) {
      setGenerationError('请先在右上角设置中填写 Moonshot 和 Gemini API Key。');
      setShowSettings(true);
      return;
    }

    setGenerationError(null);
    setIsGeneratingFlower(true);
    setGenerationStage('uploading');

    try {
      const imageDataUrl = await readFileAsDataUrl(file);
      const response = await fetch(buildApiUrl('/custom-flowers/jobs'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageDataUrl,
          moonshotApiKey: settings.moonshotApiKey,
          geminiApiKey: settings.geminiApiKey,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || '生成自定义花朵失败');
      }

      const jobId = payload.jobId as string;
      let flower: GeneratedFlowerPayload['flower'] | null = null;

      while (!flower) {
        await sleep(1200);
        const jobResponse = await fetch(buildApiUrl(`/custom-flowers/jobs/${jobId}`));
        const jobPayload = await jobResponse.json();

        if (!jobResponse.ok) {
          throw new Error(jobPayload.error || '读取生成任务状态失败');
        }

        setGenerationStage(jobPayload.stage || 'running');

        if (jobPayload.status === 'failed') {
          throw new Error(jobPayload.error || '生成自定义花朵失败');
        }

        if (jobPayload.status === 'completed' && jobPayload.flower) {
          flower = jobPayload.flower;
        }
      }

      const optimizedImage = await optimizeImageDataUrl(flower.generatedImage || flower.image);
      const optimizedFlower: CustomFlowerType = {
        ...flower,
        image: optimizedImage,
        generatedImage: optimizedImage,
      };

      addCustomFlower(optimizedFlower);
      setSelectedFlowers((prev) => [optimizedFlower.id, ...prev.filter((id) => id !== optimizedFlower.id)]);
      setActiveFlower(optimizedFlower.id);
      setShowDetail(optimizedFlower);
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : '生成自定义花朵失败');
    } finally {
      setIsGeneratingFlower(false);
      setGenerationStage('idle');
    }
  }, [addCustomFlower, optimizeImageDataUrl, readFileAsDataUrl, settings, sleep]);

  const handleFileInput = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await generateCustomFlower(file);
    event.target.value = '';
  }, [generateCustomFlower]);

  const toggleFlowerSelection = (flowerId: string) => {
    setSelectedFlowers(prev => {
      if (prev.includes(flowerId)) {
        const newSelection = prev.filter(id => id !== flowerId);
        if (activeFlower === flowerId) {
          setActiveFlower(newSelection.length > 0 ? newSelection[0] : null);
        }
        return newSelection;
      } else {
        if (prev.length === 0) {
          setActiveFlower(flowerId);
        }
        return [...prev, flowerId];
      }
    });
  };

  const goToGarden = () => {
    if (selectedFlowers.length === 0) {
      alert('请先选择至少一种花卉！');
      return;
    }
    setCurrentView('garden');
  };

  const deleteCustomFlower = useCallback((flowerId: string) => {
    removeCustomFlower(flowerId);
    setSelectedFlowers((prev) => prev.filter((id) => id !== flowerId));
    setPlantedFlowers((prev) => prev.filter((flower) => flower.flowerId !== flowerId));
    if (activeFlower === flowerId) {
      const nextFlower = allFlowers.find((flower) => flower.id !== flowerId && selectedFlowers.includes(flower.id));
      setActiveFlower(nextFlower?.id || null);
    }
    if (showDetail?.id === flowerId) {
      setShowDetail(null);
    }
  }, [activeFlower, allFlowers, removeCustomFlower, selectedFlowers, showDetail]);

  const saveSettings = useCallback(() => {
    updateSettings(pendingSettings);
    setShowSettings(false);
  }, [pendingSettings, updateSettings]);

  const downloadPolaroid = useCallback(() => {
    if (!polaroidPreview) return;

    const link = document.createElement('a');
    link.href = polaroidPreview;
    link.download = `beijing-spring-garden-${Date.now()}.png`;
    link.click();
  }, [polaroidPreview]);

  const captureGardenPolaroid = useCallback(async () => {
    if (!gardenSectionRef.current || !videoRef.current) return;

    setIsCapturingGarden(true);

    try {
      const video = videoRef.current;
      const frameCanvas = document.createElement('canvas');
      frameCanvas.width = video.videoWidth || 720;
      frameCanvas.height = video.videoHeight || 1280;

      const frameCtx = frameCanvas.getContext('2d');
      if (!frameCtx) {
        throw new Error('无法读取摄像头画面');
      }

      frameCtx.drawImage(video, 0, 0, frameCanvas.width, frameCanvas.height);
      const frameDataUrl = frameCanvas.toDataURL('image/png');
      const backgroundImage = await loadImage(polaroidBgUrl);

      const renderedPlantBounds = getRenderedPlantBounds();

      const snapshotCanvas = await html2canvas(gardenSectionRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
        onclone: (clonedDocument) => {
          const clonedSection = clonedDocument.querySelector('.garden-section');
          if (!clonedSection) return;

          clonedSection.querySelectorAll('.controls, .selected-bar, .global-settings-button, .camera-loading, .camera-error, .garden-header, .wind-indicator').forEach((node) => {
            (node as HTMLElement).style.display = 'none';
          });

          clonedSection.classList.add('capture-mode');

          clonedSection.querySelectorAll('canvas').forEach((node) => {
            (node as HTMLElement).style.display = 'none';
          });

          const cameraBackground = clonedSection.querySelector('.camera-background');
          if (cameraBackground) {
            (cameraBackground as HTMLElement).style.display = 'none';
          }

          const monetBackdrop = clonedDocument.createElement('div');
          monetBackdrop.className = 'capture-monet-backdrop';
          monetBackdrop.style.backgroundImage = `linear-gradient(rgba(246, 240, 230, 0.08), rgba(246, 240, 230, 0.08)), url("${polaroidBgUrl}")`;
          clonedSection.prepend(monetBackdrop);

          const videoElement = clonedSection.querySelector('.camera-video-bg');
          if (videoElement) {
            const frameImage = clonedDocument.createElement('img');
            frameImage.src = frameDataUrl;
            frameImage.className = 'camera-video-bg capture-frame';
            videoElement.replaceWith(frameImage);
          }

          const hiddenVideo = clonedSection.querySelector('video:not(.camera-video-bg)');
          if (hiddenVideo) {
            (hiddenVideo as HTMLElement).style.display = 'none';
          }
        },
      });

      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = 1200;
      finalCanvas.height = 1600;
      const ctx = finalCanvas.getContext('2d');

      if (!ctx) {
        throw new Error('无法创建最终截图');
      }

      ctx.fillStyle = '#f6f0e6';
      ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

      const photoX = 82;
      const photoY = 82;
      const photoWidth = finalCanvas.width - photoX * 2;
      const photoHeight = 1210;

      ctx.fillStyle = 'rgba(47, 38, 28, 0.12)';
      ctx.fillRect(photoX + 22, photoY + 28, photoWidth, photoHeight);
      ctx.drawImage(backgroundImage, photoX, photoY, photoWidth, photoHeight);

      const targetAspect = photoWidth / photoHeight;
      const sourceAspect = snapshotCanvas.width / snapshotCanvas.height;
      const captureScaleX = snapshotCanvas.width / Math.max(gardenSectionRef.current.clientWidth, 1);
      const captureScaleY = snapshotCanvas.height / Math.max(gardenSectionRef.current.clientHeight, 1);

      let sourceWidth = snapshotCanvas.width;
      let sourceHeight = snapshotCanvas.height;
      let sourceX = 0;
      let sourceY = 0;

      if (sourceAspect > targetAspect) {
        sourceWidth = snapshotCanvas.height * targetAspect;
        sourceX = (snapshotCanvas.width - sourceWidth) / 2;
      } else {
        sourceHeight = snapshotCanvas.width / targetAspect;
        sourceY = (snapshotCanvas.height - sourceHeight) / 2;
      }

      if (renderedPlantBounds.length > 0) {
        const paddingX = 120 * captureScaleX;
        const paddingY = 140 * captureScaleY;
        const minX = Math.min(...renderedPlantBounds.map((bounds) => bounds.left * captureScaleX)) - paddingX;
        const maxX = Math.max(...renderedPlantBounds.map((bounds) => bounds.right * captureScaleX)) + paddingX;
        const minY = Math.min(...renderedPlantBounds.map((bounds) => bounds.top * captureScaleY)) - paddingY;
        const maxY = Math.max(...renderedPlantBounds.map((bounds) => bounds.bottom * captureScaleY)) + paddingY;

        const boundsWidth = Math.max(maxX - minX, 1);
        const boundsHeight = Math.max(maxY - minY, 1);
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        let cropWidth = Math.max(boundsWidth, boundsHeight * targetAspect);
        let cropHeight = cropWidth / targetAspect;

        if (cropHeight < boundsHeight) {
          cropHeight = boundsHeight;
          cropWidth = cropHeight * targetAspect;
        }

        cropWidth = Math.min(cropWidth, snapshotCanvas.width);
        cropHeight = Math.min(cropHeight, snapshotCanvas.height);

        sourceWidth = cropWidth;
        sourceHeight = cropHeight;
        sourceX = Math.min(Math.max(centerX - sourceWidth / 2, 0), Math.max(snapshotCanvas.width - sourceWidth, 0));
        sourceY = Math.min(Math.max(centerY - sourceHeight / 2, 0), Math.max(snapshotCanvas.height - sourceHeight, 0));
      }

      ctx.drawImage(
        snapshotCanvas,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        photoX,
        photoY,
        photoWidth,
        photoHeight,
      );

      await drawRenderedPlantsToCanvas(
        ctx,
        sourceX / captureScaleX,
        sourceY / captureScaleY,
        sourceWidth / captureScaleX,
        sourceHeight / captureScaleY,
        photoX,
        photoY,
        photoWidth,
        photoHeight,
      );

      ctx.strokeStyle = 'rgba(116, 100, 80, 0.18)';
      ctx.lineWidth = 2;
      ctx.strokeRect(photoX, photoY, photoWidth, photoHeight);

      ctx.fillStyle = '#756654';
      ctx.font = '500 34px "Noto Serif SC", serif';
      ctx.textAlign = 'right';
      ctx.fillText('北京春日花园@小史多喝水', finalCanvas.width - 94, finalCanvas.height - 92);

      setPolaroidPreview(finalCanvas.toDataURL('image/png'));
    } catch (captureError) {
      console.error('Failed to capture garden screenshot:', captureError);
      window.alert('截图失败，请重试一次。');
    } finally {
      setIsCapturingGarden(false);
    }
  }, [drawRenderedPlantsToCanvas, getRenderedPlantBounds, loadImage, polaroidBgUrl, videoRef]);

  const generationStageLabel = useMemo(() => {
    switch (generationStage) {
      case 'uploading':
        return '正在读取图片...';
      case 'identify':
        return '正在识别花朵种类...';
      case 'monet-image':
        return '正在生成 Monet 风格图片...';
      case 'svg':
        return '正在生成可种植 SVG，这一步会更久一些...';
      case 'packaging':
        return '正在整理花朵卡片...';
      case 'completed':
        return '花朵生成完成';
      default:
        return '';
    }
  }, [generationStage]);

  const scrollToSelector = () => {
    setCurrentView('selector');
  };

  const openMyGarden = () => {
    setCurrentView('garden');
  };

  const toggleMusic = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      try {
        await audio.play();
        setIsMusicPlaying(true);
      } catch (playError) {
        console.error('Failed to play background music:', playError);
      }
      return;
    }

    audio.pause();
    setIsMusicPlaying(false);
  }, []);

  const openAuthModal = () => {
    setAuthError(null);
    setAuthMessage(null);
    setAuthCode('');
    setAuthStep(user ? 'code' : 'email');
    setShowAuthModal(true);
  };

  const handleSendOtp = async () => {
    const normalizedEmail = authEmail.trim();
    if (!normalizedEmail) {
      setAuthError('请先输入邮箱地址');
      return;
    }

    setAuthBusy(true);
    setAuthError(null);
    setAuthMessage(null);

    try {
      await sendOtp(normalizedEmail);
      setAuthStep('code');
      setAuthMessage('验证码已经发送到你的邮箱，请查收后输入。');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : '发送验证码失败');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    const normalizedEmail = authEmail.trim();
    const normalizedCode = authCode.trim();

    if (!normalizedEmail || !normalizedCode) {
      setAuthError('请填写邮箱和验证码');
      return;
    }

    setAuthBusy(true);
    setAuthError(null);
    setAuthMessage(null);

    try {
      await verifyOtp(normalizedEmail, normalizedCode);
      setAuthMessage('登录成功，花园之后就可以接账号同步。');
      setShowAuthModal(false);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : '验证码校验失败');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    setAuthBusy(true);
    setAuthError(null);
    setAuthMessage(null);

    try {
      await signOut();
      setShowAuthModal(false);
      setAuthStep('email');
      setAuthCode('');
      setAuthMessage('已退出登录');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : '退出登录失败');
    } finally {
      setAuthBusy(false);
    }
  };

  return (
    <div
      className="app"
      style={
        {
          '--polaroid-bg-url': `url("${polaroidBgUrl}")`,
        } as React.CSSProperties
      }
    >
      {/* Grain Overlay */}
      <div className="grain-overlay" />
      <audio
        ref={audioRef}
        src={bgmUrl}
        loop
        preload="auto"
        onPlay={() => setIsMusicPlaying(true)}
        onPause={() => setIsMusicPlaying(false)}
      />
      <div className={`global-control-stack ${currentView === 'garden' ? 'garden-offset' : ''}`}>
        <button
          type="button"
          className="control-button global-control-button"
          onClick={openAuthModal}
        >
          {authLoading ? '登录中...' : authUserLabel}
        </button>
        <button
          type="button"
          className="control-button global-control-button"
          onClick={() => setShowSettings(true)}
        >
          API 设置
        </button>
      </div>
      <button
        type="button"
        className={`music-toggle ${isMusicPlaying ? 'playing' : ''}`}
        onClick={() => void toggleMusic()}
        aria-label={isMusicPlaying ? '关闭背景音乐' : '播放背景音乐'}
        title={isMusicPlaying ? '关闭背景音乐' : '播放背景音乐'}
      >
        <span className="music-toggle-icon">♪</span>
      </button>

      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileInput}
      />
      <input
        ref={captureInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileInput}
      />

      {/* Hero Section - Magazine Style */}
      {currentView === 'hero' && (
      <section className="hero-section">
        <div className="hero-sidebar">
          <div className="vertical-title">BLOOM</div>
          <div className="sidebar-info">Beijing Spring Garden</div>
        </div>

        <div className="hero-main">
          <div className="hero-background">
            <img src={heroImageUrl} alt="Spring Garden" />
            <div className="hero-overlay" />
          </div>

          <div className="hero-top-info">
            <div className="season-tag">Spring Collection</div>
            <div className="year-tag">MMXXV</div>
          </div>

          <div className="hero-quote">
            <p className="quote-text">
              "I must have flowers, always, and always."
            </p>
            <p className="quote-author">— Claude Monet</p>
          </div>

          <div className="hero-bottom">
            <div className="hero-title-area">
              <h1 className="main-title">北京春日花园</h1>
              <p className="subtitle">认识北京春天的花 · 用手指种下你的花园</p>
            </div>

            <div className="hero-action">
              <div className="hero-actions">
                <button className="cta-button" onClick={scrollToSelector}>
                  <span>开始探索</span>
                  <span className="cta-arrow">→</span>
                </button>
                <button
                  className="cta-button cta-button-secondary"
                  onClick={openMyGarden}
                >
                  <span>我的花园</span>
                  <span className="cta-arrow">→</span>
                </button>
              </div>

              <div className="hero-decor">
                <div className="barcode" />
                <div className="decor-text">Interactive Garden Experience</div>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Flower Selector Section */}
      {currentView === 'selector' && (
      <section className="selector-section">
        <h2 className="selector-title">选择你的花卉</h2>
        <div className="flower-accordion">
          {allFlowers.map((flower) => (
            <div
              key={flower.id}
              className={`flower-slice ${selectedFlowers.includes(flower.id) ? 'active' : ''}`}
              onClick={() => toggleFlowerSelection(flower.id)}
              onDoubleClick={() => setShowDetail(flower)}
            >
              {('source' in flower && flower.source === 'custom') && (
                <button
                  type="button"
                  style={{
                    position: 'absolute',
                    top: '0.6rem',
                    right: '0.6rem',
                    width: '2rem',
                    height: '2rem',
                    borderRadius: '999px',
                    border: '1px solid rgba(255,255,255,0.35)',
                    background: 'rgba(20, 20, 20, 0.55)',
                    color: '#FAF8F5',
                    cursor: 'pointer',
                    zIndex: 3,
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteCustomFlower(flower.id);
                  }}
                  title="删除这朵花"
                >
                  ×
                </button>
              )}
              <img
                src={flower.image}
                alt={flower.name}
                className="flower-slice-image"
              />
              <div className="flower-slice-overlay">
                <span className="flower-slice-name">{flower.name}</span>
              </div>
            </div>
          ))}
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <button className="hero-button" onClick={() => uploadInputRef.current?.click()} disabled={isGeneratingFlower}>
              {isGeneratingFlower ? '生成中...' : '上传识花'}
            </button>
            <button className="hero-button" onClick={() => captureInputRef.current?.click()} disabled={isGeneratingFlower}>
              拍照识花
            </button>
          </div>
          {isGeneratingFlower && generationStageLabel && (
            <p style={{ marginBottom: '1rem', color: '#6B6560', letterSpacing: '0.06em' }}>
              {generationStageLabel}
            </p>
          )}
          {generationError && (
            <p style={{ marginBottom: '1rem', color: '#8B3A3A' }}>{generationError}</p>
          )}
          <p style={{ marginBottom: '1rem', opacity: 0.7 }}>
            已选择 {selectedFlowers.length} 种花卉 · 已新增 {customFlowers.length} 种自定义花
            {selectedFlowers.length > 0 && '（双击图片查看详情）'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              className="hero-button"
              onClick={() => setCurrentView('hero')}
            >
              返回上一页
            </button>
            <button 
              className="hero-button"
              onClick={goToGarden}
              style={{ opacity: selectedFlowers.length > 0 ? 1 : 0.5 }}
            >
              进入花园
            </button>
          </div>
        </div>
      </section>
      )}

      {/* Garden Canvas Section */}
      {currentView === 'garden' && (
        <section ref={gardenSectionRef} className="garden-section">
          {/* Camera Background */}
          <div className="camera-background">
            {isLoading && (
              <div className="camera-loading">
                启动摄像头中...
              </div>
            )}
            {error && (
              <div className="camera-error">
                {error}
              </div>
            )}
            {cameraError && (
              <div className="camera-error" style={{ top: '11.5rem' }}>
                {cameraError}
              </div>
            )}
            {handLoading && (
              <div className="camera-loading" style={{ top: '4.5rem' }}>
                启动手势识别中...
              </div>
            )}
            {handError && (
              <div className="camera-error" style={{ top: '8rem' }}>
                {handError}
              </div>
            )}
            <video
              ref={videoRef}
              className="camera-video-bg"
              playsInline
              muted
              autoPlay
            />
            <video
              ref={handVideoRef}
              playsInline
              muted
              autoPlay
              style={{ display: 'none' }}
            />
            {/* Dark overlay */}
            <div className="camera-dark-overlay" />
          </div>

          {/* Wind indicator */}
          {windActive && (
            <div className="wind-indicator">
              <span className="wind-icon">💨</span>
              <span className="wind-text">风吹来了...</span>
            </div>
          )}

          {/* Garden Header */}
          <div className="garden-header">
            <h2 className="garden-title">种植你的花园</h2>
            <p className="garden-subtitle">
              {activeFlower 
                ? `${getFlowerById(activeFlower)?.name} · ${canPlant ? '点击或捏合种植' : '稍等...'}`
                : '请从下方选择一种花卉'
              }
            </p>
            <p className="garden-hint">
              嘴巴收成 O 型吹风 · 手指捏合种花
            </p>
            {showDebug && (
              <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', opacity: 0.82, lineHeight: 1.45 }}>
                <div>{`Startup: ${startupStage}`}</div>
                <div>{`Face: ${faceInitialized ? 'on' : 'off'} | loading: ${isLoading ? 'yes' : 'no'} | mouth: ${mouthOpenness.toFixed(2)} | round: ${mouthRoundness.toFixed(2)} | open: ${isMouthOpen ? 'yes' : 'no'} | blowShape: ${isBlowingShape ? 'yes' : 'no'}`}</div>
                <div>{`Hands: ${handInitialized ? 'on' : 'off'} | loading: ${handLoading ? 'yes' : 'no'} | handData: ${handData ? 'yes' : 'no'} | pinch: ${isFingerTouching ? 'yes' : 'no'}`}</div>
                <div>{`Face results: ${faceResultCount} | landmarks: ${faceLandmarkCount} | video: t=${videoRef.current?.currentTime?.toFixed(1) ?? '0.0'} rs=${videoRef.current?.readyState ?? 0} size=${videoRef.current?.videoWidth ?? 0}x${videoRef.current?.videoHeight ?? 0}`}</div>
                <div>{`Hand results: ${handResultCount} | landmarks: ${handLandmarkCount} | video: t=${handVideoRef.current?.currentTime?.toFixed(1) ?? '0.0'} rs=${handVideoRef.current?.readyState ?? 0} size=${handVideoRef.current?.videoWidth ?? 0}x${handVideoRef.current?.videoHeight ?? 0}`}</div>
              </div>
            )}
          </div>

          <div className="controls">
            <button className="control-button" onClick={() => void captureGardenPolaroid()} disabled={isCapturingGarden}>
              {isCapturingGarden ? '生成截图中' : '拍立得截图'}
            </button>
            <button className="control-button" onClick={clearGarden}>
              清空花园
            </button>
            <button className="control-button" onClick={() => setCurrentView('selector')}>
              返回选择
            </button>
          </div>

          <div 
            ref={gardenRef}
            className="garden-canvas"
            onClick={handleGardenClick}
            style={{ cursor: canPlant ? 'crosshair' : 'not-allowed' }}
          >
            {/* Planted Flowers */}
            {plantedFlowers.map((planted) => {
              const flower = getFlowerById(planted.flowerId);
              if (!flower) return null;
              const position = getPlantPosition(planted);
              
              if ('source' in flower && flower.source === 'custom') {
                return (
                  <CustomFlower
                    key={planted.id}
                    ref={(el) => {
                      if (el) flowerRefs.current.set(planted.id, el);
                    }}
                    captureId={planted.id}
                    svgMarkup={flower.svgMarkup}
                    x={position.x}
                    y={position.y}
                    scale={planted.scale}
                    onClick={() => setShowDetail(flower)}
                  />
                );
              }

              if (planted.growthType === 'tree') {
                return (
                  <TreeFlower
                    key={planted.id}
                    ref={(el) => {
                      if (el) flowerRefs.current.set(planted.id, el);
                    }}
                    captureId={planted.id}
                    flowerId={planted.flowerId}
                    x={position.x}
                    y={position.y}
                    scale={planted.scale}
                    density={planted.density}
                    branchType={planted.branchType}
                    onClick={() => setShowDetail(flower)}
                  />
                );
              } else {
                return (
                  <GroundFlower
                    key={planted.id}
                    ref={(el) => {
                      if (el) flowerRefs.current.set(planted.id, el);
                    }}
                    captureId={planted.id}
                    flowerId={planted.flowerId}
                    x={position.x}
                    y={position.y}
                    scale={planted.scale}
                    onClick={() => setShowDetail(flower)}
                  />
                );
              }
            })}

            {/* Hand Skeleton Overlay */}
            {handInitialized && handData && (
                <HandSkeleton
                  handData={handData}
                  isTouching={isFingerTouching}
                  gardenWidth={gardenSize.width || gardenRef.current?.clientWidth || window.innerWidth}
                  gardenHeight={gardenSize.height || gardenRef.current?.clientHeight || window.innerHeight}
                />
              )}
          </div>

          {/* Selected Flowers Bar */}
          <div className="selected-bar">
            {selectedFlowers.map((flowerId) => {
              const flower = getFlowerById(flowerId);
              if (!flower) return null;
              return (
                <img
                  key={flowerId}
                  src={flower.image}
                  alt={flower.name}
                  className={`selected-flower-thumb ${activeFlower === flowerId ? 'active' : ''}`}
                  onClick={() => setActiveFlower(flowerId)}
                  title={flower.name}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Flower Detail Modal */}
      {showDetail && (
        <>
          <div className="overlay" onClick={() => setShowDetail(null)} />
          <div className="flower-detail">
            <button className="flower-detail-close" onClick={() => setShowDetail(null)}>
              ×
            </button>
            <img
              src={showDetail.image}
              alt={showDetail.name}
              className="flower-detail-image"
            />
            <div className="flower-detail-content">
              <h3 className="flower-detail-name">{showDetail.name}</h3>
              <p className="flower-detail-english">{showDetail.englishName}</p>
              <p className="flower-detail-description">{showDetail.description}</p>
              <ul className="flower-detail-features">
                {showDetail.features.map((feature, idx) => (
                  <li key={idx}>{feature}</li>
                ))}
              </ul>
              <div className="flower-detail-funfact">
                <strong>趣味知识：</strong>{showDetail.funFact}
              </div>
            </div>
          </div>
        </>
      )}

      {showSettings && (
        <>
          <div className="overlay" onClick={() => setShowSettings(false)} />
          <div className="flower-detail" style={{ maxWidth: '620px', gridTemplateColumns: '1fr' }}>
            <button className="flower-detail-close" onClick={() => setShowSettings(false)}>
              ×
            </button>
            <div className="flower-detail-content">
              <h3 className="flower-detail-name">API 设置</h3>
              <p className="flower-detail-description">
                这里填写你自己的 Moonshot 和 Gemini API Key。它们只保存在当前浏览器本地，并在生成自定义花朵时通过后端代理转发。
              </p>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <label style={{ display: 'grid', gap: '0.4rem' }}>
                  <span>Moonshot API Key</span>
                  <input
                    type="password"
                    value={pendingSettings.moonshotApiKey}
                    onChange={(event) => setPendingSettings((prev) => ({ ...prev, moonshotApiKey: event.target.value }))}
                    style={{ padding: '0.85rem 1rem', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.95rem' }}
                  />
                </label>
                <label style={{ display: 'grid', gap: '0.4rem' }}>
                  <span>Gemini API Key</span>
                  <input
                    type="password"
                    value={pendingSettings.geminiApiKey}
                    onChange={(event) => setPendingSettings((prev) => ({ ...prev, geminiApiKey: event.target.value }))}
                    style={{ padding: '0.85rem 1rem', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.95rem' }}
                  />
                </label>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button className="hero-button" onClick={saveSettings}>保存设置</button>
                <button className="hero-button" onClick={() => setShowSettings(false)} style={{ background: '#B8B2AC', color: '#2D2D2D' }}>
                  取消
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {showAuthModal && (
        <>
          <div className="overlay" onClick={() => setShowAuthModal(false)} />
          <div className="flower-detail" style={{ maxWidth: '620px', gridTemplateColumns: '1fr' }}>
            <button className="flower-detail-close" onClick={() => setShowAuthModal(false)}>
              ×
            </button>
            <div className="flower-detail-content">
              <h3 className="flower-detail-name">邮箱登录</h3>
              <p className="flower-detail-description">
                先接入 Supabase Auth 的邮箱验证码登录。登录完成后，下一步就可以把花园状态接到账号级同步。
              </p>
              {!hasSupabaseAuthConfig && (
                <p style={{ marginBottom: '1rem', color: '#8B3A3A' }}>
                  当前没有可用的 Supabase Auth 配置。
                </p>
              )}
              {user ? (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div className="auth-user-card">
                    <span className="auth-user-label">当前账号</span>
                    <strong>{user.email}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <button className="hero-button" onClick={handleSignOut} disabled={authBusy}>
                      {authBusy ? '处理中...' : '退出登录'}
                    </button>
                    <button
                      className="hero-button"
                      onClick={() => setShowAuthModal(false)}
                      style={{ background: '#B8B2AC', color: '#2D2D2D' }}
                    >
                      关闭
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <label style={{ display: 'grid', gap: '0.4rem' }}>
                      <span>邮箱地址</span>
                      <input
                        type="email"
                        value={authEmail}
                        onChange={(event) => setAuthEmail(event.target.value)}
                        placeholder="you@example.com"
                        style={{ padding: '0.85rem 1rem', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.95rem' }}
                      />
                    </label>
                    {authStep === 'code' && (
                      <label style={{ display: 'grid', gap: '0.4rem' }}>
                        <span>邮箱验证码</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={authCode}
                          onChange={(event) => setAuthCode(event.target.value)}
                          placeholder="输入邮件里的验证码"
                          style={{ padding: '0.85rem 1rem', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.95rem' }}
                        />
                      </label>
                    )}
                  </div>
                  {authMessage && (
                    <p className="auth-feedback auth-feedback-success">{authMessage}</p>
                  )}
                  {authError && (
                    <p className="auth-feedback auth-feedback-error">{authError}</p>
                  )}
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                    {authStep === 'email' ? (
                      <button className="hero-button" onClick={handleSendOtp} disabled={authBusy || !hasSupabaseAuthConfig}>
                        {authBusy ? '发送中...' : '发送验证码'}
                      </button>
                    ) : (
                      <>
                        <button className="hero-button" onClick={handleVerifyOtp} disabled={authBusy || !hasSupabaseAuthConfig}>
                          {authBusy ? '验证中...' : '确认登录'}
                        </button>
                        <button
                          className="hero-button"
                          onClick={handleSendOtp}
                          disabled={authBusy || !hasSupabaseAuthConfig}
                          style={{ background: '#D9D1C6', color: '#2D2D2D' }}
                        >
                          重新发送
                        </button>
                      </>
                    )}
                    <button
                      className="hero-button"
                      onClick={() => setShowAuthModal(false)}
                      style={{ background: '#B8B2AC', color: '#2D2D2D' }}
                    >
                      取消
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {polaroidPreview && (
        <>
          <div className="overlay" onClick={() => setPolaroidPreview(null)} />
          <div className="polaroid-modal">
            <button className="flower-detail-close" onClick={() => setPolaroidPreview(null)}>
              ×
            </button>
            <img
              src={polaroidPreview}
              alt="花园拍立得截图"
              className="polaroid-preview-image"
            />
            <div className="polaroid-actions">
              <button className="hero-button" onClick={downloadPolaroid}>
                下载截图
              </button>
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      <footer className="footer">
        <p className="footer-text">"In every flower, a story of spring."</p>
        <p className="footer-sub">北京春日花园 · Beijing Spring Garden · 2025</p>
      </footer>
    </div>
  );
}

export default App;
