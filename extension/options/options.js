// Nulltrace Sentinel — Options Script v2

const DEFAULT_SETTINGS = {
  autoScan: true,
  minSelectionLength: 5,
  showPanelAuto: true,
  enablePageHeuristics: true,
  backendUrl: 'http://localhost:3000',
  groqApiKey: '',
};

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  attachListeners();
  autoCheckKey();
});

async function loadSettings() {
  const settings = await new Promise((resolve) => {
    chrome.storage.sync.get(['nulltrace_settings'], (r) => {
      resolve({ ...DEFAULT_SETTINGS, ...(r.nulltrace_settings || {}) });
    });
  });

  document.getElementById('s-groq-key').value = settings.groqApiKey || '';
  document.getElementById('s-autoscan').checked = settings.autoScan !== false;
  document.getElementById('s-show-panel').checked = settings.showPanelAuto !== false;
  document.getElementById('s-min-length').value = settings.minSelectionLength || 5;
  document.getElementById('s-backend-url').value = settings.backendUrl || DEFAULT_SETTINGS.backendUrl;
}

async function saveSettings() {
  const settings = {
    groqApiKey: document.getElementById('s-groq-key').value.trim(),
    autoScan: document.getElementById('s-autoscan').checked,
    showPanelAuto: document.getElementById('s-show-panel').checked,
    minSelectionLength: parseInt(document.getElementById('s-min-length').value, 10) || 5,
    backendUrl: document.getElementById('s-backend-url').value.trim() || DEFAULT_SETTINGS.backendUrl,
    enablePageHeuristics: true,
  };

  await new Promise((resolve) => chrome.storage.sync.set({ nulltrace_settings: settings }, resolve));

  showFeedback('✓ Settings saved!', false);
}

async function testApiKey() {
  const key = document.getElementById('s-groq-key').value.trim();
  const statusEl = document.getElementById('key-status');
  const btn = document.getElementById('btn-test-key');

  if (!key || key.length < 10) {
    setKeyStatus('err', '❌ Please enter your Groq API key first');
    return;
  }

  btn.textContent = 'Testing...';
  btn.disabled = true;
  setKeyStatus('warn', '⏳ Verifying key with Groq...');

  try {
    const res = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 401) {
      setKeyStatus('err', '❌ Invalid API key. Please check and try again.');
    } else if (res.ok) {
      setKeyStatus('ok', '✅ API key is valid! Groq AI analysis is now enabled.');
      // Auto-save when key is verified
      await saveSettings();
    } else {
      const err = await res.json().catch(() => ({}));
      setKeyStatus('err', `⚠️ Error ${res.status}: ${err.error?.message || 'Unknown error'}`);
    }
  } catch (err) {
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      setKeyStatus('err', '⏱ Timeout — check your internet connection');
    } else {
      setKeyStatus('err', `❌ Network error: ${err.message}`);
    }
  } finally {
    btn.textContent = 'Test Key';
    btn.disabled = false;
  }
}

function setKeyStatus(type, message) {
  const el = document.getElementById('key-status');
  el.className = `key-status ${type}`;
  el.textContent = message;
}

async function autoCheckKey() {
  const settings = await new Promise((resolve) => {
    chrome.storage.sync.get(['nulltrace_settings'], (r) => resolve(r.nulltrace_settings || {}));
  });

  if (!settings.groqApiKey || settings.groqApiKey.length < 10) {
    setKeyStatus('warn', '⚠️ No API key set. Add your Groq key to enable full AI threat analysis.');
  } else {
    setKeyStatus('ok', `✅ API key configured (${settings.groqApiKey.slice(0, 8)}...)`);
  }
}

function showFeedback(msg, isError = false) {
  const fb = document.getElementById('feedback');
  fb.textContent = msg;
  fb.style.color = isError ? '#ff6b6b' : '#00e676';
  fb.classList.add('show');
  setTimeout(() => fb.classList.remove('show'), 2500);
}

function attachListeners() {
  document.getElementById('btn-save').addEventListener('click', saveSettings);
  document.getElementById('btn-test-key').addEventListener('click', testApiKey);

  // Test key on Enter
  document.getElementById('s-groq-key').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') testApiKey();
  });

  document.getElementById('btn-clear').addEventListener('click', async () => {
    if (confirm('Clear all scan history? This cannot be undone.')) {
      await new Promise((r) => chrome.storage.local.remove(['nulltrace_scans'], r));
      showFeedback('✓ History cleared!');
    }
  });

  // Save on Enter in inputs
  document.querySelectorAll('input[type="text"], input[type="number"]').forEach((input) => {
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveSettings(); });
  });
}
