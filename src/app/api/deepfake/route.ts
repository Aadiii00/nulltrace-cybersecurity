import { NextResponse } from 'next/server';
import { groqVision } from '@/lib/groq';
import { createClient } from '@/lib/supabase/server';

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

    // We will read the arrayBuffer once in case we need it for fallback
    const arrayBuffer = await image.arrayBuffer();

    let analysis;
    try {
      // Forward the image to our local Python FastAPI backend
      const pythonFormData = new FormData();
      // Need to recreate a Blob for fetch to avoid stream consumption issues
      pythonFormData.append('image', new Blob([arrayBuffer], { type: image.type }), image.name);

      const backendRes = await fetch('http://127.0.0.1:8000/detect-image', {
        method: 'POST',
        body: pythonFormData,
      });

      if (!backendRes.ok) {
        throw new Error(`Python Backend Error: ${backendRes.status}`);
      }

      const hfData = await backendRes.json();

      analysis = {
        isAIGenerated: hfData.type === 'AI_GENERATED',
        confidence: hfData.confidence,
        reason: hfData.reason || (hfData.type === 'AI_GENERATED'
          ? 'Deep analysis via Hugging Face (Ateeqq/ai-vs-human-image-detector) flagged this image as AI-generated.'
          : 'Deep analysis via Hugging Face (Ateeqq/ai-vs-human-image-detector) classified this image as a human-created photograph.')
      };
    } catch (err) {
      console.warn("Primary AI backend failed. Falling back to Groq Vision...", err);
      
      const base64Data = Buffer.from(arrayBuffer).toString('base64');
      const prompt = `You are a top-tier forensic AI analyst. Analyze if this image is AI-generated or a human-created photograph.
Respond ONLY with valid JSON, nothing else:
{
  "isAIGenerated": true or false,
  "confidence": a number from 0 to 100,
  "reason": "1-2 sentence technical reason."
}`;

      const responseText = await groqVision(base64Data, image.type, prompt);
      console.log('Groq Fallback raw response:', responseText);

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
         throw new Error('Fallback failed to extract valid JSON.');
      }
      
      const fallbackData = JSON.parse(jsonMatch[0]);
      analysis = {
        isAIGenerated: fallbackData.isAIGenerated,
        confidence: fallbackData.confidence,
        reason: `[Analyzed via Fallback System] ${fallbackData.reason}`
      };
    }

    // Save to Supabase Storage & Database
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let imageUrl = null;
    try {
      // 1. Upload to Storage
      const fileExt = image.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user?.id || 'anonymous'}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('deepfake-images')
        .upload(filePath, arrayBuffer, { contentType: image.type });

      if (uploadError) {
        console.error('Supabase storage upload error:', uploadError);
      } else {
        // 2. Get Public URL
        const { data: { publicUrl } } = supabase.storage
          .from('deepfake-images')
          .getPublicUrl(filePath);
        imageUrl = publicUrl;
      }
    } catch (storageErr) {
      console.error('Storage processing error:', storageErr);
    }

    // 3. Insert into Database
    const { error: dbError } = await supabase.from('deepfake_scans').insert({
      image_name: image.name,
      image_url: imageUrl,
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
