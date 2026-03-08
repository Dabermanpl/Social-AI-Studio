export interface Message {
  role: 'user' | 'model';
  text: string;
  image?: string;
  referenceImages?: string[];
  timestamp: number;
}

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

export interface GenerationConfig {
  aspectRatio: AspectRatio;
  prompt: string;
}

export interface Layer {
  id: string;
  type: 'image' | 'text';
  content: string; // URL for image, text for text
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  fill?: string;
  visible: boolean;
  locked: boolean;
  rotation?: number;
}

export type Tab = 'chat' | 'editor';
