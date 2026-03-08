import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, AspectRatio } from "../types";

export const generateChatResponse = async (messages: Message[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  
  // Optymalizacja: Przesyłaj tylko ostatnie 10 wiadomości, aby oszczędzać tokeny
  const limitedMessages = messages.slice(-10);

  const chat = ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: limitedMessages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    })),
    config: {
      systemInstruction: "Jesteś ekspertem social media i prompt engineeringu. Pomóż dopracować prompt do grafiki. Jeśli generujesz obraz, napisz 'Generuję obraz'. Odpowiadaj zwięźle po polsku.",
    }
  });

  const response = await chat;
  return response.text;
};

export const generateImage = async (prompt: string, aspectRatio: AspectRatio = '1:1', referenceImages: string[] = []) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  const parts: any[] = [{ text: prompt }];

  for (const image of referenceImages) {
    const base64Data = image.split(',')[1];
    const mimeType = image.split(';')[0].split(':')[1];
    parts.unshift({
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: parts,
    },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio,
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};
