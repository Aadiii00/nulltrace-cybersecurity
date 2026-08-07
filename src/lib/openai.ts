import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn('DetectoAI: OPENAI_API_KEY is missing in environment variables. Audio transcription will fail.');
}

export const openai = new OpenAI({
  apiKey: apiKey || 'dummy-key', // Avoid SDK error if key is missing (will fail on actual call)
});
