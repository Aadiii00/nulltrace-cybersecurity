import { NextResponse } from 'next/server';

const PYTHON_BACKEND = 'http://127.0.0.1:8000/api/network-scan';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.target || typeof body.target !== 'string') {
      return NextResponse.json({ error: 'Target domain or IP is required.' }, { status: 400 });
    }

    const target = body.target.trim();
    if (!target) {
      return NextResponse.json({ error: 'Target cannot be empty.' }, { status: 400 });
    }

    let res: Response;
    try {
      res = await fetch(PYTHON_BACKEND, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
        signal: AbortSignal.timeout(60000),
      });
    } catch (connErr: any) {
      if (connErr.name === 'TimeoutError') {
        return NextResponse.json({ error: 'Scan timed out. Try again.' }, { status: 504 });
      }
      // ECONNREFUSED — Python backend is offline
      return NextResponse.json(
        { error: 'Python backend is offline. Start it with: cd backend && python main.py' },
        { status: 503 }
      );
    }

    // Safely parse the response — it might not be JSON on errors
    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('[network-scan] Non-JSON response from Python backend:', text.slice(0, 200));
      return NextResponse.json(
        { error: `Backend error: ${text.slice(0, 200)}` },
        { status: 502 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.detail || data?.error || 'Network scan failed.' },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[network-scan] Error:', err);
    return NextResponse.json({ error: 'Internal server error.', details: err.message }, { status: 500 });
  }
}
