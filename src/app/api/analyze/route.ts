import { NextResponse } from 'next/server';
import { model } from '@/lib/gemini';
import { createClient } from '@/lib/supabase/server';
import { ThreatAnalysis } from '@/types/threats';

export async function POST(req: Request) {
  try {
    const { content, type, toolContext: customContext } = await req.json();

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    let threatContext = customContext ? `${customContext} ` : "";
    if (type === 'message' || type === 'selection') {
      threatContext = "Focus on phishing, social engineering, urgency, recruitment scams, and OTP fraud. Check for suspicious phone numbers or sender handles. This is a user-selected text snippet from a website.";
    } else if (type === 'url') {
      // Basic programmatic check for common suspicious patterns to prime the AI
      const isSusTLD = /\.(xyz|top|pw|monster|click|space|zip|mov)$/i.test(content);
      const hasTyposquat = /(g00gle|am4zon|micr0soft|paypa1|fac3book)/i.test(content);
      
      threatContext = `Focus on:
      - Typosquatting (e.g., looks like a legit brand but misspelled). ${hasTyposquat ? "POSSIBLE TYPOSQUAT DETECTED." : ""}
      - Suspicious TLDs (e.g., .xyz, .top, .zip). ${isSusTLD ? "SUSPICIOUS TLD DETECTED." : ""}
      - Redirection layers (bit.ly, tinyurl) being used to mask destinations.
      - Brand impersonation in the path or subdomain.
      - Absence of proper SSL indicators in the domain string itself.`;
    } else if (type === 'file') {
      threatContext = "Focus on: Forensic analysis of document content. Look for fake invoice patterns, urgency-driven financial threats, 'unpaid bill' scams, fake HR/Recruitment offer letters, and requests for sensitive PII (SSN, Bank Details). Check for inconsistent branding or generic greetings.";
    }

    const prompt = `
      You are "Cyber Sentinel," the advanced AI Threat Intelligence engine for DetectoAI.
      Analyze the following ${type} content for digital threats. ${threatContext}
      
      Content to analyze:
      "${content}"
      
      Response Format (STRICT JSON ONLY):
      {
        "trustScore": number (0-100, where 100 is perfectly safe),
        "riskLevel": "low" | "medium" | "high" | "critical",
        "analysis": "A high-fidelity forensic explanation of the risks found.",
        "intent": "scam" | "marketing" | "legit" | "unknown",
        "emotion": "Dominant emotional vector (e.g. Urgency, Fear, Professional, Neutral).",
        "patterns": ["List specific identified threat patterns (e.g. 'Social Engineering', 'Typosquatting')"],
        "riskyParts": ["Specific snippets from the content that triggered the alert"]
      }
    `;

    console.log('Gemini prompt:', prompt);
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    console.log('Gemini raw response:', responseText);
    
    // Extract JSON if model wraps it in markdown
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Failed to extract JSON. Response text:', responseText);
      throw new Error("Failed to extract valid JSON from AI response.");
    }
    
    const analysis: ThreatAnalysis = JSON.parse(jsonMatch[0]);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Map user-friendly extension types to valid database types
    let dbType: string;
    const lowerType = type ? type.toLowerCase() : 'message';
    
    if (lowerType === 'url' || lowerType.includes('phishing') || lowerType.includes('link')) {
      dbType = 'url';
    } else if (lowerType === 'file' || lowerType.includes('screenshot')) {
      dbType = 'file';
    } else {
      // Default for WhatsApp Message, Email Content, Selected Text, etc.
      dbType = 'message';
    }
    
    const { error: dbError } = await supabase.from('scans').insert({
      type: dbType,
      input: content.substring(0, 5000), // Safety truncation for DB
      trust_score: analysis.trustScore,
      risk_level: analysis.riskLevel,
      analysis: analysis.analysis,
      intent: analysis.intent,
      emotion: analysis.emotion,
      patterns: analysis.patterns,
      risky_parts: analysis.riskyParts,
      user_id: user?.id || null
    });

    if (dbError) {
      console.error('Supabase save error:', dbError);
    }

    // Send webhook to Make.com
    try {
      const webhookData = {
        timestamp: new Date().toISOString(),
        type: dbType,
        input: content.substring(0, 5000),
        trustScore: analysis.trustScore,
        riskLevel: analysis.riskLevel,
        analysis: analysis.analysis,
        intent: analysis.intent,
        emotion: analysis.emotion,
        patterns: analysis.patterns,
        riskyParts: analysis.riskyParts,
        userId: user?.id || null,
        source: 'nulltrace-web'
      };

      const webhookResponse = await fetch('https://hook.us2.make.com/gbe48aw2e2v7wpenaxy5h7042atrn5dq', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData)
      });

      if (!webhookResponse.ok) {
        console.error('Webhook failed:', webhookResponse.status, webhookResponse.statusText);
      } else {
        console.log('Webhook sent successfully');
      }
    } catch (webhookError) {
      console.error('Webhook error:', webhookError);
    }

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error('Detailed Analysis error:', error);
    return NextResponse.json({ 
      error: 'Failed to analyze content',
      details: error.message 
    }, { status: 500 });
  }
}
