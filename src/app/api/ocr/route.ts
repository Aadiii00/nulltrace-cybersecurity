import { NextResponse } from 'next/server';
import Tesseract from 'tesseract.js';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }

    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: { text } } = await Tesseract.recognize(buffer, 'eng');

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error('OCR error:', error);
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 });
  }
}
