import { NextRequest, NextResponse } from "next/server";
import { getGroqClient, groqModel } from "@/lib/groq";

// Handle preflight CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

interface AnalyzeSelectionRequest {
  text: string;
  pageUrl?: string;
  pageTitle?: string;
  platform?: string;
  detectedUrl?: string;
}

const SYSTEM_PROMPT = `You are Nulltrace Sentinel, an expert cybersecurity analyst specializing in phishing, scams, social engineering, and online fraud detection.

Analyze the provided content and return ONLY a valid JSON object with NO additional text, markdown, or explanation.

The JSON must follow this exact structure:
{
  "threat": {
    "scamType": "string (e.g. Phishing, OTP Scam, Fake Job, Fake Giveaway, Impersonation, Account Recovery Scam, Payment Fraud, Romance Scam, Suspicious, Safe)",
    "riskLevel": "LOW | MEDIUM | HIGH | CRITICAL",
    "riskScore": number between 0 and 100,
    "intent": "string describing attacker's likely intent",
    "emotion": "string describing emotional manipulation tactic used (e.g. urgency, fear, greed, curiosity, none)",
    "summary": "string - 2-3 sentence plain-English threat summary",
    "indicators": ["array", "of", "specific", "red", "flags", "found"],
    "riskyParts": ["specific", "suspicious", "phrases", "or", "text", "snippets"],
    "recommendedAction": "string - what the user should do"
  },
  "urlIntel": {
    "url": "string or null",
    "domain": "string or null",
    "isSecure": boolean or null,
    "suspiciousKeywords": ["array of suspicious keywords found in URL"],
    "usesIpAddress": boolean,
    "isShortened": boolean,
    "riskSignals": ["array of URL-specific risk signals"],
    "riskFlag": "LOW | MEDIUM | HIGH"
  }
}

Guidelines:
- Be specific and accurate. Do NOT hallucinate threats that aren't there.
- If content seems safe, set riskLevel to LOW and riskScore below 20.
- Focus on these scam categories: phishing, OTP scam, fake jobs/internships, fake giveaways, impersonation, account recovery scam, payment/UPI fraud, romance/emotional manipulation.
- Analyze language patterns, urgency cues, suspicious requests, and contextual red flags.
- For urlIntel, if no URL is present, set all URL fields to null/false/empty.`;

function buildUserPrompt(req: AnalyzeSelectionRequest): string {
  return `Analyze the following for cybersecurity threats:

SELECTED TEXT:
"""
${req.text.slice(0, 4000)}
"""

${req.detectedUrl ? `DETECTED URL: ${req.detectedUrl}` : ""}
${req.pageUrl ? `PAGE URL: ${req.pageUrl}` : ""}
${req.pageTitle ? `PAGE TITLE: ${req.pageTitle}` : ""}
${req.platform ? `PLATFORM: ${req.platform}` : ""}

Return ONLY the JSON object as specified. No other text.`;
}

function fallbackThreatResult(text: string) {
  const lower = text.toLowerCase();
  const phishingKeywords = [
    "click here",
    "verify",
    "otp",
    "password",
    "account suspended",
    "urgent",
    "immediately",
    "prize",
    "winner",
    "congratulations",
    "bank",
    "upi",
    "kyc",
  ];
  const matches = phishingKeywords.filter((kw) => lower.includes(kw));
  const riskScore = Math.min(matches.length * 15, 85);
  const riskLevel =
    riskScore >= 60
      ? "HIGH"
      : riskScore >= 30
        ? "MEDIUM"
        : ("LOW" as "HIGH" | "MEDIUM" | "LOW");

  return {
    threat: {
      scamType: riskScore >= 30 ? "Suspicious" : "Safe",
      riskLevel,
      riskScore,
      intent: riskScore >= 30 ? "Unknown — manual review recommended" : "None detected",
      emotion: matches.includes("urgent") || matches.includes("immediately") ? "urgency" : "none",
      summary: riskScore >= 30
        ? `Found ${matches.length} suspicious keyword(s): ${matches.join(", ")}. Manual review recommended.`
        : "No significant threat indicators detected in the selected content.",
      indicators: matches.map((m) => `Suspicious keyword: "${m}"`),
      riskyParts: matches,
      recommendedAction: riskScore >= 60
        ? "Do not click any links or share any personal information. Verify through official channels."
        : riskScore >= 30
          ? "Exercise caution. Verify the sender or source before acting."
          : "Content appears safe. Stay vigilant.",
    },
    urlIntel: {
      url: null,
      domain: null,
      isSecure: null,
      suspiciousKeywords: [],
      usesIpAddress: false,
      isShortened: false,
      riskSignals: [],
      riskFlag: "LOW" as "LOW",
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeSelectionRequest = await request.json();

    if (!body.text || body.text.trim().length < 3) {
      return NextResponse.json(
        { error: "Text too short to analyze" },
        { status: 400 }
      );
    }

    const client = getGroqClient();
    const completion = await client.chat.completions.create({
      model: groqModel,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(body) },
      ],
      max_tokens: 2048,
      temperature: 0.1, // Low temperature for consistent structured output
      response_format: { type: "json_object" },
    });

    const rawContent = completion.choices[0]?.message?.content || "";

    let result;
    try {
      result = JSON.parse(rawContent);
    } catch {
      console.warn("[Nulltrace] AI returned non-JSON, using fallback:", rawContent.slice(0, 200));
      result = fallbackThreatResult(body.text);
    }

    // Validate and fill missing fields
    if (!result.threat) result = fallbackThreatResult(body.text);

    // Add evidence metadata
    const evidence = {
      selectedText: body.text.slice(0, 1000),
      detectedUrl: body.detectedUrl || null,
      pageUrl: body.pageUrl || null,
      pageTitle: body.pageTitle || null,
      timestamp: new Date().toISOString(),
      platform: body.platform || "unknown",
    };

    return NextResponse.json(
      { ...result, evidence },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("[Nulltrace] analyze-selection error:", error);
    return NextResponse.json(
      { error: "Analysis failed. Backend may be unavailable." },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
