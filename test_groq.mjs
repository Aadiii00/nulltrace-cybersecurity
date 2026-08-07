import fs from 'fs';
import Groq from 'groq-sdk';

const env = fs.readFileSync('.env.local', 'utf-8');
const keyMatch = env.match(/GROQ_API_KEY=(.*)/);
const key = keyMatch ? keyMatch[1].trim() : process.env.GROQ_API_KEY;

console.log("Found Key:", key ? "Yes (Starts with " + key.substring(0, 5) + ")" : "No");

const groq = new Groq({ apiKey: key });

async function test() {
  try {
    console.log("Sending request to Groq API (llama-3.1-8b-instant)...");
    const response = await groq.chat.completions.create({
      messages: [{ role: 'user', content: 'Please quickly verify you are working. Reply with "Yes, I am online."' }],
      model: 'llama-3.1-8b-instant'
    });
    console.log("-------------------");
    console.log("RESPONSE RECEIVED:");
    console.log(response.choices[0].message.content);
    console.log("-------------------");
  } catch (error) {
    console.error("ERROR:", error.message);
  }
}
test();
