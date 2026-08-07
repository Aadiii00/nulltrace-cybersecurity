// Nulltrace Sentinel — Popup Script v2

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

const RISK_COLORS = {
  LOW: '#00e676',
  MEDIUM: '#f0c400',
  HIGH: '#ff6b00',
  CRITICAL: '#ff2d2d',
};

document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([
    initSettings(),
    loadHistory('scans'),
    detectPlatform(),
    checkStatus(),
  ]);
  attachListeners();
});

// ─── Settings ─────────────────────────────────────────────────────────────

async function initSettings() {
  const settings = await getSettings();
  const toggle = document.getElementById('autoscan-toggle');
  if (toggle) toggle.checked = settings.autoScan !== false;
}

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['nulltrace_settings'], (result) => {
      resolve({
        autoScan: true,
        minSelectionLength: 5,
        showPanelAuto: true,
        backendUrl: 'http://localhost:3000',
        groqApiKey: '',
        ...(result.nulltrace_settings || {}),
      });
    });
  });
}

async function saveSettings(partial) {
  const current = await getSettings();
  const updated = { ...current, ...partial };
  await new Promise((r) => chrome.storage.sync.set({ nulltrace_settings: updated }, r));
}

// ─── Status Check (Groq key OR backend) ───────────────────────────────────

async function checkStatus() {
  const dot = document.getElementById('status-indicator');
  if (!dot) return;

  dot.className = 'status-dot status-checking';
  dot.title = 'Checking...';

  const settings = await getSettings();

  // Check Groq API key first
  if (settings.groqApiKey && settings.groqApiKey.length > 10) {
    try {
      const res = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.groqApiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 1,
        }),
        signal: AbortSignal.timeout(4000),
      });
      if (res.status === 401) {
        dot.className = 'status-dot status-error';
        dot.title = '❌ Invalid Groq API key';
      } else {
        dot.className = 'status-dot status-ok';
        dot.title = '✅ Groq AI: Online';
      }
      return;
    } catch {
      // Network issue — check backend
    }
  }

  // Check backend
  try {
    const base = settings.backendUrl || 'http://localhost:3000';
    const res = await fetch(`${base}/api/analyze-selection`, {
      method: 'OPTIONS',
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok || res.status === 204) {
      dot.className = 'status-dot status-ok';
      dot.title = '✅ Backend: Online';
      return;
    }
  } catch { /* ignore */ }

  // No API key and no backend
  if (!settings.groqApiKey || settings.groqApiKey.length < 10) {
    dot.className = 'status-dot status-error';
    dot.title = '⚠️ No API key — click ⚙️ to add your Groq key';
  } else {
    dot.className = 'status-dot status-error';
    dot.title = 'Groq unreachable — check internet';
  }
}

// ─── Recent Scans ─────────────────────────────────────────────────────────

async function loadRecentScans() {
  chrome.runtime.sendMessage({ type: 'GET_RECENT_SCANS' }, (response) => {
    renderRecentScans(response?.scans || []);
  });
}

function renderRecentScans(scans) {
  const list = document.getElementById('recent-list');
  if (!list) return;

  if (scans.length === 0) {
    list.innerHTML = '<div class="empty-state">Select text on any page to scan it.<br>Results will appear here.</div>';
    return;
  }

  list.innerHTML = scans.map((scan) => {
    const riskColor = RISK_COLORS[scan.riskLevel] || '#888';
    const dotClass = `risk-dot-${(scan.riskLevel || 'low').toLowerCase()}`;
    const host = (() => { try { return new URL(scan.pageUrl).hostname; } catch { return scan.pageUrl || 'Unknown'; } })();
    const timeAgo = formatTimeAgo(scan.timestamp);

    return `
      <div class="scan-item">
        <div class="scan-risk-dot ${dotClass}"></div>
        <div class="scan-info">
          <div class="scan-type">${escapeHtml(scan.scamType || 'Unknown')}</div>
          <div class="scan-page">${escapeHtml(host)} · ${timeAgo}</div>
        </div>
        <div class="scan-score" style="color:${riskColor}">${scan.riskScore || 0}</div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatTimeAgo(ts) {
  if (!ts) return 'now';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Platform Detection ────────────────────────────────────────────────────

async function detectPlatform() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return;
    const platforms = [
      { pattern: /mail\.google\.com/, label: 'Gmail', emoji: '📧' },
      { pattern: /instagram\.com/, label: 'Instagram', emoji: '📸' },
      { pattern: /web\.whatsapp\.com/, label: 'WhatsApp Web', emoji: '💬' },
      { pattern: /twitter\.com|x\.com/, label: 'X / Twitter', emoji: '🐦' },
      { pattern: /facebook\.com/, label: 'Facebook', emoji: '👍' },
      { pattern: /linkedin\.com/, label: 'LinkedIn', emoji: '💼' },
    ];
    const match = platforms.find((p) => p.pattern.test(tab.url));
    if (match) {
      const banner = document.getElementById('platform-banner');
      document.getElementById('platform-emoji').textContent = match.emoji;
      document.getElementById('platform-label').textContent = match.label + ' detected';
      if (banner) banner.style.display = 'flex';
    }
  } catch { /* no active tab */ }
}

// ─── Listeners ─────────────────────────────────────────────────────────────

function attachListeners() {
  // Auto-scan toggle
  document.getElementById('autoscan-toggle')?.addEventListener('change', async (e) => {
    await saveSettings({ autoScan: e.target.checked });
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'NULLTRACE_TOGGLE_AUTO_SCAN',
          payload: { enabled: e.target.checked },
        });
      }
    } catch { /* no content script */ }
  });

  // Scan page
  document.getElementById('btn-scan-page')?.addEventListener('click', async () => {
    showScanStatus('Scanning page...');
    chrome.runtime.sendMessage({ type: 'POPUP_SCAN_PAGE' });
    setTimeout(() => { hideScanStatus(); window.close(); }, 800);
  });

  // History refresh
  document.getElementById('btn-open-history')?.addEventListener('click', () => loadHistory());

  // URL scan
  const urlInput = document.getElementById('url-input');
  const urlBtn = document.getElementById('btn-scan-url');

  const doUrlScan = async () => {
    const url = urlInput?.value.trim();
    if (!url || url.length < 4) return;
    showScanStatus('Analyzing URL...');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'NULLTRACE_SCAN_URL',
          payload: { url, source: 'popup' },
        });
      }
    } catch { /* no content script */ }
    setTimeout(() => { hideScanStatus(); window.close(); }, 600);
  };

  urlBtn?.addEventListener('click', doUrlScan);
  urlInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') doUrlScan(); });

  // Clear history
  document.getElementById('btn-clear-history')?.addEventListener('click', async () => {
    if (confirm(`Clear history for ${activeHistoryTab}?`)) {
      if (activeHistoryTab === 'scans') {
        await new Promise((r) => chrome.storage.local.remove(['nulltrace_scans'], r));
      } else if (activeHistoryTab === 'threats') {
        await new Promise((r) => chrome.storage.local.remove(['nulltrace_shield_blocked'], r));
      } else if (activeHistoryTab === 'safe') {
        await new Promise((r) => chrome.storage.local.remove(['nulltrace_shield_allowed'], r));
      }
      loadHistory(activeHistoryTab);
    }
  });

  // Tab button click events
  document.getElementById('tab-scans')?.addEventListener('click', () => loadHistory('scans'));
  document.getElementById('tab-threats')?.addEventListener('click', () => loadHistory('threats'));
  document.getElementById('tab-safe')?.addEventListener('click', () => loadHistory('safe'));
}

let activeHistoryTab = 'scans';

async function loadHistory(tabName = activeHistoryTab) {
  activeHistoryTab = tabName;
  
  // Highlight tab
  document.querySelectorAll('.popup-tab').forEach(btn => {
    btn.classList.toggle('active', btn.id === `tab-${tabName}`);
  });
  
  const list = document.getElementById('recent-list');
  if (!list) return;
  
  if (tabName === 'scans') {
    chrome.runtime.sendMessage({ type: 'GET_RECENT_SCANS' }, (response) => {
      renderRecentScans(response?.scans || []);
    });
  } else if (tabName === 'threats') {
    chrome.storage.local.get(['nulltrace_shield_blocked'], (result) => {
      const blocked = result.nulltrace_shield_blocked || [];
      renderShieldHistory(blocked, true);
    });
  } else if (tabName === 'safe') {
    chrome.storage.local.get(['nulltrace_shield_allowed'], (result) => {
      const allowed = result.nulltrace_shield_allowed || [];
      renderShieldHistory(allowed, false);
    });
  }
}

function renderShieldHistory(items, isBlocked) {
  const list = document.getElementById('recent-list');
  if (!list) return;
  
  if (items.length === 0) {
    list.innerHTML = `<div class="empty-state">No ${isBlocked ? 'threats' : 'safe sites'} logged yet.</div>`;
    return;
  }
  
  list.innerHTML = items.slice().reverse().map(item => {
    const score = item.threatResult?.threat?.riskScore || 0;
    const riskLevel = item.threatResult?.threat?.riskLevel || 'LOW';
    const riskColor = RISK_COLORS[riskLevel] || '#888';
    const dotClass = `risk-dot-${riskLevel.toLowerCase()}`;
    const timeAgo = formatTimeAgo(item.timestamp);
    const host = (() => { try { return new URL(item.url).hostname; } catch { return item.url || 'Unknown'; } })();
    
    return `
      <div class="scan-item" title="${escapeHtml(item.url)}">
        <div class="scan-risk-dot ${dotClass}"></div>
        <div class="scan-info">
          <div class="scan-type">${escapeHtml(host)}</div>
          <div class="scan-page">${isBlocked ? 'Blocked' : 'Allowed'} · ${timeAgo}</div>
        </div>
        <div class="scan-score" style="color:${riskColor}">${score}</div>
      </div>
    `;
  }).join('');
}

function showScanStatus(text) {
  const s = document.getElementById('scan-status');
  const t = document.getElementById('scan-status-text');
  if (s) s.style.display = 'flex';
  if (t) t.textContent = text;
}

function hideScanStatus() {
  const s = document.getElementById('scan-status');
  if (s) s.style.display = 'none';
}
