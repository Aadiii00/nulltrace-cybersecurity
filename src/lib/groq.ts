import Groq from 'groq-sdk';

export const groqModel = 'llama-3.1-8b-instant';
export const groqVisionModel = 'meta-llama/llama-4-scout-17b-16e-instruct';

export function getGroqClient(customKey?: string) {
  return new Groq({
    apiKey: customKey || process.env.GROQ_API_KEY || '',
  });
}

// Default singleton for compatibility
const defaultGroq = getGroqClient();

export async function groqChat(
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
  customKey?: string
) {
  const client = getGroqClient(customKey);
  const completion = await client.chat.completions.create({
    model: groqModel,
    messages,
    max_tokens: 1024,
    temperature: 0.7,
  });
  return completion.choices[0]?.message?.content || '';
}

export async function groqGenerate(prompt: string, customKey?: string) {
  const client = getGroqClient(customKey);
  const completion = await client.chat.completions.create({
    model: groqModel,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2048,
    temperature: 0.3,
  });
  return completion.choices[0]?.message?.content || '';
}

export async function groqVision(
  base64Image: string,
  mimeType: string,
  prompt: string,
  customKey?: string
) {
  const client = getGroqClient(customKey);
  const completion = await client.chat.completions.create({
    model: groqVisionModel,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ],
    max_tokens: 1024,
    temperature: 0.2,
  });
  return completion.choices[0]?.message?.content || '';
}

export default defaultGroq;
