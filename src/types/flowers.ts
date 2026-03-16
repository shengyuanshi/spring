export interface Flower {
  id: string;
  name: string;
  englishName: string;
  image: string;
  description: string;
  features: string[];
  color: string;
  bloomTime: string;
  funFact: string;
  growthType: 'tree' | 'ground';
  density?: 'dense' | 'medium' | 'sparse';
  branchType?: 'straight' | 'curved' | 'twisted';
}

export interface CustomFlower extends Flower {
  source: 'custom';
  originalImage: string;
  generatedImage: string;
  svgMarkup: string;
  createdAt: number;
}

export interface FlowerApiSettings {
  moonshotApiKey: string;
  geminiApiKey: string;
}

export interface GeneratedFlowerPayload {
  flower: CustomFlower;
}
