// Nulltrace Sentinel — Evidence Collector
// Collects, formats, and exports forensic evidence from scans

const NulltraceEvidence = (() => {
  /**
   * Build an evidence object from scan context
   */
  function buildEvidence({
    selectedText = null,
    detectedUrl = null,
    pageUrl = null,
    pageTitle = null,
    platform = 'unknown',
    screenshot = null,
    threatResult = null,
  } = {}) {
    return {
      selectedText: selectedText ? selectedText.slice(0, 2000) : null,
      detectedUrl,
      pageUrl: pageUrl || window.location.href,
      pageTitle: pageTitle || document.title,
      platform,
      timestamp: new Date().toISOString(),
      screenshot,
      threatResult,
    };
  }

  /**
   * Format evidence as a readable JSON string for download
   */
  function toJsonString(evidence) {
    return JSON.stringify(evidence, null, 2);
  }

  /**
   * Trigger a JSON file download of evidence
   */
  function downloadJson(evidence, filename = null) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const name = filename || `nulltrace-evidence-${ts}.json`;
    const blob = new Blob([toJsonString(evidence)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Copy a text report to clipboard
   */
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for restricted contexts
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const success = document.execCommand('copy');
      document.body.removeChild(ta);
      return success;
    }
  }

  /**
   * Request screenshot from background service worker
   * Returns base64 data URL or null on failure
   */
  async function captureScreenshot() {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' }, (response) => {
          if (chrome.runtime.lastError || !response) {
            resolve(null);
          } else {
            resolve(response.screenshot || null);
          }
        });
      } catch {
        resolve(null);
      }
    });
  }

  /**
   * Save evidence to chrome.storage.local
   */
  async function saveToStorage(evidence) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          type: 'SAVE_SCAN',
          payload: {
            scamType: evidence.threatResult?.threat?.scamType || 'Unknown',
            riskLevel: evidence.threatResult?.threat?.riskLevel || 'LOW',
            riskScore: evidence.threatResult?.threat?.riskScore || 0,
            summary: evidence.threatResult?.threat?.summary || '',
            pageUrl: evidence.pageUrl,
            pageTitle: evidence.pageTitle,
            detectedUrl: evidence.detectedUrl,
            selectedText: evidence.selectedText ? evidence.selectedText.slice(0, 1000) : null,
            timestamp: evidence.timestamp,
            platform: evidence.platform,
            emotion: evidence.threatResult?.threat?.emotion || 'none',
            indicators: evidence.threatResult?.threat?.indicators || [],
            riskyParts: evidence.threatResult?.threat?.riskyParts || [],
          },
        },
        (response) => resolve(response)
      );
    });
  }

  /**
   * Build a complaint report payload for the API
   */
  function buildComplaintPayload(threatResult, evidence, platform) {
    return {
      threat: {
        scamType: threatResult.threat?.scamType || 'Unknown',
        riskLevel: threatResult.threat?.riskLevel || 'LOW',
        riskScore: threatResult.threat?.riskScore || 0,
        summary: threatResult.threat?.summary || '',
        indicators: threatResult.threat?.indicators || [],
        recommendedAction: threatResult.threat?.recommendedAction || '',
      },
      evidence: {
        selectedText: evidence.selectedText,
        detectedUrl: evidence.detectedUrl,
        pageUrl: evidence.pageUrl,
        pageTitle: evidence.pageTitle,
        timestamp: evidence.timestamp,
        platform: evidence.platform,
      },
      platform,
    };
  }

  return {
    buildEvidence,
    toJsonString,
    downloadJson,
    copyToClipboard,
    captureScreenshot,
    saveToStorage,
    buildComplaintPayload,
  };
})();

if (typeof window !== 'undefined') {
  window.NulltraceEvidence = NulltraceEvidence;
}
