import { NextResponse } from 'next/server';
import { groqChat } from '@/lib/groq';

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

    const groqMessages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...messages.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content,
      })),
    ];

    const responseText = await groqChat(groqMessages);

    return NextResponse.json({ role: 'assistant', content: responseText });
  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Failed to connect to AI Brain' }, { status: 500 });
  }
}

