import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const visionModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json({ error: 'Image file is required.' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(image.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPG, PNG, and WebP are allowed.' },
        { status: 400 }
      );
    }

    if (image.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Convert to base64 for Gemini Vision
    const arrayBuffer = await image.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    const prompt = `You are an expert forensic AI analyst specializing in detecting AI-generated and deepfake images.

Analyze this image carefully and determine whether it is AI-generated/synthetic or a real photograph taken by a camera.

Check for these indicators of AI generation:
- Unnatural skin textures or overly smooth surfaces
- Inconsistent lighting or impossible shadows
- Distorted, asymmetrical, or melted facial features
- Blurry or warped background/foreground boundaries
- Missing or incorrect reflections in eyes or glasses
- Hair that looks too perfect or has unusual merging patterns
- GAN artifacts (repeating patterns, noise artifacts)
- Lack of natural camera noise or grain
- Impossible anatomical details (extra fingers, merged ears, etc.)
- Overly perfect symmetry that looks unnatural
- Background elements that make no geometric sense

Respond ONLY with valid JSON, no markdown, no explanation outside JSON:
{
  "isAIGenerated": true or false,
  "confidence": a number from 0 to 100 representing your confidence level,
  "reason": "A clear, technical 2-3 sentence explanation of the specific visual evidence that led to your conclusion."
}`;

    const result = await visionModel.generateContent([
      {
        inlineData: {
          mimeType: image.type as 'image/jpeg' | 'image/png' | 'image/webp',
          data: base64Data,
        },
      },
      prompt,
    ]);

    const responseText = result.response.text();
    console.log('Gemini deepfake raw response:', responseText);

    // Strip markdown code blocks if present
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract valid JSON from Gemini response.');
    }

    const analysis = JSON.parse(jsonMatch[0]) as {
      isAIGenerated: boolean;
      confidence: number;
      reason: string;
    };

    // Save to Supabase
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error: dbError } = await supabase.from('deepfake_scans').insert({
      image_name: image.name,
      is_ai_generated: analysis.isAIGenerated,
      confidence: analysis.confidence,
      reason: analysis.reason,
      user_id: user?.id || null,
    });

    if (dbError) {
      console.error('Supabase deepfake save error:', dbError);
    }

    // Trigger webhook only if deepfake detected
    if (analysis.isAIGenerated) {
      try {
        const webhookData = {
          timestamp: new Date().toISOString(),
          source: 'nulltrace-deepfake-detector',
          imageName: image.name,
          isAIGenerated: analysis.isAIGenerated,
          confidence: analysis.confidence,
          reason: analysis.reason,
          userId: user?.id || null,
          alert: 'DEEPFAKE DETECTED — Automated alert triggered.',
        };

        const webhookResponse = await fetch(
          'https://hook.us2.make.com/gbe48aw2e2v7wpenaxy5h7042atrn5dq',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookData),
          }
        );

        if (!webhookResponse.ok) {
          console.error('Deepfake webhook failed:', webhookResponse.status);
        } else {
          console.log('Deepfake webhook sent successfully');
        }
      } catch (webhookError) {
        console.error('Deepfake webhook error:', webhookError);
      }
    }

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error('Deepfake detection error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze image.', details: error.message },
      { status: 500 }
    );
  }
}
