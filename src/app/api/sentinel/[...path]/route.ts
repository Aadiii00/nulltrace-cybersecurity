import { NextRequest, NextResponse } from "next/server";

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:8000";

async function proxyRequest(req: NextRequest, params: Promise<{ path: string[] }>) {
  const { path } = await params;
  const pathStr = path.join("/");
  const url = `${PYTHON_BACKEND_URL}/api/sentinel/${pathStr}`;

  try {
    const options: RequestInit = {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      const bodyText = await req.text();
      if (bodyText) {
        options.body = bodyText;
      }
    }

    const res = await fetch(url, options);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to connect to Sentinel backend service", details: error.message },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, params);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, params);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, params);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, params);
}
