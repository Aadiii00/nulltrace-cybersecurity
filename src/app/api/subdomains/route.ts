import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    
    const response = await fetch(`${backendUrl}/api/subdomains`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      return NextResponse.json(
        { error: errorMsg || "Failed to scan subdomains" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Subdomains Route Error]:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
