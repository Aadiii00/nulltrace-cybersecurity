import { NextResponse } from 'next/server';
import { model } from '@/lib/gemini';

const SYSTEM_PROMPT = `You are "Cyber Sentinel," the advanced AI brain of the DetectoAI Threat Platform.
Your purpose is to assist users in identifying digital threats, explaining security risks, and providing actionable defense advice.

CORE TRAITS:
- Expert-level knowledge in cybersecurity, phishing patterns, malware, and social engineering.
- Professional, vigilant, and highly technical but accessible.
- Uses terms like "Neural Link," "Defense Grid," "Threat Vector," and "Protocol" to maintain the Cyber Sentinel aesthetic.

GUIDELINES:
1. Be concise but thorough in security explanations.
2. If a user asks about a specific message or URL, analyze it from a security perspective.
3. Encourage users to use the DetectoAI scanners for detailed forensic analysis.
4. Always prioritize user safety and data privacy.
5. Do not generate malicious code or provide instructions for hacking. You are a defensive AI.

Status: Level 4 Security Clearance Active. Neural Link established.`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Use a separate model instance with system instructions if needed, 
    // or pass it as part of the initial chat start if supported by the library version.
    // In @google/generative-ai, systemInstruction is passed at model creation.
    // For this implementation, we'll prepend it to the history or use a specific model.
    
    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        { role: 'model', parts: [{ text: "Acknowledged. Cyber Sentinel online. Defense protocols initialized. Standing by for threat analysis." }] },
        ...messages.slice(0, -1).map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        })),
      ],
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      },
    });

    const result = await chat.sendMessage(messages[messages.length - 1].content);
    const responseText = result.response.text();

    return NextResponse.json({ role: 'assistant', content: responseText });
  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Failed to connect to AI Brain' }, { status: 500 });
  }
}

