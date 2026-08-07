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

interface AnalyzeUrlRequest {
  url: string;
  context?: string;
}

interface UrlIntelResult {
  url: string;
  domain: string | null;
  protocol: string;
  isSecure: boolean;
  suspiciousKeywords: string[];
  usesIpAddress: boolean;
  isShortened: boolean;
  subdomainDepth: number;
  suspiciousTld: boolean;
  riskSignals: string[];
  riskFlag: "LOW" | "MEDIUM" | "HIGH";
}

interface RedirectChain {
  chain: string[];
  finalUrl?: string;
  suspiciousRedirects: boolean;
  error?: string;
}

const SHORTENERS = new Set([
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "buff.ly",
  "short.link", "rebrand.ly", "cutt.ly", "rb.gy", "is.gd", "v.gd",
  "tiny.cc", "lnkd.in", "fb.me", "wa.me",
]);

const SUSPICIOUS_TLDS = new Set([
  ".xyz", ".tk", ".ml", ".ga", ".cf", ".gq", ".top", ".loan",
  ".click", ".download", ".work", ".review", ".country", ".stream",
]);

const SUSPICIOUS_KEYWORDS = [
  "login", "verify", "update", "secure", "bank", "otp", "prize",
  "gift", "account", "password", "credential", "confirm", "auth",
  "wallet", "kyc", "claim", "free", "bonus", "reward", "alert",
  "suspend", "lock", "recover", "reset",
];

function analyzeUrl(rawUrl: string): UrlIntelResult {
  let url = rawUrl.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }

  let parsedUrl: URL | null = null;
  let domain: string | null = null;
  let protocol = "unknown";
  let isSecure = false;
  let subdomainDepth = 0;

  try {
    parsedUrl = new URL(url);
    domain = parsedUrl.hostname;
    protocol = parsedUrl.protocol.replace(":", "");
    isSecure = protocol === "https";
    subdomainDepth = domain.split(".").length - 2;
  } catch {
    // malformed URL
  }

  const riskSignals: string[] = [];
  const suspiciousKeywordsFound: string[] = [];

  if (!isSecure) riskSignals.push("Insecure HTTP connection");

  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const usesIpAddress = domain ? ipRegex.test(domain) : false;
  if (usesIpAddress) riskSignals.push("URL uses raw IP address instead of domain");

  const isShortened = domain ? SHORTENERS.has(domain.toLowerCase()) : false;
  if (isShortened) riskSignals.push("URL uses a link shortener — destination is hidden");

  const suspiciousTld = SUSPICIOUS_TLDS.has("." + (domain?.split(".").pop() || ""));
  if (suspiciousTld) riskSignals.push(`Suspicious top-level domain (.${domain?.split(".").pop()})`);

  const urlLower = url.toLowerCase();
  for (const kw of SUSPICIOUS_KEYWORDS) {
    if (urlLower.includes(kw)) {
      suspiciousKeywordsFound.push(kw);
    }
  }
  if (suspiciousKeywordsFound.length > 0) {
    riskSignals.push(`Suspicious keywords in URL: ${suspiciousKeywordsFound.join(", ")}`);
  }

  if (subdomainDepth >= 3) {
    riskSignals.push(`Deep subdomain structure (${subdomainDepth} levels) — possible spoofing`);
  }

  if (url.includes("@")) {
    riskSignals.push("URL contains '@' — possible phishing obfuscation");
  }

  if (domain && domain.includes("xn--")) {
    riskSignals.push("URL uses punycode encoding — possible homograph/lookalike attack");
  }

  let riskFlag: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  if (riskSignals.length >= 3 || usesIpAddress || suspiciousKeywordsFound.length >= 2) {
    riskFlag = "HIGH";
  } else if (riskSignals.length >= 1 || suspiciousKeywordsFound.length >= 1) {
    riskFlag = "MEDIUM";
  }

  return {
    url: rawUrl,
    domain,
    protocol,
    isSecure,
    suspiciousKeywords: suspiciousKeywordsFound,
    usesIpAddress,
    isShortened,
    subdomainDepth,
    suspiciousTld,
    riskSignals,
    riskFlag,
  };
}

async function analyzeRedirectChain(url: string): Promise<RedirectChain> {
  const chain: string[] = [url];
  let current = url;
  const maxRedirects = 5;
  let suspiciousRedirects = false;

  try {
    for (let i = 0; i < maxRedirects; i++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(current, {
          method: "HEAD",
          redirect: "manual",
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; NulltraceBot/1.0)",
          },
        });
        clearTimeout(timeout);

        const location = response.headers.get("location");
        if (location && [301, 302, 307, 308].includes(response.status)) {
          const resolvedLocation = location.startsWith("http") ? location : new URL(location, current).href;
          chain.push(resolvedLocation);
          try {
            const origDomain = new URL(current).hostname;
            const newDomain = new URL(resolvedLocation).hostname;
            if (origDomain !== newDomain) suspiciousRedirects = true;
          } catch { /* ignore */ }
          current = resolvedLocation;
        } else {
          break;
        }
      } catch {
        clearTimeout(timeout);
        break;
      }
    }
  } catch (e) {
    return { chain, finalUrl: current, suspiciousRedirects, error: String(e) };
  }

  return { chain, finalUrl: chain[chain.length - 1], suspiciousRedirects };
}

const URL_SYSTEM_PROMPT = `You are a cybersecurity URL analyst. Analyze the provided URL and technical intel for threats.
Return ONLY a valid JSON object with this exact structure:
{
  "threat": {
    "scamType": "string",
    "riskLevel": "LOW | MEDIUM | HIGH | CRITICAL",
    "riskScore": number between 0-100,
    "intent": "string",
    "summary": "string",
    "indicators": ["array of specific indicators"],
    "recommendedAction": "string"
  }
}
No additional text. JSON only.`;

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeUrlRequest = await request.json();

    if (!body.url || body.url.trim().length < 4) {
      return NextResponse.json({ error: "No valid URL provided" }, { status: 400 });
    }

    const [urlIntel, redirectChain] = await Promise.all([
      Promise.resolve(analyzeUrl(body.url)),
      analyzeRedirectChain(body.url).catch((e) => ({
        chain: [body.url],
        finalUrl: body.url,
        suspiciousRedirects: false,
        error: String(e),
      })),
    ]);

    const client = getGroqClient();
    const completion = await client.chat.completions.create({
      model: groqModel,
      messages: [
        { role: "system", content: URL_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Analyze this URL:

URL: ${body.url}
Domain: ${urlIntel.domain}
Protocol: ${urlIntel.protocol}
Risk Signals: ${urlIntel.riskSignals.join("; ") || "None"}
Suspicious Keywords: ${urlIntel.suspiciousKeywords.join(", ") || "None"}
Uses IP: ${urlIntel.usesIpAddress}
Is Shortened: ${urlIntel.isShortened}
Redirect Chain: ${redirectChain.chain.join(" → ")}
Cross-Domain Redirects: ${redirectChain.suspiciousRedirects}
${body.context ? `Context: ${body.context}` : ""}

Return JSON only.`,
        },
      ],
      max_tokens: 1024,
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const rawContent = completion.choices[0]?.message?.content || "";
    let threatResult;
    try {
      threatResult = JSON.parse(rawContent);
    } catch {
      const riskScore = Math.min(urlIntel.riskSignals.length * 20, 90);
      threatResult = {
        threat: {
          scamType: urlIntel.riskFlag === "HIGH" ? "Suspicious URL" : "Safe",
          riskLevel: urlIntel.riskFlag,
          riskScore,
          intent: urlIntel.riskFlag !== "LOW" ? "Possible phishing or malware" : "Unknown",
          summary: `URL analysis detected ${urlIntel.riskSignals.length} risk signal(s).`,
          indicators: urlIntel.riskSignals,
          recommendedAction: urlIntel.riskFlag === "HIGH"
            ? "Do not visit this URL."
            : "Proceed with caution.",
        },
      };
    }

    return NextResponse.json(
      { ...threatResult, urlIntel, redirectChain },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error) {
    console.error("[Nulltrace] analyze-url error:", error);
    return NextResponse.json(
      { error: "URL analysis failed." },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
