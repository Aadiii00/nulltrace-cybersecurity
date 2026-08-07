import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: scans, error } = await supabase
      .from('scans')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { 
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }

    return NextResponse.json(scans || [], {
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { 
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" }
      }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('scans')
      .insert([
        {
          ...body,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: error.message }, { 
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }

    return NextResponse.json(data, {
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  } catch (error) {
    console.error('API POST error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { 
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" }
      }
    );
  }
}
