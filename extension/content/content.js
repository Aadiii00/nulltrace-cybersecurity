// Nulltrace Sentinel — Main Content Script v2
// Robust initialization with full error isolation

(async function initNulltrace() {
  // Guard against double-init (e.g. in SPAs with nav)
  if (window.__nulltraceInitialized) return;
  window.__nulltraceInitialized = true;

  console.log('[Nulltrace] ✅ Content script starting on:', window.location.hostname);

  // ─── Verify all modules loaded ─────────────────────────────────────────────
  const required = [
    'NulltraceStorage', 'NulltraceUrlIntel', 'NulltraceNormalizer',
    'NulltraceEvidence', 'NulltraceApi', 'NulltracePlatform',
    'NulltracePanel', 'NulltraceSelection',
  ];

  const missing = required.filter((name) => !window[name]);
  if (missing.length > 0) {
    console.error('[Nulltrace] ❌ Missing modules:', missing.join(', '));
    console.error('[Nulltrace] This usually means the extension needs to be reloaded.');
    console.error('[Nulltrace] Go to chrome://extensions → find Nulltrace Sentinel → click ↻ reload');
    return;
  }

  console.log('[Nulltrace] All modules loaded ✓');

  // ─── Initialize Selection Handler ─────────────────────────────────────────

  try {
    await NulltraceSelection.init();
    console.log('[Nulltrace] Selection handler initialized ✓');
  } catch (err) {
    console.error('[Nulltrace] Selection handler init error:', err);
  }

  // ─── Log platform ──────────────────────────────────────────────────────────

  try {
    const platform = NulltracePlatform.detect();
    if (platform) {
      console.log(`[Nulltrace] Platform: ${platform.emoji} ${platform.label}`);
    } else {
      console.log('[Nulltrace] Platform: General website');
    }
  } catch (err) {
    console.warn('[Nulltrace] Platform detection error:', err);
  }

  // ─── Message Listener ──────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Must return true for async responses
    handleMessage(message, sendResponse);
    return true;
  });

  // ─── Initialize Safe Browsing Shield ───────────────────────────────────────
  try {
    // Setup click event listener (pre-emptive click scan checking cache)
    document.addEventListener('click', async (e) => {
      const anchor = e.target.closest('a');
      if (!anchor || !anchor.href) return;
      
      const href = anchor.href;
      if (!href.startsWith('http://') && !href.startsWith('https://')) return;
      
      try {
        const urlObj = new URL(href);
        const domain = urlObj.hostname;
        
        const cache = await NulltraceStorage.getUrlCache();
        const cachedEntry = cache[domain] || cache[href];
        
        if (cachedEntry) {
          const { threatResult } = cachedEntry;
          if (threatResult.threat.riskLevel === 'HIGH' || threatResult.threat.riskLevel === 'CRITICAL') {
            e.preventDefault();
            e.stopPropagation();
            
            // Show warning toast for blocked link click
            NulltracePanel.showWarningNotification(href, threatResult);
          }
        }
      } catch (err) {
        console.warn('[Nulltrace Shield] Pre-click check error:', err);
      }
    }, { capture: true });

    // Monkeypatch window.open
    const originalWindowOpen = window.open;
    window.open = function(url, target, features) {
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        NulltraceStorage.getUrlCache().then((cache) => {
          let domain = 'unknown';
          try { domain = new URL(url).hostname; } catch (e) {}
          const cachedEntry = cache[domain] || cache[url];
          
          if (cachedEntry && (cachedEntry.threatResult.threat.riskLevel === 'HIGH' || cachedEntry.threatResult.threat.riskLevel === 'CRITICAL')) {
            console.warn('[Nulltrace Shield] Blocked window.open to:', url);
            // Notify them in a toast instead of popup window
            NulltracePanel.showWarningNotification(url, cachedEntry.threatResult);
          } else {
            originalWindowOpen(url, target, features);
          }
        }).catch(() => {
          originalWindowOpen(url, target, features);
        });
        return null;
      }
      return originalWindowOpen(url, target, features);
    };

    // Run active scan/check for the current page
    runSafeBrowsingShield();
  } catch (err) {
    console.error('[Nulltrace Shield] Shield setup error:', err);
  }

  console.log('[Nulltrace] ✅ Ready! Select any text on this page to scan it.');
})();

// ─── Message Handler ──────────────────────────────────────────────────────────

async function handleMessage(message, sendResponse) {
  console.log('[Nulltrace] Message received:', message.type);

  try {
    switch (message.type) {

      case 'NULLTRACE_URL_CHANGED': {
        runSafeBrowsingShield();
        sendResponse({ success: true });
        break;
      }

      case 'NULLTRACE_SHOW_VOICE_RESULT': {
        const { result } = message.payload || {};
        if (!result) { sendResponse({ error: 'No result provided' }); break; }
        NulltracePanel.setVoiceResult(result);
        sendResponse({ success: true });
        break;
      }

      case 'NULLTRACE_SET_VOICE_LOADING': {
        NulltracePanel.setLoading(true);
        sendResponse({ success: true });
        break;
      }

      case 'NULLTRACE_SCAN_TEXT': {
        const { text, source } = message.payload || {};
        if (!text) { sendResponse({ error: 'No text provided' }); break; }
        NulltraceSelection.triggerScan(text, source || 'background');
        sendResponse({ success: true });
        break;
      }

      case 'NULLTRACE_SCAN_URL': {
        const { url } = message.payload || {};
        if (!url) { sendResponse({ error: 'No URL provided' }); break; }
        scanUrl(url);
        sendResponse({ success: true });
        break;
      }

      case 'NULLTRACE_SCAN_PAGE': {
        scanPage();
        sendResponse({ success: true });
        break;
      }

      case 'NULLTRACE_CAPTURE_EVIDENCE': {
        const { text } = message.payload || {};
        const evidence = NulltraceEvidence.buildEvidence({
          selectedText: text || null,
          pageUrl: window.location.href,
          pageTitle: document.title,
          platform: NulltracePlatform.getPlatformId(),
        });
        const screenshot = await NulltraceEvidence.captureScreenshot();
        evidence.screenshot = screenshot;
        NulltraceEvidence.downloadJson(evidence, `nulltrace-evidence-${Date.now()}.json`);
        sendResponse({ success: true });
        break;
      }

      case 'NULLTRACE_TOGGLE_AUTO_SCAN': {
        const { enabled } = message.payload || {};
        NulltraceSelection.setEnabled(!!enabled);
        sendResponse({ success: true });
        break;
      }

      case 'PING':
        sendResponse({
          alive: true,
          platform: NulltracePlatform.getPlatformId(),
          initialized: !!window.__nulltraceInitialized,
        });
        break;

      default:
        sendResponse({ error: `Unknown: ${message.type}` });
    }
  } catch (err) {
    console.error('[Nulltrace] Message error:', err);
    sendResponse({ error: String(err.message) });
  }
}

// ─── URL Scan (called from context menu / popup) ───────────────────────────────

async function scanUrl(url) {
  console.log('[Nulltrace] Scanning URL:', url);
  NulltracePanel.setLoading(true);

  const evidence = {
    detectedUrl: url,
    pageUrl: window.location.href,
    pageTitle: document.title,
    platform: NulltracePlatform.getPlatformId(),
    timestamp: new Date().toISOString(),
  };

  try {
    const result = await NulltraceApi.analyzeUrl({ url, context: document.title });
    const normalized = NulltraceNormalizer.normalizeApiResponse(result);
    evidence.threatResult = normalized;
    NulltraceEvidence.saveToStorage(evidence);
    NulltracePanel.setResult(normalized, evidence);
  } catch (err) {
    console.error('[Nulltrace] URL scan error:', err);
    NulltracePanel.setError(`URL analysis failed: ${err.message}`);
  }
}

// ─── Page Scan (called from context menu / popup) ─────────────────────────────

async function scanPage() {
  console.log('[Nulltrace] Scanning full page:', window.location.href);
  NulltracePanel.setLoading(true);

  const evidence = {
    pageUrl: window.location.href,
    pageTitle: document.title,
    platform: NulltracePlatform.getPlatformId(),
    timestamp: new Date().toISOString(),
  };

  try {
    // Extract readable text (strip scripts/hidden)
    let pageText = '';
    try {
      const clone = document.body.cloneNode(true);
      clone.querySelectorAll('script,style,noscript,[hidden]').forEach(e => e.remove());
      pageText = (clone.innerText || clone.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 4000);
    } catch { pageText = document.title; }

    // Extract links
    let links = [];
    try {
      links = Array.from(document.querySelectorAll('a[href]'))
        .map(a => { try { return new URL(a.href).href; } catch { return null; } })
        .filter(h => h && h.startsWith('http'))
        .filter((h, i, arr) => arr.indexOf(h) === i)
        .slice(0, 40);
    } catch { /* ignore */ }

    // Try platform-specific content
    let text = pageText;
    try {
      const platformContent = NulltracePlatform.extractPlatformContent();
      if (platformContent?.content) text = platformContent.content;
    } catch { /* ignore */ }

    const result = await NulltraceApi.analyzePage({
      title: document.title,
      text,
      links,
      pageUrl: window.location.href,
    });

    const normalized = NulltraceNormalizer.normalizeApiResponse(result);
    evidence.threatResult = normalized;
    NulltraceEvidence.saveToStorage(evidence);
    NulltracePanel.setResult(normalized, evidence);

  } catch (err) {
    console.error('[Nulltrace] Page scan error:', err);
    NulltracePanel.setError(`Page scan failed: ${err.message}`);
  }
}

// ─── Real-Time Safe Browsing Shield ──────────────────────────────────────────

async function runSafeBrowsingShield() {
  const currentUrl = window.location.href;
  
  if (
    currentUrl.startsWith('chrome-extension://') || 
    currentUrl.includes('localhost:3000') || 
    currentUrl.includes('localhost:3001') || 
    currentUrl.includes('localhost:3003') ||
    currentUrl.includes('127.0.0.1')
  ) {
    return;
  }
  
  let domain = 'unknown';
  try {
    const urlObj = new URL(currentUrl);
    domain = urlObj.hostname;
  } catch (e) {
    return;
  }
  
  try {
    // Check cache first
    const cache = await NulltraceStorage.getUrlCache();
    const cachedEntry = cache[domain] || cache[currentUrl];
    
    if (cachedEntry) {
      const { threatResult, timestamp } = cachedEntry;
      // Cache valid for 24 hours (86,400,000 ms)
      if (Date.now() - timestamp < 86400000) {
        const risk = threatResult.threat.riskLevel;
        if (risk === 'HIGH' || risk === 'CRITICAL') {
          blockPageAccess(currentUrl, threatResult);
          return;
        } else if (risk === 'MEDIUM') {
          NulltracePanel.setResult(threatResult);
          return;
        } else {
          return; // low risk, do nothing
        }
      }
    }
    
    // Quick whitelist of highly trusted domains to avoid unnecessary API consumption
    const whitelist = [
      'google.com', 'google.co.in', 'bing.com', 'yahoo.com', 'duckduckgo.com', 
      'github.com', 'stackoverflow.com', 'youtube.com', 'wikipedia.org', 
      'twitter.com', 'linkedin.com', 'facebook.com', 'instagram.com', 
      'microsoft.com', 'apple.com', 'amazon.com', 'amazon.in'
    ];
    
    if (whitelist.some(d => domain === d || domain.endsWith('.' + d))) {
      const safeResult = {
        threat: {
          scamType: 'Safe',
          riskLevel: 'LOW',
          riskScore: 0,
          intent: 'None',
          summary: 'Domain whitelisted as highly trusted.',
          indicators: [],
          riskyParts: [],
          recommendedAction: 'Proceed normally.'
        }
      };
      await NulltraceStorage.cacheUrl(domain, safeResult);
      return;
    }
    
    // Run live URL analysis
    const result = await NulltraceApi.analyzeUrl({ url: currentUrl, context: document.title });
    const normalized = NulltraceNormalizer.normalizeApiResponse(result);
    
    // Save to Cache
    await NulltraceStorage.cacheUrl(domain, normalized);
    
    const risk = normalized.threat.riskLevel;
    if (risk === 'HIGH' || risk === 'CRITICAL') {
      // Log blocked threat
      await NulltraceStorage.logShieldUrl(currentUrl, normalized, true);
      blockPageAccess(currentUrl, normalized);
    } else if (risk === 'MEDIUM') {
      NulltracePanel.setResult(normalized);
    } else {
      // Safe website notification
      await NulltraceStorage.logShieldUrl(currentUrl, normalized, false);
      NulltracePanel.showSafeNotification();
    }
  } catch (err) {
    console.warn('[Nulltrace Shield] Analysis error:', err);
  }
}

function blockPageAccess(url, result, onContinue = null) {
  // Show a warning notification toast instead of a blocking popup window
  NulltracePanel.showWarningNotification(url, result);
}
