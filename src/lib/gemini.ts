import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export async function geminiVision(base64Image: string, mimeType: string, prompt: string) {
  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [
        { text: prompt },
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType,
          },
        },
      ],
    }],
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });
  return result.response.text();
}
