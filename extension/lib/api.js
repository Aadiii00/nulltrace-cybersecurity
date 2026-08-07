// Nulltrace Sentinel — Direct Groq API Client
// Calls Groq API directly from the extension — no backend server required

const NulltraceApi = (() => {
  const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
  const GROQ_MODEL = 'llama-3.1-8b-instant';
  const FALLBACK_BACKEND = 'http://localhost:3000';

  // ─── Get stored Groq API key ──────────────────────────────────────────────

  async function getGroqKey() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['nulltrace_settings'], (result) => {
        const settings = result.nulltrace_settings || {};
        resolve(settings.groqApiKey || '');
      });
    });
  }

  async function getBackendUrl() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['nulltrace_settings'], (result) => {
        const settings = result.nulltrace_settings || {};
        resolve(settings.backendUrl || FALLBACK_BACKEND);
      });
    });
  }

  // ─── Core Groq Chat Call ──────────────────────────────────────────────────

  async function groqChat(systemPrompt, userPrompt, timeoutMs = 20000) {
    const apiKey = await getGroqKey();

    if (!apiKey || apiKey.trim().length < 10) {
      throw new Error('NO_API_KEY');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 2048,
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
      });

      clearTimeout(timer);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 401) throw new Error('INVALID_API_KEY');
        throw new Error(`Groq API error ${response.status}: ${err.error?.message || 'Unknown'}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      try {
        return JSON.parse(content);
      } catch {
        // Try to extract JSON from the response if it has extra text
        const match = content.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        throw new Error('AI returned non-JSON response');
      }
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') throw new Error('Request timed out');
      throw err;
    }
  }

  // ─── Cybersecurity Analysis Prompt ───────────────────────────────────────

  const SECURITY_SYSTEM_PROMPT = `You are Nulltrace Sentinel, an expert cybersecurity analyst specializing in phishing, scams, social engineering, and online fraud detection.

Analyze the provided content and return ONLY a valid JSON object with NO extra text or markdown.

Return exactly this structure:
{
  "threat": {
    "scamType": "one of: Phishing | OTP Scam | Fake Job | Fake Giveaway | Impersonation | Account Recovery Scam | Payment Fraud | Romance Scam | Suspicious | Safe",
    "riskLevel": "LOW | MEDIUM | HIGH | CRITICAL",
    "riskScore": number 0-100,
    "intent": "brief description of attacker intent",
    "emotion": "urgency | fear | greed | curiosity | love | none",
    "summary": "2-3 sentence plain English threat summary",
    "indicators": ["specific red flag 1", "specific red flag 2"],
    "riskyParts": ["suspicious phrase from text"],
    "recommendedAction": "what the user should do"
  },
  "urlIntel": {
    "url": "detected URL or null",
    "domain": "domain or null",
    "isSecure": true/false/null,
    "suspiciousKeywords": ["keyword1"],
    "usesIpAddress": false,
    "isShortened": false,
    "riskSignals": ["signal1"],
    "riskFlag": "LOW | MEDIUM | HIGH"
  }
}

Rules:
- Be specific and accurate. Do NOT fabricate threats not present.
- If content is safe, set riskLevel: "LOW" and riskScore < 20.
- Focus on: phishing, OTP scams, fake jobs, fake giveaways, impersonation, payment fraud, romance scams.
- If no URL exists in the text, set all urlIntel fields to null/false/empty.
- JSON ONLY. No markdown, no explanation.`;

  // ─── Fallback keyword analysis (when no API key) ──────────────────────────

  function keywordFallback(text, detectedUrl) {
    const lower = text.toLowerCase();
    const keywords = {
      critical: ['your account has been hacked', 'otp to regain access', 'urgent: verify now', 'click immediately'],
      high: ['otp', 'verify your account', 'suspicious activity', 'your account will be suspended', 'limited time offer', 'you have won', 'claim your prize', 'send money', 'upi', 'kyc required'],
      medium: ['click here', 'login', 'password', 'urgent', 'free gift', 'congratulations', 'bank', 'secure your account'],
      low: ['verify', 'update', 'confirm'],
    };

    let riskLevel = 'LOW';
    let riskScore = 5;
    const indicators = [];
    const riskyParts = [];

    for (const [level, kws] of Object.entries(keywords)) {
      for (const kw of kws) {
        if (lower.includes(kw)) {
          indicators.push(`Suspicious phrase detected: "${kw}"`);
          riskyParts.push(kw);
          if (level === 'critical' && riskScore < 90) { riskLevel = 'CRITICAL'; riskScore = 90; }
          else if (level === 'high' && riskScore < 70) { riskLevel = 'HIGH'; riskScore = Math.max(riskScore, 65 + indicators.length * 5); }
          else if (level === 'medium' && riskScore < 50) { riskLevel = 'MEDIUM'; riskScore = Math.max(riskScore, 35 + indicators.length * 5); }
          else if (riskScore < 20) { riskScore = 15; }
        }
      }
    }

    riskScore = Math.min(100, riskScore);

    const urlIntel = detectedUrl ? NulltraceUrlIntel.analyzeUrl(detectedUrl) : {
      url: null, domain: null, isSecure: null,
      suspiciousKeywords: [], usesIpAddress: false,
      isShortened: false, riskSignals: [], riskFlag: 'LOW',
    };

    const actions = {
      CRITICAL: 'STOP — Do not proceed. This is a confirmed threat. Block the sender and report immediately.',
      HIGH: 'Do NOT click any links or share personal info. Verify through official channels only.',
      MEDIUM: 'Exercise caution. Verify the sender\'s identity before taking any action.',
      LOW: 'Content appears safe. Stay vigilant and avoid sharing sensitive information.',
    };

    return {
      threat: {
        scamType: riskLevel === 'LOW' ? 'Safe' : riskLevel === 'MEDIUM' ? 'Suspicious' : 'Phishing',
        riskLevel,
        riskScore,
        intent: riskLevel !== 'LOW' ? 'Possible social engineering or fraud attempt' : 'None detected',
        emotion: lower.includes('urgent') || lower.includes('immediately') ? 'urgency' : 'none',
        summary: indicators.length > 0
          ? `Found ${indicators.length} suspicious indicator(s). ${riskLevel !== 'LOW' ? 'This content shows patterns consistent with online scams.' : 'Exercise caution.'}`
          : 'No significant threat patterns detected in the selected content.',
        indicators,
        riskyParts: [...new Set(riskyParts)],
        recommendedAction: actions[riskLevel],
      },
      urlIntel,
      _fallback: true,
    };
  }

  // ─── Public API Functions ─────────────────────────────────────────────────

  /**
   * Analyze selected text — core function called by selection handler
   */
  async function analyzeSelection({ text, pageUrl, pageTitle, platform, detectedUrl }) {
    // Try direct Groq first
    try {
      const userPrompt = `Analyze for cybersecurity threats:

SELECTED TEXT:
"""
${text.slice(0, 3000)}
"""
${detectedUrl ? `\nDETECTED URL: ${detectedUrl}` : ''}
${pageUrl ? `PAGE URL: ${pageUrl}` : ''}
${pageTitle ? `PAGE TITLE: ${pageTitle}` : ''}
${platform ? `PLATFORM: ${platform}` : ''}

Return JSON only.`;

      const result = await groqChat(SECURITY_SYSTEM_PROMPT, userPrompt);

      // Merge URL intel from client-side analysis if URL was detected
      if (detectedUrl && (!result.urlIntel?.url)) {
        result.urlIntel = NulltraceUrlIntel.analyzeUrl(detectedUrl);
      }

      result.evidence = {
        selectedText: text.slice(0, 1000),
        detectedUrl: detectedUrl || null,
        pageUrl: pageUrl || null,
        pageTitle: pageTitle || null,
        timestamp: new Date().toISOString(),
        platform: platform || 'unknown',
        source: 'groq-direct',
      };

      return result;

    } catch (err) {
      if (err.message === 'NO_API_KEY' || err.message === 'INVALID_API_KEY') {
        // Try backend fallback
        try {
          return await backendFallback('/api/analyze-selection', { text, pageUrl, pageTitle, platform, detectedUrl });
        } catch {
          // Last resort: keyword analysis
          const result = keywordFallback(text, detectedUrl);
          result.evidence = {
            selectedText: text.slice(0, 1000),
            detectedUrl: detectedUrl || null,
            pageUrl: pageUrl || null,
            pageTitle: pageTitle || null,
            timestamp: new Date().toISOString(),
            platform: platform || 'unknown',
            source: 'fallback',
          };
          result._noApiKey = err.message === 'NO_API_KEY';
          return result;
        }
      }
      throw err;
    }
  }

  /**
   * Analyze a URL — combines client heuristics + Groq AI
   */
  async function analyzeUrl({ url, context }) {
    const urlIntel = NulltraceUrlIntel.analyzeUrl(url);

    try {
      const userPrompt = `Analyze this URL for cybersecurity threats:

URL: ${url}
Domain: ${urlIntel.domain}
Protocol: ${urlIntel.protocol}
Risk Signals: ${urlIntel.riskSignals.join('; ') || 'None'}
Suspicious Keywords: ${urlIntel.suspiciousKeywords.join(', ') || 'None'}
Uses IP: ${urlIntel.usesIpAddress}
Is Shortened: ${urlIntel.isShortened}
${context ? `Context: ${context}` : ''}

Return JSON with "threat" and "urlIntel" fields only.`;

      const result = await groqChat(SECURITY_SYSTEM_PROMPT, userPrompt);
      result.urlIntel = result.urlIntel || urlIntel;
      result.redirectChain = { chain: [url], finalUrl: url, suspiciousRedirects: false };
      return result;

    } catch (err) {
      if (err.message === 'NO_API_KEY' || err.message === 'INVALID_API_KEY') {
        try {
          return await backendFallback('/api/analyze-url', { url, context });
        } catch {
          const riskScore = Math.min(urlIntel.riskSignals.length * 20, 90);
          return {
            urlIntel,
            redirectChain: { chain: [url], finalUrl: url, suspiciousRedirects: false },
            threat: {
              scamType: urlIntel.riskFlag === 'HIGH' ? 'Suspicious URL' : 'Safe',
              riskLevel: urlIntel.riskFlag,
              riskScore,
              intent: urlIntel.riskFlag !== 'LOW' ? 'Possible phishing' : 'None',
              emotion: 'none',
              summary: `URL heuristic analysis: ${urlIntel.riskSignals.length} risk signal(s) detected.`,
              indicators: urlIntel.riskSignals,
              riskyParts: urlIntel.suspiciousKeywords,
              recommendedAction: urlIntel.riskFlag === 'HIGH' ? 'Do not visit this URL.' : 'Proceed with caution.',
            },
            _fallback: true,
          };
        }
      }
      throw err;
    }
  }

  /**
   * Analyze a full page
   */
  async function analyzePage({ title, text, links, pageUrl }) {
    try {
      return await backendFallback('/api/analyze-page', { title, text, links, pageUrl });
    } catch {
      const result = await analyzeSelection({
        text: `${title}\n\n${text.slice(0, 2000)}`,
        pageUrl,
        pageTitle: title,
        platform: 'general',
      });
      return { ...result, pageSummary: `Page: ${title}`, suspiciousLinks: [] };
    }
  }

  /**
   * Generate complaint report
   */
  async function generateComplaint({ threat, evidence, platform }) {
    const COMPLAINT_PROMPT = `You are a cybercrime complaint drafting assistant. Generate a professional complaint.
Return ONLY JSON:
{
  "title": "Brief complaint title",
  "incidentSummary": "2-3 sentence summary",
  "body": "Full professional complaint text in first person",
  "evidenceSnapshot": "Formatted evidence list"
}`;

    try {
      const result = await groqChat(COMPLAINT_PROMPT, `Generate complaint for:
Scam Type: ${threat.scamType}
Risk Level: ${threat.riskLevel} (Score: ${threat.riskScore}/100)
Summary: ${threat.summary}
URL: ${evidence.detectedUrl || 'None'}
Page: ${evidence.pageUrl || 'Unknown'}
Timestamp: ${evidence.timestamp}
Platform: ${platform || 'Unknown'}

JSON only.`);

      return {
        complaint: {
          ...result,
          reportLinks: [
            { label: 'Indian Cybercrime Portal', url: 'https://cybercrime.gov.in' },
            { label: 'CERT-In Report', url: 'https://www.cert-in.org.in' },
          ],
        },
      };
    } catch {
      try {
        return await backendFallback('/api/generate-complaint', { threat, evidence, platform });
      } catch {
        return {
          complaint: {
            title: `Report of ${threat.scamType}`,
            incidentSummary: threat.summary,
            body: `I wish to report a ${threat.scamType} incident detected on ${evidence.pageUrl || 'an unknown page'} at ${evidence.timestamp}.\n\n${threat.summary}\n\nIndicators found:\n${threat.indicators?.map(i => `• ${i}`).join('\n')}`,
            evidenceSnapshot: `URL: ${evidence.detectedUrl || 'None'}\nPage: ${evidence.pageUrl}\nTime: ${evidence.timestamp}`,
            reportLinks: [{ label: 'Indian Cybercrime Portal', url: 'https://cybercrime.gov.in' }],
          },
        };
      }
    }
  }

  // ─── Backend fallback ─────────────────────────────────────────────────────

  async function backendFallback(endpoint, body) {
    const base = await getBackendUrl();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(`${base}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify(body),
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`Backend ${res.status}`);
      return await res.json();
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  /**
   * Check if Groq API key is configured and valid
   */
  async function checkApiKey() {
    const key = await getGroqKey();
    if (!key || key.length < 10) return { valid: false, reason: 'not_set' };
    try {
      const res = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key.trim()}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (res.status === 401) return { valid: false, reason: 'invalid_key' };
      return { valid: true };
    } catch {
      return { valid: false, reason: 'network_error' };
    }
  }

  return {
    analyzeSelection,
    analyzeUrl,
    analyzePage,
    generateComplaint,
    checkApiKey,
  };
})();

if (typeof window !== 'undefined') {
  window.NulltraceApi = NulltraceApi;
}
