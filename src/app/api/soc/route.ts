import { NextResponse } from 'next/server';

const PYTHON_BACKEND = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000/api/soc';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action || 'investigate';
    
    let endpoint = `${PYTHON_BACKEND}/investigate`;
    if (action === 'analyze-log') endpoint = `${PYTHON_BACKEND}/analyze-log`;
    if (action === 'analyze-email') endpoint = `${PYTHON_BACKEND}/analyze-email`;
    if (action === 'ai-assistant') endpoint = `${PYTHON_BACKEND}/ai-assistant`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: errText || 'Backend processing error' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
