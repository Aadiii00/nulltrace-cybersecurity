// Nulltrace Sentinel — Background Service Worker
// Handles context menus, message routing, and tab management

const BACKEND_BASE = 'http://localhost:3000';

// ─── Context Menu Setup ───────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  // Remove any existing context menus to avoid duplicates on reload
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'nulltrace-scan-text',
      title: '🛡️ Scan selected text with Nulltrace',
      contexts: ['selection'],
    });

    chrome.contextMenus.create({
      id: 'nulltrace-scan-link',
      title: '🔗 Analyze this link with Nulltrace',
      contexts: ['link'],
    });

    chrome.contextMenus.create({
      id: 'nulltrace-scan-page',
      title: '🔍 Scan this page for threats',
      contexts: ['page'],
    });

    chrome.contextMenus.create({
      id: 'nulltrace-capture-evidence',
      title: '📸 Capture page evidence',
      contexts: ['page', 'selection'],
    });
  });

  console.log('[Nulltrace] Extension installed. Context menus registered.');
});

// ─── Context Menu Click Handler ───────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;

  switch (info.menuItemId) {
    case 'nulltrace-scan-text':
      if (info.selectionText) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'NULLTRACE_SCAN_TEXT',
          payload: {
            text: info.selectionText,
            source: 'context-menu',
          },
        });
      }
      break;

    case 'nulltrace-scan-link':
      if (info.linkUrl) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'NULLTRACE_SCAN_URL',
          payload: {
            url: info.linkUrl,
            source: 'context-menu',
          },
        });
      }
      break;

    case 'nulltrace-scan-page':
      chrome.tabs.sendMessage(tab.id, {
        type: 'NULLTRACE_SCAN_PAGE',
        payload: { source: 'context-menu' },
      });
      break;

    case 'nulltrace-capture-evidence':
      chrome.tabs.sendMessage(tab.id, {
        type: 'NULLTRACE_CAPTURE_EVIDENCE',
        payload: {
          text: info.selectionText || null,
          source: 'context-menu',
        },
      });
      break;
  }
});

// ─── Message Handler (from content scripts / popup) ──────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  switch (message.type) {
    // Popup requests a page scan on the active tab
    case 'POPUP_SCAN_PAGE':
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab?.id) {
          chrome.tabs.sendMessage(activeTab.id, {
            type: 'NULLTRACE_SCAN_PAGE',
            payload: { source: 'popup' },
          });
        }
      });
      sendResponse({ success: true });
      break;

    // Get recent scans for popup display
    case 'GET_RECENT_SCANS':
      chrome.storage.local.get(['nulltrace_scans'], (result) => {
        const scans = result.nulltrace_scans || [];
        sendResponse({ scans: scans.slice(-5).reverse() });
      });
      return true; // async

    // Save a new scan result
    case 'SAVE_SCAN':
      chrome.storage.local.get(['nulltrace_scans', 'nulltrace_settings'], (store) => {
        const scans = store.nulltrace_scans || [];
        const settings = store.nulltrace_settings || {};
        const backendUrl = settings.backendUrl || 'http://localhost:3000';

        const payload = message.payload;
        scans.push({
          ...payload,
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
        });

        // Keep last 50 scans
        const trimmed = scans.slice(-50);
        chrome.storage.local.set({ nulltrace_scans: trimmed }, () => {
          sendResponse({ success: true });
        });

        // Map and send to Next.js backend database (Supabase via API)
        const dbType = payload.detectedUrl ? 'url' : 'message';
        const inputContent = payload.detectedUrl || payload.selectedText || 'Selected text';
        const trustScore = Math.max(0, 100 - (payload.riskScore || 0));
        const riskLevelLower = (payload.riskLevel || 'low').toLowerCase();

        let intentVal = 'unknown';
        const scamLower = (payload.scamType || '').toLowerCase();
        if (scamLower.includes('safe') || scamLower === 'none') {
          intentVal = 'legit';
        } else if (scamLower !== 'unknown' && scamLower !== '') {
          intentVal = 'scam';
        }

        const dbRecord = {
          type: dbType,
          input: inputContent.substring(0, 5000),
          trust_score: trustScore,
          risk_level: riskLevelLower,
          analysis: payload.summary || 'Scan complete.',
          intent: intentVal,
          emotion: payload.emotion || 'none',
          patterns: payload.indicators || [payload.scamType || 'Unknown'],
          risky_parts: payload.riskyParts || [],
          user_id: null
        };

        console.log('[Nulltrace Service Worker] Sending scan to Next.js API:', backendUrl);
        fetch(`${backendUrl}/api/scans`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dbRecord),
        })
        .then((res) => {
          if (!res.ok) console.warn('[Nulltrace Service Worker] Failed to save scan to backend db:', res.status);
          else console.log('[Nulltrace Service Worker] Saved scan to backend database successfully');
        })
        .catch((err) => {
          console.warn('[Nulltrace Service Worker] Backend sync error:', err.message);
        });
      });
      return true; // async

    // Capture screenshot of visible tab
    case 'CAPTURE_SCREENSHOT':
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab?.windowId) {
          chrome.tabs.captureVisibleTab(activeTab.windowId, { format: 'png' }, (dataUrl) => {
            if (chrome.runtime.lastError) {
              sendResponse({ error: chrome.runtime.lastError.message });
            } else {
              sendResponse({ screenshot: dataUrl });
            }
          });
        } else {
          sendResponse({ error: 'No active tab found' });
        }
      });
      return true; // async

    // Get current settings
    case 'GET_SETTINGS':
      chrome.storage.sync.get(['nulltrace_settings'], (result) => {
        sendResponse({ settings: result.nulltrace_settings || getDefaultSettings() });
      });
      return true;

    // Save settings
    case 'SAVE_SETTINGS':
      chrome.storage.sync.set({ nulltrace_settings: message.payload }, () => {
        sendResponse({ success: true });
      });
      return true;

    // Forward scan URL to active tab
    case 'SCAN_URL_FROM_POPUP':
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab?.id) {
          chrome.tabs.sendMessage(activeTab.id, {
            type: 'NULLTRACE_SCAN_URL',
            payload: { url: message.payload.url, source: 'popup' },
          });
        }
      });
      sendResponse({ success: true });
      break;

    default:
      break;
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDefaultSettings() {
  return {
    autoScan: true,
    minSelectionLength: 5,
    showPanelAuto: true,
    enablePageHeuristics: true,
    backendUrl: 'http://localhost:3000',
  };
}

console.log('[Nulltrace] Service worker initialized.');

// ─── Listen to Tab Navigation/URL Changes ─────────────────────────────────────
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.active) {
    chrome.tabs.sendMessage(tabId, {
      type: 'NULLTRACE_URL_CHANGED',
      payload: { url: changeInfo.url }
    }).catch(() => {}); // ignore error if tab is not loaded yet
  }
});
