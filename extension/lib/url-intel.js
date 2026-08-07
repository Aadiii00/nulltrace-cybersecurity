// Nulltrace Sentinel — URL Intelligence Module
// Client-side URL heuristic analysis (no network required)

const NulltraceUrlIntel = (() => {
  const SHORTENERS = new Set([
    'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'buff.ly',
    'short.link', 'rebrand.ly', 'cutt.ly', 'rb.gy', 'is.gd', 'v.gd',
    'tiny.cc', 'lnkd.in', 'fb.me', 'wa.me', 'url.ie', 'soo.gd',
    'bc.vc', 'q.gs', 'po.st', 'sdmlinks.in',
  ]);

  const SUSPICIOUS_TLDS = new Set([
    'xyz', 'tk', 'ml', 'ga', 'cf', 'gq', 'top', 'loan',
    'click', 'download', 'work', 'review', 'country', 'stream',
    'racing', 'trade', 'webcam', 'party', 'science', 'cricket',
  ]);

  const SUSPICIOUS_KEYWORDS = [
    'login', 'signin', 'verify', 'update', 'secure', 'bank', 'otp',
    'prize', 'gift', 'account', 'password', 'credential', 'confirm',
    'auth', 'wallet', 'kyc', 'claim', 'free', 'bonus', 'reward',
    'alert', 'suspend', 'lock', 'recover', 'reset', 'support',
    'helpdesk', 'urgent', 'limited', 'exclusive', 'winner',
  ];

  const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;

  /**
   * Extract all URLs from a text string
   * @param {string} text
   * @returns {string[]}
   */
  function extractUrls(text) {
    const urlRegex = /https?:\/\/[^\s"'<>()]+|www\.[^\s"'<>()]+\.[a-z]{2,}/gi;
    return [...new Set((text.match(urlRegex) || []))];
  }

  /**
   * Analyze a single URL for risk signals
   * @param {string} rawUrl
   * @returns {object}
   */
  function analyzeUrl(rawUrl) {
    let url = rawUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    let domain = null;
    let protocol = 'unknown';
    let isSecure = false;
    let subdomainDepth = 0;
    let path = '';

    try {
      const parsed = new URL(url);
      domain = parsed.hostname;
      protocol = parsed.protocol.replace(':', '');
      isSecure = protocol === 'https';
      subdomainDepth = Math.max(0, domain.split('.').length - 2);
      path = parsed.pathname + parsed.search;
    } catch {
      return {
        url: rawUrl,
        domain: null,
        isSecure: false,
        suspiciousKeywords: [],
        usesIpAddress: false,
        isShortened: false,
        riskSignals: ['Malformed URL — could not parse'],
        riskFlag: 'MEDIUM',
      };
    }

    const riskSignals = [];
    const suspiciousKeywords = [];

    // Protocol check
    if (!isSecure) {
      riskSignals.push('Insecure HTTP connection (no encryption)');
    }

    // IP address check
    const usesIpAddress = IP_REGEX.test(domain);
    if (usesIpAddress) {
      riskSignals.push('URL uses raw IP address — legitimate sites use domain names');
    }

    // Shortener check
    const isShortened = SHORTENERS.has(domain.toLowerCase());
    if (isShortened) {
      riskSignals.push('URL shortener detected — actual destination is hidden');
    }

    // TLD check
    const tld = domain.split('.').pop().toLowerCase();
    const suspiciousTld = SUSPICIOUS_TLDS.has(tld);
    if (suspiciousTld) {
      riskSignals.push(`High-risk domain extension (.${tld}) commonly used in scams`);
    }

    // Keyword check in URL + path
    const fullUrlLower = (url + path).toLowerCase();
    for (const kw of SUSPICIOUS_KEYWORDS) {
      if (fullUrlLower.includes(kw)) {
        suspiciousKeywords.push(kw);
      }
    }
    if (suspiciousKeywords.length > 0) {
      riskSignals.push(`Suspicious keywords in URL: ${suspiciousKeywords.join(', ')}`);
    }

    // Subdomain depth check
    if (subdomainDepth >= 3) {
      riskSignals.push(`Unusually deep subdomain (${subdomainDepth} levels) — may be spoofing a legit domain`);
    }

    // @ trick in URL
    if (rawUrl.includes('@')) {
      riskSignals.push("URL contains '@' — classic phishing obfuscation technique");
    }

    // Punycode / homograph attack
    if (domain.includes('xn--')) {
      riskSignals.push('Punycode encoding detected — lookalike domain attack possible');
    }

    // Compute risk flag
    let riskFlag = 'LOW';
    const highRiskCount = (usesIpAddress ? 2 : 0) + (isShortened ? 1 : 0) + suspiciousKeywords.length;
    if (riskSignals.length >= 4 || highRiskCount >= 3 || usesIpAddress) {
      riskFlag = 'HIGH';
    } else if (riskSignals.length >= 1 || suspiciousKeywords.length >= 1) {
      riskFlag = 'MEDIUM';
    }

    return {
      url: rawUrl,
      domain,
      protocol,
      isSecure,
      suspiciousKeywords,
      usesIpAddress,
      isShortened,
      subdomainDepth,
      suspiciousTld,
      riskSignals,
      riskFlag,
    };
  }

  /**
   * Get the primary URL from text (first detected URL)
   * @param {string} text
   * @returns {string|null}
   */
  function getPrimaryUrl(text) {
    const urls = extractUrls(text);
    return urls.length > 0 ? urls[0] : null;
  }

  return { extractUrls, analyzeUrl, getPrimaryUrl };
})();

if (typeof window !== 'undefined') {
  window.NulltraceUrlIntel = NulltraceUrlIntel;
}
