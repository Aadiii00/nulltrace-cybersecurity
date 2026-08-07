// Nulltrace Sentinel — Storage Module
// Wrappers for chrome.storage.local and chrome.storage.sync

const NulltraceStorage = {
  DEFAULT_SETTINGS: {
    autoScan: true,
    minSelectionLength: 5,
    showPanelAuto: true,
    enablePageHeuristics: true,
    backendUrl: 'http://localhost:3000',
    groqApiKey: '',  // Set by user in options page
  },

  // ─── Settings (sync) ─────────────────────────────────────────────────────

  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['nulltrace_settings'], (result) => {
        const settings = { ...NulltraceStorage.DEFAULT_SETTINGS, ...(result.nulltrace_settings || {}) };
        if (settings.backendUrl === 'http://localhost:3003') {
          settings.backendUrl = 'http://localhost:3000';
          chrome.storage.sync.set({ nulltrace_settings: settings });
        }
        resolve(settings);
      });
    });
  },

  async saveSettings(settings) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ nulltrace_settings: settings }, resolve);
    });
  },

  async getGroqKey() {
    const settings = await NulltraceStorage.getSettings();
    return settings.groqApiKey || '';
  },

  // ─── Scan History (local) ─────────────────────────────────────────────────

  async getScanHistory() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['nulltrace_scans'], (result) => {
        resolve(result.nulltrace_scans || []);
      });
    });
  },

  async saveScan(scanResult) {
    const scans = await NulltraceStorage.getScanHistory();
    const newScan = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...scanResult,
    };
    scans.push(newScan);
    const trimmed = scans.slice(-50);
    return new Promise((resolve) => {
      chrome.storage.local.set({ nulltrace_scans: trimmed }, () => resolve(newScan));
    });
  },

  async clearScanHistory() {
    return new Promise((resolve) => {
      chrome.storage.local.remove(['nulltrace_scans'], resolve);
    });
  },

  async getRecentScans(n = 5) {
    const scans = await NulltraceStorage.getScanHistory();
    return scans.slice(-n).reverse();
  },

  // ─── Safe Browsing Shield (local) ─────────────────────────────────────────

  async getUrlCache() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['nulltrace_url_cache'], (result) => {
        resolve(result.nulltrace_url_cache || {});
      });
    });
  },

  async cacheUrl(urlOrDomain, threatResult) {
    const cache = await NulltraceStorage.getUrlCache();
    cache[urlOrDomain] = {
      threatResult,
      timestamp: Date.now()
    };
    return new Promise((resolve) => {
      chrome.storage.local.set({ nulltrace_url_cache: cache }, resolve);
    });
  },

  async getShieldHistory() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['nulltrace_shield_blocked', 'nulltrace_shield_allowed'], (result) => {
        resolve({
          blocked: result.nulltrace_shield_blocked || [],
          allowed: result.nulltrace_shield_allowed || []
        });
      });
    });
  },

  async logShieldUrl(url, threatResult, isBlocked) {
    const history = await NulltraceStorage.getShieldHistory();
    const key = isBlocked ? 'nulltrace_shield_blocked' : 'nulltrace_shield_allowed';
    const list = isBlocked ? history.blocked : history.allowed;
    
    const entry = {
      url,
      threatResult,
      timestamp: new Date().toISOString()
    };
    
    list.push(entry);
    const trimmed = list.slice(-50);
    
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: trimmed }, resolve);
    });
  },
};

if (typeof window !== 'undefined') {
  window.NulltraceStorage = NulltraceStorage;
}
