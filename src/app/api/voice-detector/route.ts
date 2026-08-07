import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

const HF_TOKEN = process.env.HF_TOKEN || '';
// Requested model: Shanmugapriya6/voice-fake-detector-v1
const HF_MODEL = 'Shanmugapriya6/voice-fake-detector-v1';
const HF_API_URL = `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ─── Helper: Map HF audio-classification labels → our DetectionResult schema ─
function mapHFResult(hfOutput: Array<{ label: string; score: number }>) {
  let fakeScore = 0;
  let realScore = 0;

  for (const item of hfOutput) {
    const label = item.label.toLowerCase();
    // Match fake/spoof/ai/synthetic/fake_voice
    if (
      label.includes('fake') ||
      label.includes('spoof') ||
      label.includes('synthetic') ||
      label.includes('generated') ||
      label.includes('ai')
    ) {
      fakeScore = Math.max(fakeScore, item.score);
    }
    // Match real/genuine/human/bonafide/authentic
    if (
      label.includes('real') ||
      label.includes('genuine') ||
      label.includes('human') ||
      label.includes('bonafide') ||
      label.includes('authentic') ||
      label.includes('natural')
    ) {
      realScore = Math.max(realScore, item.score);
    }
  }

  // Fallback: if labels didn't match either side, use top label score
  if (fakeScore === 0 && realScore === 0 && hfOutput.length > 0) {
    const top = hfOutput[0];
    const label = top.label.toLowerCase();
    if (label.includes('fake') || label.includes('spoof') || label.includes('ai')) {
      fakeScore = top.score;
    } else {
      realScore = top.score;
    }
  }

  const isSpoof = fakeScore > realScore;
  const spoofProbability = Math.round(fakeScore * 100);
  const confidence = Math.round(Math.max(fakeScore, realScore) * 100);

  let voiceType: string;
  let riskLevel: string;
  let summary: string;

  if (isSpoof) {
    if (spoofProbability >= 85) {
      voiceType = 'AI-Generated';
      riskLevel = 'Critical';
      summary = `The Shanmugapriya6/voice-fake-detector-v1 model detected synthetic voice patterns with ${spoofProbability}% spoof probability. Strong indicators of AI-generated or text-to-speech audio were found — this voice is highly likely to be artificially produced.`;
    } else {
      voiceType = 'Voice Clone';
      riskLevel = 'High';
      summary = `The Shanmugapriya6/voice-fake-detector-v1 model flagged this audio with ${spoofProbability}% spoof probability. The voice exhibits characteristics of voice cloning or manipulation — proceed with caution.`;
    }
  } else {
    const authPct = Math.round(realScore * 100);
    voiceType = 'Human';
    riskLevel = authPct >= 80 ? 'Low' : 'Medium';
    summary = `The Shanmugapriya6/voice-fake-detector-v1 model classified this audio as authentic human speech with ${authPct}% confidence. No significant synthetic artifacts were detected.`;
  }

  return { voiceType, confidence, spoofProbability, riskLevel, summary };
}

// ─── Primary: HuggingFace Inference API ──────────────────────────────────────
async function analyzeWithHuggingFace(audioBuffer: ArrayBuffer, mimeType: string) {
  console.log(`[voice-detector] Calling HF Inference API: ${HF_MODEL}`);

  const response = await fetch(HF_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      'Content-Type': mimeType || 'audio/wav',
    },
    body: audioBuffer,
    signal: AbortSignal.timeout(45000), // 45s — model may cold-start
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HF API ${response.status}: ${errText.substring(0, 300)}`);
  }

  const result = await response.json();

  // HF audio-classification → [{ label: string, score: number }, ...]
  if (!Array.isArray(result)) {
    throw new Error(`Unexpected HF response: ${JSON.stringify(result).substring(0, 200)}`);
  }

  console.log('[voice-detector] HF raw output:', JSON.stringify(result));
  return mapHFResult(result);
}

// ─── Fallback: Gemini 2.5 Flash multimodal audio ─────────────────────────────
async function analyzeWithGemini(audioBuffer: ArrayBuffer, mimeType: string) {
  console.log('[voice-detector] Falling back to Gemini 2.5 Flash...');

  const base64Audio = Buffer.from(audioBuffer).toString('base64');

  // Normalize MIME type for Gemini compatibility
  let geminiMime = mimeType || 'audio/wav';
  if (geminiMime.startsWith('audio/webm')) geminiMime = 'audio/webm';
  const supportedMimes = [
    'audio/wav', 'audio/x-wav', 'audio/mp3', 'audio/mpeg',
    'audio/ogg', 'audio/aac', 'audio/flac', 'audio/webm',
  ];
  if (!supportedMimes.includes(geminiMime)) geminiMime = 'audio/wav';

  const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are a forensic audio AI-voice detection expert. Analyze this audio file and determine whether the voice is authentic human speech or AI-generated/synthetic.

Analyze: spectral consistency, prosody & rhythm, intonation naturalness, background noise authenticity, micro-variations typical of real human speech, and TTS/voice-synthesis artifacts.

Respond ONLY with a valid JSON object (no markdown, no code fences):
{
  "voiceType": "Human" | "AI-Generated" | "Voice Clone" | "Deepfake",
  "confidence": <number 0-100>,
  "spoofProbability": <number 0-100>,
  "riskLevel": "Low" | "Medium" | "High" | "Critical",
  "summary": "<2-3 sentence explanation with specific acoustic observations>"
}`;

  const result = await geminiModel.generateContent({
    contents: [{
      role: 'user',
      parts: [
        { text: prompt },
        { inlineData: { data: base64Audio, mimeType: geminiMime as any } },
      ],
    }],
    generationConfig: { responseMimeType: 'application/json' },
  });

  const rawText = result.response.text().trim();
  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Gemini returned invalid JSON: ' + rawText.substring(0, 200));
    }
  }

  return {
    voiceType: parsed.voiceType || 'Unknown',
    confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 50)),
    spoofProbability: Math.min(100, Math.max(0, Number(parsed.spoofProbability) || 50)),
    riskLevel: parsed.riskLevel || 'Medium',
    summary: `[Gemini Fallback] ${parsed.summary || 'Analysis complete.'}`,
  };
}

// ─── Main POST Handler ────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file is required.' }, { status: 400 });
    }
    if (audioFile.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'File too large. Maximum size is 20MB.' }, { status: 400 });
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const mimeType = audioFile.type || 'audio/wav';
    const startTime = Date.now();

    let detectionResult;
    let modelUsed: string;

    // ── Step 1: Try HuggingFace (Shanmugapriya6/voice-fake-detector-v1) ───────
    try {
      detectionResult = await analyzeWithHuggingFace(arrayBuffer, mimeType);
      modelUsed = `HuggingFace · ${HF_MODEL}`;
    } catch (hfErr: any) {
      console.warn('[voice-detector] HuggingFace failed:', hfErr.message);

      // ── Step 2: Fallback → Gemini 2.5 Flash ──────────────────────────────
      try {
        detectionResult = await analyzeWithGemini(arrayBuffer, mimeType);
        modelUsed = 'Google Gemini 2.5 Flash (fallback)';
      } catch (geminiErr: any) {
        console.error('[voice-detector] Both providers failed.');
        return NextResponse.json(
          {
            error: 'Voice detection is currently unavailable. Both AI providers failed.',
            details: `HF: ${hfErr.message} | Gemini: ${geminiErr.message}`,
          },
          { status: 503 }
        );
      }
    }

    const detectionTimeMs = Date.now() - startTime;

    // ── Save to Supabase (non-fatal) ──────────────────────────────────────────
    const supabase = await createClient();
    let user = null;
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      user = authUser;
    } catch { /* anonymous */ }

    let audioUrl: string | null = null;
    try {
      const fileExt = audioFile.name.split('.').pop() || 'wav';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user?.id || 'anonymous'}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('audio-scans')
        .upload(filePath, arrayBuffer, { contentType: mimeType });

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('audio-scans').getPublicUrl(filePath);
        audioUrl = publicUrl;
      } else {
        console.warn('[voice-detector] Storage upload error:', uploadError.message);
      }
    } catch (storageErr) {
      console.warn('[voice-detector] Storage error (non-fatal):', storageErr);
    }

    try {
      await supabase.from('voice_detector_scans').insert({
        user_id: user?.id || null,
        voice_type: detectionResult.voiceType,
        confidence: detectionResult.confidence,
        spoof_probability: detectionResult.spoofProbability,
        risk_level: detectionResult.riskLevel,
        summary: detectionResult.summary,
        audio_url: audioUrl,
        file_name: audioFile.name,
      });
    } catch (dbErr) {
      console.warn('[voice-detector] DB insert error (non-fatal):', dbErr);
    }

    return NextResponse.json({
      ...detectionResult,
      audioUrl,
      detectionTimeSec: (detectionTimeMs / 1000).toFixed(2),
      modelUsed,
      fileName: audioFile.name,
    });

  } catch (error: any) {
    console.error('[voice-detector] Unhandled error:', error);
    return NextResponse.json(
      { error: 'Failed to process audio analysis.', details: error.message },
      { status: 500 }
    );
  }
}
