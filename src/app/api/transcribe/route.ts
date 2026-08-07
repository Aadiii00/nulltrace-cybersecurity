import { NextResponse } from 'next/server';
import { groqGenerate } from '@/lib/groq';
import { createClient } from '@/lib/supabase/server';

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const DEEPGRAM_URL = 'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true';

export async function POST(req: Request) {
  try {
    // ── 1. Validate Deepgram key ────────────────────────────────────────────
    if (!DEEPGRAM_API_KEY) {
      return NextResponse.json({ error: 'Transcription service not configured.' }, { status: 500 });
    }

    // ── 2. Get file from form data ──────────────────────────────────────────
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided.' }, { status: 400 });
    }

    // ── 3. Validate size (25MB max) ─────────────────────────────────────────
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'Audio file too large. Max 25MB.' }, { status: 400 });
    }

    // ── 4. Validate type ────────────────────────────────────────────────────
    const supportedTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave',
      'audio/x-m4a', 'audio/mp4', 'audio/webm', 'audio/ogg', 'audio/flac',
    ];
    if (!supportedTypes.includes(file.type) && !file.name.endsWith('.m4a')) {
      return NextResponse.json({
        error: `Unsupported format (${file.type || 'unknown'}). Use MP3, WAV, or M4A.`
      }, { status: 400 });
    }

    // ── 5. Send binary audio to Deepgram ────────────────────────────────────
    const arrayBuffer = await file.arrayBuffer();

    const dgResponse = await fetch(DEEPGRAM_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': file.type || 'audio/webm',
      },
      body: arrayBuffer,
    });

    if (!dgResponse.ok) {
      const errText = await dgResponse.text();
      console.error(`Deepgram error [${dgResponse.status}]:`, errText);
      if (dgResponse.status === 401) {
        return NextResponse.json({ error: 'Invalid Deepgram API key.' }, { status: 500 });
      }
      return NextResponse.json({ error: `Speech-to-text failed (${dgResponse.status}).` }, { status: 500 });
    }

    const dgData = await dgResponse.json();
    const transcriptText: string =
      dgData?.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() || '';

    if (!transcriptText) {
      return NextResponse.json({ error: 'No speech detected in the audio.' }, { status: 422 });
    }

    // ── 6. Analyse transcript with Groq ─────────────────────────────────────
    const groqPrompt = `
      You are "Cyber Sentinel," the advanced AI Threat Intelligence engine for DetectoAI.
      Analyse the following VOICE TRANSCRIPT for digital threats.
      Focus on: phishing, social engineering, urgency tactics, recruitment scams, OTP fraud,
      financial fraud, impersonation, and psychological manipulation techniques used in audio/voice scams.

      Voice Transcript:
      "${transcriptText}"

      Response Format (STRICT JSON ONLY — no markdown, no extra text):
      {
        "trustScore": number (0-100, where 100 is perfectly safe),
        "riskLevel": "low" | "medium" | "high" | "critical",
        "analysis": "A high-fidelity forensic explanation of the risks found.",
        "intent": "scam" | "marketing" | "legit" | "unknown",
        "emotion": "Dominant emotional vector (e.g. Urgency, Fear, Professional, Neutral).",
        "patterns": ["List specific identified threat patterns"],
        "riskyParts": ["Specific verbatim snippets from the transcript that triggered the alert"]
      }
    `;

    const groqText = await groqGenerate(groqPrompt);
    const jsonMatch = groqText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error('Groq non-JSON response:', groqText);
      throw new Error('Failed to extract JSON from AI response.');
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // ── 7. Save to Supabase ─────────────────────────────────────────────────
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      // Save scan record
      await supabase.from('scans').insert({
        type: 'message',
        input: transcriptText.substring(0, 5000),
        trust_score: analysis.trustScore,
        risk_level: analysis.riskLevel,
        analysis: analysis.analysis,
        intent: analysis.intent,
        emotion: analysis.emotion,
        patterns: analysis.patterns,
        risky_parts: analysis.riskyParts,
        user_id: user?.id || null,
      });

      // Save voice transcript record
      await supabase.from('voice_transcripts').insert({
        transcript: transcriptText,
        user_id: user?.id || null,
      });
    } catch (dbErr) {
      console.error('DB save error (non-fatal):', dbErr);
    }

    // ── 8. Return transcript + analysis together ────────────────────────────
    return NextResponse.json({ text: transcriptText, analysis });

  } catch (error: any) {
    console.error('Transcription/Analysis Error:', error);
    return NextResponse.json({
      error: 'Failed to process audio.',
      details: error.message,
    }, { status: 500 });
  }
}
