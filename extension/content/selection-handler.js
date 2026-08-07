// Nulltrace Sentinel — Selection Handler v3
// Pure inline-style popup — maximum cross-site compatibility, no Shadow DOM

const NulltraceSelection = (() => {
  let debounceTimer = null;
  let lastScannedText = '';
  let currentPopup = null;
  let selectionEnabled = true;
  let minLength = 5;
  let isAnalyzing = false;
  let lastSelectionText = '';
  let lastSelectionUrl = null;

  const DEBOUNCE_MS = 600;
  const POPUP_ID = '__nt_sel_popup__';

  // ─── Pure inline-style popup (works on ALL sites) ─────────────────────────

  function createPopup(text, detectedUrl, x, y) {
    removePopup();

    const preview = text.length > 100 ? text.slice(0, 100) + '…' : text;

    const popup = document.createElement('div');
    popup.id = POPUP_ID;

    // All positioning + styling completely inline — no external CSS needed
    popup.setAttribute('style', [
      'position:fixed',
      `left:${Math.min(Math.max(x - 140, 8), window.innerWidth - 296)}px`,
      `top:${Math.min(y + 10, window.innerHeight - 220)}px`,
      'width:288px',
      'z-index:2147483647',
      'background:linear-gradient(135deg,#0a0e1a,#0d1628)',
      'border:1.5px solid rgba(0,212,255,0.4)',
      'border-radius:14px',
      'box-shadow:0 16px 48px rgba(0,0,0,0.8),0 0 0 1px rgba(0,212,255,0.08)',
      'padding:14px',
      'font-family:-apple-system,BlinkMacSystemFont,Segoe UI,system-ui,sans-serif',
      'font-size:13px',
      'color:#e2e8f0',
      'animation:ntSlideIn 0.18s ease-out',
      'pointer-events:all',
    ].join(';'));

    // Inject keyframe animation
    if (!document.getElementById('__nt_anim__')) {
      const style = document.createElement('style');
      style.id = '__nt_anim__';
      style.textContent = '@keyframes ntSlideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}';
      document.head.appendChild(style);
    }

    // Header
    const header = document.createElement('div');
    header.setAttribute('style', 'display:flex;align-items:center;gap:8px;margin-bottom:10px');

    const logoBox = document.createElement('div');
    logoBox.setAttribute('style', 'width:26px;height:26px;background:linear-gradient(135deg,#00d4ff,#7c3aed);border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0');
    logoBox.textContent = '🛡️';

    const titleEl = document.createElement('div');
    titleEl.setAttribute('style', 'font-size:11px;font-weight:700;color:#00d4ff;letter-spacing:0.5px;flex:1');
    titleEl.textContent = 'NULLTRACE SENTINEL';

    const closeBtn = document.createElement('button');
    closeBtn.setAttribute('style', 'width:22px;height:22px;background:rgba(255,255,255,0.06);border:none;border-radius:5px;color:rgba(255,255,255,0.5);cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;padding:0;line-height:1');
    closeBtn.textContent = '✕';
    closeBtn.onclick = (e) => { e.stopPropagation(); removePopup(); };

    header.appendChild(logoBox);
    header.appendChild(titleEl);
    header.appendChild(closeBtn);

    // URL badge (if URL detected)
    let urlBadge = null;
    if (detectedUrl) {
      urlBadge = document.createElement('div');
      urlBadge.setAttribute('style', 'display:flex;align-items:center;gap:5px;background:rgba(124,58,237,0.12);border:1px solid rgba(124,58,237,0.2);border-radius:6px;padding:4px 8px;margin-bottom:8px;font-size:10px;color:#a78bfa;overflow:hidden');
      const urlIcon = document.createElement('span');
      urlIcon.textContent = '🔗';
      const urlText = document.createElement('span');
      urlText.setAttribute('style', 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:monospace');
      urlText.textContent = detectedUrl.slice(0, 45) + (detectedUrl.length > 45 ? '…' : '');
      urlBadge.appendChild(urlIcon);
      urlBadge.appendChild(urlText);
    }

    // Text preview
    const previewBox = document.createElement('div');
    previewBox.setAttribute('style', 'background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:8px 10px;font-size:11px;color:rgba(255,255,255,0.55);line-height:1.5;margin-bottom:10px;max-height:52px;overflow:hidden');
    previewBox.textContent = preview;

    // Action buttons row
    const btnRow = document.createElement('div');
    btnRow.setAttribute('style', 'display:flex;gap:7px');

    // Main Analyze button
    const analyzeBtn = document.createElement('button');
    analyzeBtn.id = '__nt_analyze_btn__';
    analyzeBtn.setAttribute('style', 'flex:1;padding:9px 14px;background:linear-gradient(135deg,#00d4ff,#0099cc);color:#000;border:none;border-radius:9px;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;font-family:inherit;transition:all 0.15s');
    analyzeBtn.innerHTML = '<span>🔍</span><span>Analyze Text</span>';

    analyzeBtn.onmouseenter = () => {
      analyzeBtn.style.background = 'linear-gradient(135deg,#22e0ff,#00b5e8)';
      analyzeBtn.style.transform = 'translateY(-1px)';
    };
    analyzeBtn.onmouseleave = () => {
      analyzeBtn.style.background = 'linear-gradient(135deg,#00d4ff,#0099cc)';
      analyzeBtn.style.transform = '';
    };
    analyzeBtn.onclick = (e) => {
      e.stopPropagation();
      if (isAnalyzing) return;
      removePopup();
      doScan(text, detectedUrl);
    };

    btnRow.appendChild(analyzeBtn);

    // URL-only button if URL detected
    if (detectedUrl) {
      const urlBtn = document.createElement('button');
      urlBtn.setAttribute('style', 'padding:9px 10px;background:rgba(124,58,237,0.15);color:#a78bfa;border:1px solid rgba(124,58,237,0.25);border-radius:9px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;font-family:inherit');
      urlBtn.textContent = '🔗 URL';
      urlBtn.onclick = (e) => {
        e.stopPropagation();
        removePopup();
        doUrlScan(detectedUrl);
      };
      btnRow.appendChild(urlBtn);
    }

    // Assemble
    popup.appendChild(header);
    if (urlBadge) popup.appendChild(urlBadge);
    popup.appendChild(previewBox);
    popup.appendChild(btnRow);

    // Prevent text deselection when clicking popup
    popup.onmousedown = (e) => e.preventDefault();

    document.documentElement.appendChild(popup);
    currentPopup = popup;

    // Auto-close on outside click
    setTimeout(() => {
      document.addEventListener('mousedown', onOutsideClick);
    }, 150);

    console.log('[Nulltrace] Popup shown at', x, y, '— text:', text.slice(0, 30));
    return popup;
  }

  function onOutsideClick(e) {
    if (currentPopup && !currentPopup.contains(e.target) && e.target.id !== POPUP_ID) {
      removePopup();
    }
  }

  function removePopup() {
    if (currentPopup) {
      currentPopup.remove();
      currentPopup = null;
    }
    document.removeEventListener('mousedown', onOutsideClick);
  }

  // ─── Scan Functions ────────────────────────────────────────────────────────

  async function doScan(text, detectedUrl) {
    if (isAnalyzing) return;
    isAnalyzing = true;
    lastScannedText = text;

    console.log('[Nulltrace] Starting analysis for:', text.slice(0, 50));

    // Show loading panel immediately
    NulltracePanel.setLoading(true);

    const evidence = {
      selectedText: text.slice(0, 1000),
      detectedUrl: detectedUrl || null,
      pageUrl: window.location.href,
      pageTitle: document.title,
      platform: NulltracePlatform.getPlatformId(),
      timestamp: new Date().toISOString(),
    };

    try {
      const result = await NulltraceApi.analyzeSelection({
        text,
        pageUrl: window.location.href,
        pageTitle: document.title,
        platform: NulltracePlatform.getPlatformId(),
        detectedUrl: detectedUrl || null,
      });

      const normalized = NulltraceNormalizer.normalizeApiResponse(result);

      // Warn if using keyword fallback (no API key)
      if (result._noApiKey) {
        normalized.threat.summary =
          '⚠️ No Groq API key — using basic keyword analysis. ' +
          'Go to extension Options (right-click icon → Options) and add your Groq key for full AI analysis.\n\n' +
          normalized.threat.summary;
      }

      evidence.threatResult = normalized;
      NulltraceEvidence.saveToStorage(evidence);
      NulltracePanel.setResult(normalized, evidence);

    } catch (err) {
      console.error('[Nulltrace] Analysis error:', err);
      const msg = err.message === 'INVALID_API_KEY'
        ? '❌ Invalid Groq API key. Right-click the extension icon → Options → update your key.'
        : err.message?.includes('timed out')
          ? '⏱ Groq API timed out. Check your internet connection.'
          : `Analysis failed: ${err.message}`;
      NulltracePanel.setError(msg);
    } finally {
      isAnalyzing = false;
    }
  }

  async function doUrlScan(url) {
    if (isAnalyzing) return;
    isAnalyzing = true;

    console.log('[Nulltrace] URL scan:', url);
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
      NulltracePanel.setError(`URL analysis failed: ${err.message}`);
    } finally {
      isAnalyzing = false;
    }
  }

  // Public alias for content.js to call
  async function triggerScan(text, source) {
    const url = NulltraceUrlIntel.getPrimaryUrl(text);
    await doScan(text, url);
  }

  async function triggerUrlScan(url) {
    await doUrlScan(url);
  }

  // ─── Selection Detection ──────────────────────────────────────────────────

  function handleMouseUp(e) {
    // Don't trigger if clicked inside our popup
    if (e.target && e.target.closest && e.target.closest(`#${POPUP_ID}`)) return;
    if (currentPopup && currentPopup.contains(e.target)) return;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => checkSelection(e), DEBOUNCE_MS);
  }

  function checkSelection(e) {
    if (!selectionEnabled) return;

    const selection = window.getSelection();
    const text = selection?.toString().trim() || '';

    if (text.length < minLength) {
      // Don't remove popup if user just clicked inside it
      if (currentPopup && currentPopup.contains(document.activeElement)) return;
      return;
    }

    // Don't re-trigger for the same text if popup already showing
    if (currentPopup && text === lastSelectionText) return;

    lastSelectionText = text;
    lastSelectionUrl = NulltraceUrlIntel.getPrimaryUrl(text);

    // Get position from selection bounding rect
    let x = e?.clientX || window.innerWidth / 2;
    let y = e?.clientY || 200;

    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width > 0) {
        x = rect.left + rect.width / 2;
        y = rect.bottom + window.scrollY - window.scrollY; // keep in viewport coords
        // If selection is near bottom, show popup above it
        if (rect.bottom + 220 > window.innerHeight) {
          y = rect.top - 220;
        } else {
          y = rect.bottom + 8;
        }
      }
    } catch { /* use mouse position */ }

    createPopup(text, lastSelectionUrl, x, y);
  }

  function handleKeyUp(e) {
    if (!selectionEnabled) return;
    if (e.key === 'Escape') { removePopup(); return; }
    // Handle keyboard selections (Shift+Arrow etc.)
    if (e.shiftKey || e.key === 'End' || e.key === 'Home') {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => checkSelection(e), DEBOUNCE_MS);
    }
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  async function init() {
    try {
      const settings = await NulltraceStorage.getSettings();
      selectionEnabled = settings.autoScan !== false;
      minLength = settings.minSelectionLength || 12;
    } catch {
      selectionEnabled = true;
      minLength = 12;
    }

    document.addEventListener('mouseup', handleMouseUp, { passive: true });
    document.addEventListener('keyup', handleKeyUp, { passive: true });

    console.log(`[Nulltrace] Selection handler ready — autoScan:${selectionEnabled}, minLength:${minLength}`);
  }

  function setEnabled(enabled) {
    selectionEnabled = enabled;
    if (!enabled) removePopup();
    console.log('[Nulltrace] Auto-scan:', enabled);
  }

  return { init, triggerScan, triggerUrlScan, setEnabled, removePopup };
})();

if (typeof window !== 'undefined') {
  window.NulltraceSelection = NulltraceSelection;
}
