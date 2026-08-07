import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const apiKey = process.env.GEMINI_API_KEY;
console.log('Using API Key:', apiKey ? (apiKey.substring(0, 5) + '...') : 'MISSING');

if (!apiKey) {
    console.error('GEMINI_API_KEY is not set in .env.local');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

async function run() {
    try {
        const result = await model.generateContent('Hello, are you working?');
        const response = await result.response;
        console.log('Response:', response.text());
        console.log('SUCCESS: Gemini is responding correctly.');
    } catch (error) {
        console.error('FAILURE: Gemini error:', error.message);
    }
}

run();
