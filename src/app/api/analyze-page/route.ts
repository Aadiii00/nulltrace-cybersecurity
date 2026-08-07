import { NextRequest, NextResponse } from "next/server";
import { getGroqClient, groqModel } from "@/lib/groq";

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

interface AnalyzePageRequest {
  title: string;
  text: string;
  links: string[];
  pageUrl: string;
}

const PAGE_SYSTEM_PROMPT = `You are a cybersecurity page analyst. Analyze the provided webpage content for threats including phishing, scams, malware, social engineering, and fake sites.

Return ONLY a valid JSON object with this structure:
{
  "threat": {
    "scamType": "string",
    "riskLevel": "LOW | MEDIUM | HIGH | CRITICAL",
    "riskScore": number 0-100,
    "intent": "string",
    "emotion": "string",
    "summary": "string (2-3 sentences)",
    "indicators": ["array of specific red flags"],
    "riskyParts": ["suspicious phrases from page content"],
    "recommendedAction": "string"
  },
  "pageSummary": "string - brief description of what this page is about",
  "suspiciousLinks": ["array of up to 5 most suspicious links found"]
}
JSON only. No extra text.`;

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzePageRequest = await request.json();

    if (!body.pageUrl) {
      return NextResponse.json({ error: "pageUrl is required" }, { status: 400 });
    }

    // Truncate text to avoid token overflow
    const truncatedText = (body.text || "").slice(0, 3000);
    const topLinks = (body.links || []).slice(0, 20);

    // Simple heuristic pre-filter for suspicious links
    const suspiciousLinkKeywords = ["login", "verify", "otp", "secure", "account", "update", "bank", "prize", "claim"];
    const flaggedLinks = topLinks.filter((link) => {
      const lower = link.toLowerCase();
      return suspiciousLinkKeywords.some((kw) => lower.includes(kw));
    }).slice(0, 5);

    const client = getGroqClient();
    const completion = await client.chat.completions.create({
      model: groqModel,
      messages: [
        { role: "system", content: PAGE_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Analyze this webpage:

PAGE URL: ${body.pageUrl}
PAGE TITLE: ${body.title || "Unknown"}

PAGE TEXT (first 3000 chars):
"""
${truncatedText}
"""

LINKS ON PAGE (sample):
${topLinks.join("\n")}

PRE-FLAGGED SUSPICIOUS LINKS:
${flaggedLinks.join("\n") || "None"}

Return JSON only.`,
        },
      ],
      max_tokens: 2048,
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const rawContent = completion.choices[0]?.message?.content || "";
    let result;
    try {
      result = JSON.parse(rawContent);
    } catch {
      result = {
        threat: {
          scamType: flaggedLinks.length > 0 ? "Suspicious Page" : "Safe",
          riskLevel: flaggedLinks.length > 2 ? "HIGH" : flaggedLinks.length > 0 ? "MEDIUM" : "LOW",
          riskScore: flaggedLinks.length * 25,
          intent: "Unknown",
          emotion: "none",
          summary: `Page analysis complete. Found ${flaggedLinks.length} potentially suspicious link(s).`,
          indicators: flaggedLinks.map((l) => `Suspicious link: ${l}`),
          riskyParts: [],
          recommendedAction: flaggedLinks.length > 0
            ? "Review suspicious links before clicking. Verify the site's legitimacy."
            : "Page appears normal. Stay vigilant.",
        },
        pageSummary: `Webpage at ${body.pageUrl}`,
        suspiciousLinks: flaggedLinks,
      };
    }

    const evidence = {
      pageUrl: body.pageUrl,
      pageTitle: body.title,
      timestamp: new Date().toISOString(),
      totalLinks: topLinks.length,
      flaggedLinks,
    };

    return NextResponse.json(
      { ...result, evidence },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error) {
    console.error("[Nulltrace] analyze-page error:", error);
    return NextResponse.json(
      { error: "Page analysis failed." },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
