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

interface GenerateComplaintRequest {
  threat: {
    scamType: string;
    riskLevel: string;
    riskScore: number;
    summary: string;
    indicators: string[];
    recommendedAction?: string;
  };
  evidence: {
    selectedText?: string;
    detectedUrl?: string;
    pageUrl?: string;
    pageTitle?: string;
    timestamp?: string;
    platform?: string;
  };
  platform?: string;
}

interface ComplaintReport {
  title: string;
  body: string;
  reportLinks: Array<{ label: string; url: string }>;
  incidentSummary: string;
  evidenceSnapshot: string;
}

const COMPLAINT_SYSTEM_PROMPT = `You are a cybercrime complaint drafting assistant. Generate a professional, clear, and factual complaint report based on the provided threat analysis and evidence.

Return ONLY a valid JSON object:
{
  "title": "Brief complaint title (e.g., 'Report of Phishing Attempt via WhatsApp')",
  "incidentSummary": "2-3 sentence factual summary of the incident",
  "body": "Full professional complaint text that can be submitted to cybercrime authorities. Include: 1) Nature of incident, 2) Evidence description, 3) Potential harm, 4) Requested action. Write in first person.",
  "evidenceSnapshot": "Formatted list of key evidence pieces"
}
JSON only. No extra text.`;

const REPORT_LINKS: Record<string, Array<{ label: string; url: string }>> = {
  india: [
    { label: "Indian Cybercrime Portal", url: "https://cybercrime.gov.in" },
    { label: "Report to RBI (Banking Fraud)", url: "https://sachet.rbi.org.in" },
    { label: "Report to TRAI (SMS Spam)", url: "https://trai.gov.in/consumer-corner/dnd-services" },
  ],
  instagram: [
    { label: "Report on Instagram", url: "https://www.instagram.com/hc/en/articles/214994028-Report-Something" },
    { label: "Indian Cybercrime Portal", url: "https://cybercrime.gov.in" },
  ],
  whatsapp: [
    { label: "Report on WhatsApp", url: "https://www.whatsapp.com/legal/updates/security-tips/?eea=1" },
    { label: "Indian Cybercrime Portal", url: "https://cybercrime.gov.in" },
  ],
  email: [
    { label: "Report Phishing to CERT-In", url: "https://www.cert-in.org.in/CERT-In/publicreport.html" },
    { label: "Indian Cybercrime Portal", url: "https://cybercrime.gov.in" },
  ],
  default: [
    { label: "Indian Cybercrime Portal", url: "https://cybercrime.gov.in" },
    { label: "CERT-In (Cybersecurity)", url: "https://www.cert-in.org.in" },
    { label: "National Consumer Helpline", url: "https://consumerhelpline.gov.in" },
  ],
};

function getReportLinks(platform?: string, detectedUrl?: string): Array<{ label: string; url: string }> {
  if (detectedUrl?.includes("instagram.com") || platform === "instagram") {
    return REPORT_LINKS.instagram;
  }
  if (detectedUrl?.includes("whatsapp.com") || platform === "whatsapp") {
    return REPORT_LINKS.whatsapp;
  }
  if (platform === "gmail" || platform === "email") {
    return REPORT_LINKS.email;
  }
  return REPORT_LINKS.default;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateComplaintRequest = await request.json();

    if (!body.threat) {
      return NextResponse.json({ error: "Threat data required" }, { status: 400 });
    }

    const client = getGroqClient();
    const completion = await client.chat.completions.create({
      model: groqModel,
      messages: [
        { role: "system", content: COMPLAINT_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Generate a cybercrime complaint based on:

THREAT ANALYSIS:
- Scam Type: ${body.threat.scamType}
- Risk Level: ${body.threat.riskLevel} (Score: ${body.threat.riskScore}/100)
- Summary: ${body.threat.summary}
- Key Indicators: ${body.threat.indicators?.join("; ")}

EVIDENCE:
- Selected Text: ${body.evidence.selectedText ? `"${body.evidence.selectedText.slice(0, 300)}"` : "Not captured"}
- Suspicious URL: ${body.evidence.detectedUrl || "Not found"}
- Source Page: ${body.evidence.pageUrl || "Unknown"}
- Page Title: ${body.evidence.pageTitle || "Unknown"}
- Timestamp: ${body.evidence.timestamp || new Date().toISOString()}
- Platform: ${body.platform || body.evidence.platform || "Unknown"}

Generate a professional complaint report. JSON only.`,
        },
      ],
      max_tokens: 1500,
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const rawContent = completion.choices[0]?.message?.content || "";
    let aiResult: Omit<ComplaintReport, "reportLinks">;

    try {
      aiResult = JSON.parse(rawContent);
    } catch {
      aiResult = {
        title: `Report of ${body.threat.scamType} — ${new Date().toLocaleDateString()}`,
        incidentSummary: body.threat.summary,
        body: `I wish to report a cybercrime incident detected on ${body.evidence.pageUrl || "an unknown page"}.

Nature of Incident: ${body.threat.scamType} (Risk Level: ${body.threat.riskLevel})

${body.threat.summary}

Key indicators identified:
${body.threat.indicators?.map((i) => `- ${i}`).join("\n")}

${body.evidence.detectedUrl ? `Suspicious URL involved: ${body.evidence.detectedUrl}` : ""}
${body.evidence.selectedText ? `Suspicious content: "${body.evidence.selectedText.slice(0, 200)}"` : ""}

Detected on: ${body.evidence.timestamp || new Date().toISOString()}

I request appropriate action be taken against this threat.`,
        evidenceSnapshot: [
          body.evidence.detectedUrl && `URL: ${body.evidence.detectedUrl}`,
          body.evidence.pageUrl && `Source: ${body.evidence.pageUrl}`,
          body.evidence.timestamp && `Time: ${body.evidence.timestamp}`,
          body.evidence.selectedText && `Text snippet: "${body.evidence.selectedText.slice(0, 100)}..."`,
        ]
          .filter(Boolean)
          .join("\n"),
      };
    }

    const reportLinks = getReportLinks(body.platform || body.evidence.platform, body.evidence.detectedUrl);

    const complaint: ComplaintReport = {
      ...aiResult,
      reportLinks,
    };

    return NextResponse.json(
      { complaint },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error) {
    console.error("[Nulltrace] generate-complaint error:", error);
    return NextResponse.json(
      { error: "Complaint generation failed." },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
