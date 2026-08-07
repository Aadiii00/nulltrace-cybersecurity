import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { scanEvents } from '@/lib/events';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      type,
      target,
      pageUrl,
      riskLevel,
      trustScore,
      category,
      explanation,
      reasons,
      timestamp
    } = await req.json();

    if (!type || !target) {
      return NextResponse.json({ error: 'Type and target are required' }, { status: 400 });
    }

    // Map type to allowed values ('url' | 'message' | 'file')
    const dbType = (type.toLowerCase() === 'url') ? 'url' : 'message';
    
    // Map category to intent constraints ('scam' | 'marketing' | 'legit' | 'unknown')
    let dbIntent = 'unknown';
    const lowerCategory = (category || '').toLowerCase();
    if (['phishing', 'malware', 'scam'].includes(lowerCategory)) {
      dbIntent = 'scam';
    } else if (lowerCategory === 'marketing') {
      dbIntent = 'marketing';
    } else if (['safe', 'legit'].includes(lowerCategory)) {
      dbIntent = 'legit';
    }

    // Insert scan into Supabase database
    const { data, error } = await supabase.from('scans').insert({
      type: dbType,
      input: target.substring(0, 5000), // safety limit
      trust_score: typeof trustScore === 'number' ? trustScore : 50,
      risk_level: riskLevel || 'low',
      analysis: explanation || '',
      intent: dbIntent,
      emotion: type.toLowerCase(), // Save original type (whatsapp, gmail, generic, selection, url) in emotion
      patterns: reasons || [], // Save reasons in patterns JSONB
      risky_parts: {
        pageUrl: pageUrl || '',
        category: category || 'unknown',
        originalType: type.toLowerCase()
      },
      user_id: user.id,
      created_at: timestamp || new Date().toISOString()
    }).select().single();

    if (error) {
      console.error('Supabase scan-result save error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format output matching client requirements
    const formattedResult = {
      id: data.id,
      type: type.toLowerCase(),
      target: data.input,
      pageUrl: pageUrl || '',
      riskLevel: data.risk_level,
      trustScore: data.trust_score,
      category: category || 'unknown',
      explanation: data.analysis,
      reasons: reasons || [],
      timestamp: data.created_at
    };

    // Broadcast event to active SSE streams for real-time updates
    scanEvents.emit('new-scan', { userId: user.id, scan: formattedResult });

    return NextResponse.json(formattedResult);
  } catch (error: any) {
    console.error('API Error in POST /api/scan-results:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor') || '';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const riskLevel = searchParams.get('riskLevel') || '';
    const type = searchParams.get('type') || '';

    let query = supabase
      .from('scans')
      .select('*')
      .eq('user_id', user.id);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    if (riskLevel && riskLevel.toLowerCase() !== 'all') {
      query = query.eq('risk_level', riskLevel.toLowerCase());
    }

    if (type && type.toLowerCase() !== 'all') {
      query = query.eq('emotion', type.toLowerCase());
    }

    const { data: scans, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Supabase GET scan-results error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format output
    const formattedScans = (scans || []).map(s => {
      const originalType = s.emotion || s.type || 'generic';
      const pageUrl = s.risky_parts?.pageUrl || '';
      const category = s.risky_parts?.category || (s.intent === 'scam' ? 'phishing' : 'safe');
      
      return {
        id: s.id,
        type: originalType.toLowerCase(),
        target: s.input,
        pageUrl: pageUrl,
        riskLevel: s.risk_level,
        trustScore: s.trust_score,
        category: category,
        explanation: s.analysis,
        reasons: Array.isArray(s.patterns) ? s.patterns : [],
        timestamp: s.created_at
      };
    });

    return NextResponse.json(formattedScans);
  } catch (error: any) {
    console.error('API Error in GET /api/scan-results:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
