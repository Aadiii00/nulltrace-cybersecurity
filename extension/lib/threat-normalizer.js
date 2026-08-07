// Nulltrace Sentinel — Threat Normalizer
// Parses, validates, and normalizes AI responses into consistent threat objects

const NulltraceNormalizer = (() => {
  const VALID_RISK_LEVELS = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
  const VALID_RISK_FLAGS = new Set(['LOW', 'MEDIUM', 'HIGH']);

  const DEFAULT_THREAT = {
    scamType: 'Unknown',
    riskLevel: 'LOW',
    riskScore: 0,
    intent: 'Unknown',
    emotion: 'none',
    summary: 'Analysis complete.',
    indicators: [],
    riskyParts: [],
    recommendedAction: 'No action required.',
  };

  const DEFAULT_URL_INTEL = {
    url: null,
    domain: null,
    isSecure: null,
    suspiciousKeywords: [],
    usesIpAddress: false,
    isShortened: false,
    riskSignals: [],
    riskFlag: 'LOW',
  };

  const DEFAULT_REDIRECT_CHAIN = {
    chain: [],
    finalUrl: null,
    suspiciousRedirects: false,
  };

  /**
   * Normalize a threat object from AI response
   */
  function normalizeThreat(raw) {
    if (!raw || typeof raw !== 'object') return { ...DEFAULT_THREAT };

    return {
      scamType: typeof raw.scamType === 'string' ? raw.scamType : DEFAULT_THREAT.scamType,
      riskLevel: VALID_RISK_LEVELS.has(raw.riskLevel) ? raw.riskLevel : DEFAULT_THREAT.riskLevel,
      riskScore: typeof raw.riskScore === 'number'
        ? Math.max(0, Math.min(100, Math.round(raw.riskScore)))
        : DEFAULT_THREAT.riskScore,
      intent: typeof raw.intent === 'string' ? raw.intent : DEFAULT_THREAT.intent,
      emotion: typeof raw.emotion === 'string' ? raw.emotion : DEFAULT_THREAT.emotion,
      summary: typeof raw.summary === 'string' ? raw.summary : DEFAULT_THREAT.summary,
      indicators: Array.isArray(raw.indicators) ? raw.indicators.filter(i => typeof i === 'string') : [],
      riskyParts: Array.isArray(raw.riskyParts) ? raw.riskyParts.filter(i => typeof i === 'string') : [],
      recommendedAction: typeof raw.recommendedAction === 'string'
        ? raw.recommendedAction
        : DEFAULT_THREAT.recommendedAction,
    };
  }

  /**
   * Normalize URL intelligence object
   */
  function normalizeUrlIntel(raw) {
    if (!raw || typeof raw !== 'object') return { ...DEFAULT_URL_INTEL };

    return {
      url: raw.url || null,
      domain: raw.domain || null,
      protocol: raw.protocol || 'unknown',
      isSecure: typeof raw.isSecure === 'boolean' ? raw.isSecure : null,
      suspiciousKeywords: Array.isArray(raw.suspiciousKeywords) ? raw.suspiciousKeywords : [],
      usesIpAddress: !!raw.usesIpAddress,
      isShortened: !!raw.isShortened,
      subdomainDepth: typeof raw.subdomainDepth === 'number' ? raw.subdomainDepth : 0,
      suspiciousTld: !!raw.suspiciousTld,
      riskSignals: Array.isArray(raw.riskSignals) ? raw.riskSignals : [],
      riskFlag: VALID_RISK_FLAGS.has(raw.riskFlag) ? raw.riskFlag : 'LOW',
    };
  }

  /**
   * Normalize redirect chain
   */
  function normalizeRedirectChain(raw) {
    if (!raw || typeof raw !== 'object') return { ...DEFAULT_REDIRECT_CHAIN };

    return {
      chain: Array.isArray(raw.chain) ? raw.chain : [],
      finalUrl: raw.finalUrl || null,
      suspiciousRedirects: !!raw.suspiciousRedirects,
      error: raw.error || null,
    };
  }

  /**
   * Normalize full API response
   */
  function normalizeApiResponse(response) {
    if (!response || typeof response !== 'object') {
      return {
        threat: { ...DEFAULT_THREAT },
        urlIntel: { ...DEFAULT_URL_INTEL },
        redirectChain: { ...DEFAULT_REDIRECT_CHAIN },
        evidence: null,
        error: null,
      };
    }

    return {
      threat: normalizeThreat(response.threat),
      urlIntel: normalizeUrlIntel(response.urlIntel),
      redirectChain: normalizeRedirectChain(response.redirectChain),
      evidence: response.evidence || null,
      pageSummary: response.pageSummary || null,
      suspiciousLinks: Array.isArray(response.suspiciousLinks) ? response.suspiciousLinks : [],
      complaint: response.complaint || null,
      error: response.error || null,
    };
  }

  /**
   * Get risk color class for UI
   */
  function getRiskColor(riskLevel) {
    switch (riskLevel) {
      case 'CRITICAL': return '#ff2d2d';
      case 'HIGH': return '#ff6b00';
      case 'MEDIUM': return '#f0c400';
      case 'LOW': return '#00e676';
      default: return '#888';
    }
  }

  /**
   * Get risk emoji
   */
  function getRiskEmoji(riskLevel) {
    switch (riskLevel) {
      case 'CRITICAL': return '🔴';
      case 'HIGH': return '🟠';
      case 'MEDIUM': return '🟡';
      case 'LOW': return '🟢';
      default: return '⚪';
    }
  }

  /**
   * Format a scan result for display (plain text)
   */
  function formatAsText(result) {
    const { threat, urlIntel, evidence } = result;
    const lines = [
      `NULLTRACE SCAN REPORT`,
      `===============================`,
      `Generated: ${new Date().toLocaleString()}`,
      ``,
      `THREAT ASSESSMENT`,
      `-----------------`,
      `Type: ${threat.scamType}`,
      `Risk Level: ${threat.riskLevel} (Score: ${threat.riskScore}/100)`,
      `Intent: ${threat.intent}`,
      `Emotion Used: ${threat.emotion}`,
      ``,
      `Summary: ${threat.summary}`,
      ``,
      `Indicators:`,
      ...threat.indicators.map(i => `  • ${i}`),
      ``,
      `Recommended Action: ${threat.recommendedAction}`,
    ];

    if (urlIntel?.url) {
      lines.push(
        ``,
        `URL INTELLIGENCE`,
        `----------------`,
        `URL: ${urlIntel.url}`,
        `Domain: ${urlIntel.domain}`,
        `Protocol: ${urlIntel.protocol?.toUpperCase()}`,
        `Secure: ${urlIntel.isSecure ? 'Yes' : 'No'}`,
        `Risk Flag: ${urlIntel.riskFlag}`,
        `Risk Signals:`,
        ...urlIntel.riskSignals.map(s => `  • ${s}`),
      );
    }

    if (evidence) {
      lines.push(
        ``,
        `EVIDENCE`,
        `--------`,
        `Page: ${evidence.pageUrl || 'Unknown'}`,
        `Title: ${evidence.pageTitle || 'Unknown'}`,
        `Time: ${evidence.timestamp || 'Unknown'}`,
      );
    }

    return lines.join('\n');
  }

  return {
    normalizeThreat,
    normalizeUrlIntel,
    normalizeRedirectChain,
    normalizeApiResponse,
    getRiskColor,
    getRiskEmoji,
    formatAsText,
  };
})();

if (typeof window !== 'undefined') {
  window.NulltraceNormalizer = NulltraceNormalizer;
}
