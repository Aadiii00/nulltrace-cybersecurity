// Nulltrace Sentinel — Floating Draggable Threat Panel
// Renders a singleton shadow-DOM panel on the host page

const NulltracePanel = (() => {
  let panelRoot = null;
  let shadowRoot = null;
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let isMinimized = false;
  let currentTab = 'overview';
  let currentResult = null;
  let currentEvidence = null;

  // ─── Panel CSS ──────────────────────────────────────────────────────────────

  const PANEL_CSS = `
    :host {
      all: initial;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    #nulltrace-panel {
      position: fixed;
      top: 80px;
      right: 24px;
      width: 420px;
      max-height: 85vh;
      background: linear-gradient(135deg, #0a0e1a 0%, #0d1628 50%, #0a1020 100%);
      border: 1px solid rgba(0, 212, 255, 0.3);
      border-radius: 16px;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(0, 212, 255, 0.1), inset 0 1px 0 rgba(255,255,255,0.05);
      z-index: 2147483647;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: all 0.2s ease;
      font-size: 13px;
      color: #e2e8f0;
      backdrop-filter: blur(20px);
    }

    #nulltrace-panel.minimized {
      max-height: 54px;
      min-height: 54px;
    }

    /* Header */
    #nt-header {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      background: rgba(0, 212, 255, 0.06);
      border-bottom: 1px solid rgba(0, 212, 255, 0.15);
      cursor: grab;
      user-select: none;
      gap: 10px;
      flex-shrink: 0;
    }

    #nt-header:active { cursor: grabbing; }

    #nt-logo {
      width: 28px;
      height: 28px;
      background: linear-gradient(135deg, #00d4ff, #7c3aed);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      flex-shrink: 0;
    }

    #nt-title-group {
      flex: 1;
      min-width: 0;
    }

    #nt-title {
      font-size: 13px;
      font-weight: 700;
      color: #00d4ff;
      letter-spacing: 0.5px;
    }

    #nt-subtitle {
      font-size: 10px;
      color: rgba(255,255,255,0.4);
      letter-spacing: 0.3px;
    }

    #nt-risk-badge {
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1px;
      flex-shrink: 0;
    }

    .risk-low { background: rgba(0, 230, 118, 0.15); color: #00e676; border: 1px solid rgba(0, 230, 118, 0.3); }
    .risk-medium { background: rgba(240, 196, 0, 0.15); color: #f0c400; border: 1px solid rgba(240, 196, 0, 0.3); }
    .risk-high { background: rgba(255, 107, 0, 0.15); color: #ff6b00; border: 1px solid rgba(255, 107, 0, 0.3); }
    .risk-critical { background: rgba(255, 45, 45, 0.2); color: #ff2d2d; border: 1px solid rgba(255, 45, 45, 0.4); animation: pulse-red 1.5s infinite; }

    @keyframes pulse-red {
      0%, 100% { box-shadow: 0 0 0 0 rgba(255, 45, 45, 0.4); }
      50% { box-shadow: 0 0 0 4px rgba(255, 45, 45, 0); }
    }

    #nt-controls {
      display: flex;
      gap: 4px;
      flex-shrink: 0;
    }

    .nt-ctrl-btn {
      width: 26px;
      height: 26px;
      border: none;
      border-radius: 6px;
      background: rgba(255,255,255,0.06);
      color: rgba(255,255,255,0.5);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      transition: all 0.15s;
    }

    .nt-ctrl-btn:hover {
      background: rgba(255,255,255,0.12);
      color: #fff;
    }

    /* Loading state */
    #nt-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      gap: 16px;
    }

    .nt-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(0, 212, 255, 0.15);
      border-top-color: #00d4ff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .nt-loading-text {
      color: rgba(255,255,255,0.5);
      font-size: 12px;
      text-align: center;
    }

    .nt-loading-label {
      font-size: 11px;
      color: #00d4ff;
      letter-spacing: 2px;
      font-weight: 600;
    }

    /* Error state */
    #nt-error {
      display: none;
      padding: 24px;
      text-align: center;
    }

    .nt-error-icon { font-size: 32px; margin-bottom: 12px; }
    .nt-error-title { color: #ff6b6b; font-weight: 600; margin-bottom: 8px; }
    .nt-error-msg { color: rgba(255,255,255,0.4); font-size: 12px; line-height: 1.5; }

    /* Tabs */
    #nt-tabs {
      display: flex;
      border-bottom: 1px solid rgba(255,255,255,0.07);
      background: rgba(0,0,0,0.2);
      flex-shrink: 0;
    }

    .nt-tab {
      flex: 1;
      padding: 10px 4px;
      text-align: center;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.5px;
      color: rgba(255,255,255,0.35);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.15s;
    }

    .nt-tab:hover { color: rgba(255,255,255,0.6); }
    .nt-tab.active { color: #00d4ff; border-bottom-color: #00d4ff; }

    /* Content */
    #nt-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      scrollbar-width: thin;
      scrollbar-color: rgba(0, 212, 255, 0.2) transparent;
    }

    #nt-content::-webkit-scrollbar { width: 4px; }
    #nt-content::-webkit-scrollbar-thumb { background: rgba(0, 212, 255, 0.2); border-radius: 2px; }

    /* Cards */
    .nt-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 10px;
      padding: 14px;
      margin-bottom: 12px;
    }

    .nt-card-title {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1.5px;
      color: rgba(255,255,255,0.35);
      text-transform: uppercase;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .nt-card-title span { font-size: 14px; }

    /* Risk score bar */
    .nt-score-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .nt-score-circle {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      flex-shrink: 0;
      font-size: 18px;
      font-weight: 800;
      border: 3px solid;
    }

    .nt-score-label { font-size: 8px; font-weight: 600; letter-spacing: 1px; opacity: 0.7; }

    .nt-threat-type {
      font-size: 14px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 4px;
    }

    .nt-intent {
      font-size: 11px;
      color: rgba(255,255,255,0.4);
    }

    .nt-summary {
      font-size: 12px;
      line-height: 1.6;
      color: rgba(255,255,255,0.7);
      margin-bottom: 12px;
    }

    /* Indicators list */
    .nt-indicators {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .nt-indicator {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 11px;
      color: rgba(255,255,255,0.6);
      line-height: 1.4;
    }

    .nt-indicator-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      margin-top: 4px;
      flex-shrink: 0;
    }

    /* Tags */
    .nt-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }

    .nt-tag {
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      background: rgba(255,107,0,0.1);
      color: #ff9a3c;
      border: 1px solid rgba(255,107,0,0.2);
    }

    /* URL section */
    .nt-url-display {
      font-family: 'Courier New', monospace;
      font-size: 11px;
      color: #00d4ff;
      word-break: break-all;
      background: rgba(0, 212, 255, 0.05);
      padding: 8px 10px;
      border-radius: 6px;
      border: 1px solid rgba(0, 212, 255, 0.1);
      margin-bottom: 10px;
    }

    .nt-prop-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 5px 0;
      border-bottom: 1px solid rgba(255,255,255,0.04);
      font-size: 11px;
    }

    .nt-prop-key { color: rgba(255,255,255,0.35); }
    .nt-prop-val { color: #e2e8f0; font-weight: 500; }
    .nt-prop-val.good { color: #00e676; }
    .nt-prop-val.bad { color: #ff6b6b; }

    /* Redirect chain */
    .nt-chain {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .nt-chain-step {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 10px;
    }

    .nt-chain-num {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid rgba(0, 212, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      color: #00d4ff;
      flex-shrink: 0;
      font-weight: 700;
    }

    .nt-chain-url {
      font-family: monospace;
      color: rgba(255,255,255,0.5);
      word-break: break-all;
      flex: 1;
    }

    .nt-chain-arrow {
      color: rgba(255,255,255,0.2);
      font-size: 12px;
      padding-left: 28px;
    }

    /* Action bar */
    #nt-actions {
      padding: 12px 16px;
      display: flex;
      gap: 8px;
      border-top: 1px solid rgba(255,255,255,0.07);
      background: rgba(0,0,0,0.2);
      flex-wrap: wrap;
      flex-shrink: 0;
    }

    .nt-action-btn {
      flex: 1;
      min-width: 70px;
      padding: 8px 10px;
      border: none;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
      letter-spacing: 0.3px;
    }

    .nt-action-btn.primary {
      background: linear-gradient(135deg, #00d4ff, #0099cc);
      color: #000;
    }

    .nt-action-btn.primary:hover {
      background: linear-gradient(135deg, #22e0ff, #00b5e8);
      transform: translateY(-1px);
    }

    .nt-action-btn.secondary {
      background: rgba(255,255,255,0.06);
      color: rgba(255,255,255,0.7);
      border: 1px solid rgba(255,255,255,0.1);
    }

    .nt-action-btn.secondary:hover {
      background: rgba(255,255,255,0.1);
      color: #fff;
    }

    .nt-action-btn.danger {
      background: rgba(255, 45, 45, 0.1);
      color: #ff6b6b;
      border: 1px solid rgba(255, 45, 45, 0.2);
    }

    .nt-action-btn.danger:hover {
      background: rgba(255, 45, 45, 0.2);
    }

    .nt-action-btn:active { transform: translateY(0) scale(0.97); }

    /* Recommended action box */
    .nt-rec-action {
      background: rgba(0, 212, 255, 0.05);
      border: 1px solid rgba(0, 212, 255, 0.15);
      border-left: 3px solid #00d4ff;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 12px;
      line-height: 1.5;
      color: rgba(255,255,255,0.75);
    }

    .nt-rec-label {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 1.5px;
      color: #00d4ff;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    /* Evidence tab */
    .nt-evidence-item {
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 8px;
      padding: 10px;
      margin-bottom: 8px;
    }

    .nt-evidence-key {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 1px;
      color: rgba(255,255,255,0.3);
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .nt-evidence-val {
      font-size: 11px;
      color: rgba(255,255,255,0.65);
      word-break: break-all;
      font-family: monospace;
    }

    /* Complaint section */
    .nt-complaint-body {
      font-size: 12px;
      line-height: 1.7;
      color: rgba(255,255,255,0.65);
      white-space: pre-wrap;
      background: rgba(0,0,0,0.2);
      padding: 12px;
      border-radius: 8px;
      max-height: 200px;
      overflow-y: auto;
      border: 1px solid rgba(255,255,255,0.06);
    }

    .nt-report-links { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }

    .nt-report-link {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: #00d4ff;
      text-decoration: none;
      padding: 6px 10px;
      background: rgba(0, 212, 255, 0.05);
      border-radius: 6px;
      border: 1px solid rgba(0, 212, 255, 0.1);
      cursor: pointer;
    }

    .nt-report-link:hover { background: rgba(0, 212, 255, 0.1); }

    /* Feedback message */
    .nt-feedback {
      font-size: 11px;
      color: #00e676;
      text-align: center;
      padding: 4px;
      opacity: 0;
      transition: opacity 0.3s;
    }

    .nt-feedback.show { opacity: 1; }

    /* Empty state */
    .nt-empty {
      text-align: center;
      padding: 24px;
      color: rgba(255,255,255,0.3);
      font-size: 12px;
    }

    /* Risky parts highlight */
    .nt-risky-parts { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }

    .nt-risky-part {
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 10px;
      background: rgba(255, 45, 45, 0.1);
      color: #ff6b6b;
      border: 1px solid rgba(255, 45, 45, 0.2);
      font-family: monospace;
    }

    /* Emotion badge */
    .nt-emotion {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 10px;
      background: rgba(124, 58, 237, 0.15);
      color: #a78bfa;
      border: 1px solid rgba(124, 58, 237, 0.2);
      margin-left: 8px;
    }

    /* Platform badge */
    .nt-platform {
      font-size: 10px;
      color: rgba(255,255,255,0.35);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    /* Scanning indicator */
    @keyframes scanPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    .nt-scan-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #00d4ff;
      animation: scanPulse 1s infinite;
    }

    /* Safe Browsing Shield Overlay Styles */
    .nt-shield-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(2, 6, 23, 0.85);
      backdrop-filter: blur(15px);
      z-index: 2147483646;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
    }
    
    .nt-shield-alert-card {
      width: 480px;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      border: 2px solid #ef4444;
      border-radius: 24px;
      padding: 32px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(239, 68, 68, 0.2);
      color: #f1f5f9;
      display: flex;
      flex-direction: column;
      gap: 20px;
      animation: alertSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    
    @keyframes alertSlideIn {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    
    .nt-shield-alert-header {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #ef4444;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }
    
    .nt-shield-alert-title {
      text-transform: uppercase;
    }
    
    .nt-shield-dest {
      background: rgba(0, 0, 0, 0.3);
      padding: 12px 16px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      font-family: monospace;
      word-break: break-all;
      color: #cbd5e1;
      font-size: 13px;
    }
    
    .nt-shield-metrics {
      display: flex;
      gap: 24px;
      background: rgba(255, 255, 255, 0.03);
      padding: 16px;
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    .nt-shield-metric {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .nt-shield-metric-label {
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .nt-shield-metric-val {
      font-size: 18px;
      font-weight: 800;
    }
    
    .nt-shield-reasons {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .nt-shield-reasons-title {
      font-size: 11px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .nt-shield-reason-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 12px;
      color: #cbd5e1;
      line-height: 1.5;
    }
    
    .nt-shield-reason-dot {
      color: #ef4444;
      margin-top: 1px;
    }
    
    .nt-shield-btn-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 10px;
    }
    
    .nt-shield-btn {
      padding: 12px 20px;
      border-radius: 12px;
      border: none;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
    }
    
    .nt-shield-btn.continue {
      background: rgba(255, 255, 255, 0.1);
      color: #f1f5f9;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .nt-shield-btn.continue:hover {
      background: rgba(255, 255, 255, 0.15);
    }
    
    .nt-shield-btn.block {
      background: #ef4444;
      color: #fff;
    }
    .nt-shield-btn.block:hover {
      background: #dc2626;
      box-shadow: 0 0 15px rgba(239, 68, 68, 0.4);
    }
    
    .nt-shield-btn.analysis {
      background: transparent;
      color: #94a3b8;
    }
    .nt-shield-btn.analysis:hover {
      color: #f1f5f9;
    }
    
    /* Toast notifications */
    .nt-toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #0d1527;
      border-radius: 12px;
      padding: 14px 20px;
      font-size: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 10px;
      animation: toastSlideIn 0.3s ease forwards;
      pointer-events: auto;
      border: 1.5px solid;
    }
    
    .nt-toast.safe {
      border-color: #10b981;
      color: #10b981;
      background: #061a15;
    }
    
    .nt-toast.warn {
      border-color: #ef4444;
      color: #f1f5f9;
      background: #180c11;
      cursor: pointer;
      box-shadow: 0 10px 25px rgba(239, 68, 68, 0.25);
      max-width: 380px;
    }
    
    @keyframes toastSlideIn {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    
    .nt-toast.fade-out {
      animation: toastFadeOut 0.3s ease forwards;
    }
    
    @keyframes toastFadeOut {
      from { transform: translateY(0); opacity: 1; }
      to { transform: translateY(20px); opacity: 0; }
    }
  `;

  // ─── HTML Templates ─────────────────────────────────────────────────────────

  function buildPanelHtml() {
    return `
      <div id="nulltrace-panel">
        <div id="nt-header">
          <div id="nt-logo">🛡️</div>
          <div id="nt-title-group">
            <div id="nt-title">NULLTRACE SENTINEL</div>
            <div id="nt-subtitle">Browser Security Assistant</div>
          </div>
          <div id="nt-risk-badge" class="risk-low">SCANNING</div>
          <div id="nt-controls">
            <button class="nt-ctrl-btn" id="nt-minimize-btn" title="Minimize">—</button>
            <button class="nt-ctrl-btn" id="nt-close-btn" title="Close">✕</button>
          </div>
        </div>

        <div id="nt-loading">
          <div class="nt-spinner"></div>
          <div class="nt-loading-label">ANALYZING</div>
          <div class="nt-loading-text">Scanning for threats...</div>
        </div>

        <div id="nt-error" style="display:none">
          <div class="nt-error-icon">⚠️</div>
          <div class="nt-error-title">Analysis Failed</div>
          <div class="nt-error-msg" id="nt-error-msg">Backend unavailable. Check that the Next.js server is running on localhost:3003</div>
        </div>

        <div id="nt-tabs" style="display:none">
          <div class="nt-tab active" data-tab="overview">Overview</div>
          <div class="nt-tab" data-tab="url">URL</div>
          <div class="nt-tab" data-tab="threat">Threat</div>
          <div class="nt-tab" data-tab="evidence">Evidence</div>
        </div>

        <div id="nt-content" style="display:none"></div>

        <div id="nt-actions" style="display:none">
          <button class="nt-action-btn secondary" id="nt-copy-btn">📋 Copy</button>
          <button class="nt-action-btn secondary" id="nt-download-btn">⬇ JSON</button>
          <button class="nt-action-btn danger" id="nt-complaint-btn" style="display:none">🚨 Complain</button>
          <div class="nt-feedback" id="nt-feedback"></div>
        </div>
      </div>
    `;
  }

  // ─── Tab Content Renderers ──────────────────────────────────────────────────

  function renderOverviewTab(result) {
    const { threat, urlIntel } = result;
    const color = NulltraceNormalizer.getRiskColor(threat.riskLevel);
    const emoji = NulltraceNormalizer.getRiskEmoji(threat.riskLevel);
    const platform = NulltracePlatform.detect();

    return `
      <div class="nt-card">
        <div class="nt-score-row">
          <div class="nt-score-circle" style="border-color: ${color}; color: ${color}">
            ${threat.riskScore}
            <div class="nt-score-label">/ 100</div>
          </div>
          <div style="flex:1">
            <div class="nt-threat-type">${emoji} ${threat.scamType}</div>
            <div class="nt-intent">${threat.intent}</div>
            ${threat.emotion && threat.emotion !== 'none' ? `<span class="nt-emotion">😰 ${threat.emotion}</span>` : ''}
          </div>
        </div>
        <div class="nt-summary">${threat.summary}</div>
        ${platform ? `<div class="nt-platform">${platform.emoji} Detected platform: ${platform.label}</div>` : ''}
      </div>

      <div class="nt-card">
        <div class="nt-card-title"><span>🔴</span> Key Indicators</div>
        <div class="nt-indicators">
          ${threat.indicators.length > 0
            ? threat.indicators.map(i => `
              <div class="nt-indicator">
                <div class="nt-indicator-dot" style="background: ${color}"></div>
                <span>${i}</span>
              </div>`).join('')
            : '<div class="nt-empty">No specific indicators detected.</div>'
          }
        </div>
        ${threat.riskyParts?.length > 0 ? `
          <div style="margin-top: 10px">
            <div class="nt-card-title" style="margin-bottom: 6px"><span>⚡</span> Risky phrases</div>
            <div class="nt-risky-parts">
              ${threat.riskyParts.map(p => `<span class="nt-risky-part">"${p}"</span>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>

      <div class="nt-card">
        <div class="nt-rec-label">Recommended Action</div>
        <div class="nt-rec-action">${threat.recommendedAction}</div>
      </div>

      ${urlIntel?.riskFlag && urlIntel.riskFlag !== 'LOW' && urlIntel.url ? `
        <div class="nt-card">
          <div class="nt-card-title"><span>🔗</span> URL Risk Signal</div>
          <div class="nt-url-display">${urlIntel.url.slice(0, 80)}${urlIntel.url.length > 80 ? '…' : ''}</div>
          <div class="nt-prop-row">
            <span class="nt-prop-key">Risk Flag</span>
            <span class="nt-prop-val ${urlIntel.riskFlag === 'HIGH' ? 'bad' : ''}">${urlIntel.riskFlag}</span>
          </div>
          <div class="nt-prop-row">
            <span class="nt-prop-key">Signals</span>
            <span class="nt-prop-val">${urlIntel.riskSignals.length}</span>
          </div>
        </div>
      ` : ''}
    `;
  }

  function renderUrlTab(result) {
    const { urlIntel, redirectChain } = result;

    if (!urlIntel?.url) {
      return `
        <div class="nt-empty">
          <div style="font-size: 32px; margin-bottom: 12px">🔗</div>
          <div>No URL detected in scanned content.</div>
        </div>
      `;
    }

    const chain = redirectChain?.chain || [];

    return `
      <div class="nt-card">
        <div class="nt-card-title"><span>🌐</span> URL Intelligence</div>
        <div class="nt-url-display">${urlIntel.url}</div>
        <div class="nt-prop-row">
          <span class="nt-prop-key">Domain</span>
          <span class="nt-prop-val">${urlIntel.domain || 'Unknown'}</span>
        </div>
        <div class="nt-prop-row">
          <span class="nt-prop-key">Protocol</span>
          <span class="nt-prop-val ${urlIntel.isSecure ? 'good' : 'bad'}">${(urlIntel.protocol || 'unknown').toUpperCase()} ${urlIntel.isSecure ? '🔒' : '⚠️'}</span>
        </div>
        <div class="nt-prop-row">
          <span class="nt-prop-key">Uses IP Address</span>
          <span class="nt-prop-val ${urlIntel.usesIpAddress ? 'bad' : 'good'}">${urlIntel.usesIpAddress ? '⚠️ Yes' : '✓ No'}</span>
        </div>
        <div class="nt-prop-row">
          <span class="nt-prop-key">Link Shortener</span>
          <span class="nt-prop-val ${urlIntel.isShortened ? 'bad' : 'good'}">${urlIntel.isShortened ? '⚠️ Yes' : '✓ No'}</span>
        </div>
        <div class="nt-prop-row">
          <span class="nt-prop-key">Risk Flag</span>
          <span class="nt-prop-val ${urlIntel.riskFlag === 'HIGH' ? 'bad' : urlIntel.riskFlag === 'MEDIUM' ? '' : 'good'}">${urlIntel.riskFlag}</span>
        </div>
      </div>

      ${urlIntel.riskSignals?.length > 0 ? `
        <div class="nt-card">
          <div class="nt-card-title"><span>⚠️</span> Risk Signals</div>
          <div class="nt-indicators">
            ${urlIntel.riskSignals.map(s => `
              <div class="nt-indicator">
                <div class="nt-indicator-dot" style="background: #ff6b00"></div>
                <span>${s}</span>
              </div>`).join('')}
          </div>
          ${urlIntel.suspiciousKeywords?.length > 0 ? `
            <div class="nt-tags">
              ${urlIntel.suspiciousKeywords.map(kw => `<span class="nt-tag">${kw}</span>`).join('')}
            </div>
          ` : ''}
        </div>
      ` : ''}

      <div class="nt-card">
        <div class="nt-card-title"><span>↗️</span> Redirect Chain ${redirectChain?.suspiciousRedirects ? '⚠️' : ''}</div>
        ${chain.length > 0 ? `
          <div class="nt-chain">
            ${chain.map((url, i) => `
              <div class="nt-chain-step">
                <div class="nt-chain-num">${i + 1}</div>
                <div class="nt-chain-url">${url.slice(0, 60)}${url.length > 60 ? '…' : ''}</div>
              </div>
              ${i < chain.length - 1 ? '<div class="nt-chain-arrow">↓</div>' : ''}
            `).join('')}
          </div>
          ${redirectChain?.suspiciousRedirects ? `
            <div style="margin-top: 10px; padding: 6px 10px; background: rgba(255,107,0,0.1); border-radius: 6px; font-size: 11px; color: #ff9a3c;">
              ⚠️ Cross-domain redirects detected — destination differs from source
            </div>
          ` : ''}
        ` : '<div class="nt-empty">No redirect chain data available.</div>'}
      </div>
    `;
  }

  function renderThreatTab(result) {
    const { threat } = result;
    const color = NulltraceNormalizer.getRiskColor(threat.riskLevel);

    return `
      <div class="nt-card">
        <div class="nt-card-title"><span>🎯</span> Threat Classification</div>
        <div class="nt-prop-row">
          <span class="nt-prop-key">Scam Type</span>
          <span class="nt-prop-val">${threat.scamType}</span>
        </div>
        <div class="nt-prop-row">
          <span class="nt-prop-key">Risk Level</span>
          <span class="nt-prop-val" style="color: ${color}">${threat.riskLevel}</span>
        </div>
        <div class="nt-prop-row">
          <span class="nt-prop-key">Risk Score</span>
          <span class="nt-prop-val">${threat.riskScore} / 100</span>
        </div>
        <div class="nt-prop-row">
          <span class="nt-prop-key">Intent</span>
          <span class="nt-prop-val">${threat.intent}</span>
        </div>
        <div class="nt-prop-row">
          <span class="nt-prop-key">Emotion Used</span>
          <span class="nt-prop-val">${threat.emotion || 'None'}</span>
        </div>
      </div>

      <div class="nt-card">
        <div class="nt-card-title"><span>📊</span> Analysis Summary</div>
        <div class="nt-summary">${threat.summary}</div>
      </div>

      <div class="nt-card">
        <div class="nt-card-title"><span>🔴</span> All Indicators (${threat.indicators.length})</div>
        <div class="nt-indicators">
          ${threat.indicators.length > 0
            ? threat.indicators.map((ind, i) => `
              <div class="nt-indicator">
                <div class="nt-indicator-dot" style="background: ${color}"></div>
                <span>${ind}</span>
              </div>`).join('')
            : '<div class="nt-empty">No threat indicators found.</div>'}
        </div>
      </div>

      <div class="nt-card">
        <div class="nt-rec-label">Recommended Action</div>
        <div class="nt-rec-action">${threat.recommendedAction}</div>
      </div>
    `;
  }

  function renderEvidenceTab(result, evidence) {
    const ev = evidence || result.evidence || {};

    return `
      <div class="nt-card">
        <div class="nt-card-title"><span>🔬</span> Forensic Evidence</div>

        ${ev.timestamp ? `
          <div class="nt-evidence-item">
            <div class="nt-evidence-key">Timestamp</div>
            <div class="nt-evidence-val">${new Date(ev.timestamp).toLocaleString()}</div>
          </div>` : ''}

        ${ev.pageUrl ? `
          <div class="nt-evidence-item">
            <div class="nt-evidence-key">Source Page</div>
            <div class="nt-evidence-val">${ev.pageUrl.slice(0, 100)}</div>
          </div>` : ''}

        ${ev.pageTitle ? `
          <div class="nt-evidence-item">
            <div class="nt-evidence-key">Page Title</div>
            <div class="nt-evidence-val">${ev.pageTitle}</div>
          </div>` : ''}

        ${ev.detectedUrl ? `
          <div class="nt-evidence-item">
            <div class="nt-evidence-key">Detected URL</div>
            <div class="nt-evidence-val">${ev.detectedUrl}</div>
          </div>` : ''}

        ${ev.selectedText ? `
          <div class="nt-evidence-item">
            <div class="nt-evidence-key">Scanned Text</div>
            <div class="nt-evidence-val">${ev.selectedText.slice(0, 300)}${ev.selectedText.length > 300 ? '…' : ''}</div>
          </div>` : ''}

        ${ev.platform ? `
          <div class="nt-evidence-item">
            <div class="nt-evidence-key">Platform</div>
            <div class="nt-evidence-val">${ev.platform}</div>
          </div>` : ''}
      </div>

      <div id="nt-complaint-section" style="display:none">
        <div class="nt-card">
          <div class="nt-card-title"><span>📋</span> Complaint Draft</div>
          <div id="nt-complaint-loading" style="text-align:center; padding: 16px; color: rgba(255,255,255,0.4); font-size:12px">
            Generating complaint...
          </div>
          <div id="nt-complaint-content" style="display:none">
            <div class="nt-complaint-body" id="nt-complaint-body"></div>
            <div class="nt-report-links" id="nt-report-links"></div>
            <button class="nt-action-btn primary" style="margin-top:10px; width:100%" id="nt-copy-complaint-btn">📋 Copy Complaint</button>
          </div>
        </div>
      </div>

      <div style="display:flex; gap:8px; margin-top: 4px">
        <button class="nt-action-btn secondary" id="nt-screenshot-btn" style="flex:1">📸 Screenshot</button>
        <button class="nt-action-btn secondary" id="nt-download-evidence-btn" style="flex:1">⬇ Export</button>
      </div>
    `;
  }

  // ─── Render Content by Tab ──────────────────────────────────────────────────

  function renderContent(tab, result, evidence) {
    if (!result) return '';
    switch (tab) {
      case 'overview': return renderOverviewTab(result);
      case 'url': return renderUrlTab(result);
      case 'threat': return renderThreatTab(result);
      case 'evidence': return renderEvidenceTab(result, evidence);
      default: return renderOverviewTab(result);
    }
  }

  // ─── Panel Initialization ───────────────────────────────────────────────────

  function createPanel() {
    try {
      console.log('[NulltracePanel] Creating panel...');
      if (panelRoot) {
        console.log('[NulltracePanel] Panel already exists.');
        return;
      }

      panelRoot = document.createElement('div');
      panelRoot.id = 'nulltrace-sentinel-root';
      panelRoot.style.cssText = 'position: fixed; z-index: 2147483647; top: 0; left: 0; pointer-events: none;';

      shadowRoot = panelRoot.attachShadow({ mode: 'open' });

      const style = document.createElement('style');
      style.textContent = PANEL_CSS;

      const container = document.createElement('div');
      container.innerHTML = buildPanelHtml();

      shadowRoot.appendChild(style);
      shadowRoot.appendChild(container.firstElementChild);
      
      const target = document.body || document.documentElement;
      target.appendChild(panelRoot);
      console.log('[NulltracePanel] Panel root appended to:', target.tagName);

      const panel = shadowRoot.getElementById('nulltrace-panel');
      if (panel) {
        panel.style.pointerEvents = 'all';
      } else {
        console.error('[NulltracePanel] #nulltrace-panel not found in shadow DOM!');
      }

      attachEventListeners();
      console.log('[NulltracePanel] Panel created and event listeners attached ✓');
    } catch (err) {
      console.error('[NulltracePanel] Error creating panel:', err);
    }
  }

  // ─── Drag Logic ─────────────────────────────────────────────────────────────

  function attachEventListeners() {
    try {
      const header = shadowRoot.getElementById('nt-header');
      const panel = shadowRoot.getElementById('nulltrace-panel');
      const minimizeBtn = shadowRoot.getElementById('nt-minimize-btn');
      const closeBtn = shadowRoot.getElementById('nt-close-btn');

      // Drag
      if (header && panel) {
        header.addEventListener('mousedown', (e) => {
          if (e.target.classList.contains('nt-ctrl-btn')) return;
          isDragging = true;
          const rect = panel.getBoundingClientRect();
          dragOffsetX = e.clientX - rect.left;
          dragOffsetY = e.clientY - rect.top;
          panel.style.transition = 'none';
          e.preventDefault();
        });
      }

      document.addEventListener('mousemove', (e) => {
        if (!isDragging || !panel) return;
        const x = e.clientX - dragOffsetX;
        const y = e.clientY - dragOffsetY;
        const maxX = window.innerWidth - panel.offsetWidth;
        const maxY = window.innerHeight - panel.offsetHeight;
        panel.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
        panel.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
        panel.style.right = 'auto';
      });

      document.addEventListener('mouseup', () => {
        if (isDragging && panel) {
          isDragging = false;
          panel.style.transition = 'all 0.2s ease';
        }
      });

      // Minimize
      if (minimizeBtn && panel) {
        minimizeBtn.addEventListener('click', () => {
          isMinimized = !isMinimized;
          panel.classList.toggle('minimized', isMinimized);
          minimizeBtn.textContent = isMinimized ? '□' : '—';
        });
      }

      // Close
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          hide();
        });
      }

      // Tab switching
      const tabsEl = shadowRoot.getElementById('nt-tabs');
      if (tabsEl) {
        tabsEl.addEventListener('click', (e) => {
          const tab = e.target.dataset.tab;
          if (!tab || !currentResult) return;
          switchTab(tab);
        });
      }

      // Action buttons
      const copyBtn = shadowRoot.getElementById('nt-copy-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
          if (!currentResult) return;
          const text = NulltraceNormalizer.formatAsText(currentResult);
          await NulltraceEvidence.copyToClipboard(text);
          showFeedback('Copied!');
        });
      }

      const downloadBtn = shadowRoot.getElementById('nt-download-btn');
      if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
          if (!currentResult) return;
          const evidence = currentEvidence || currentResult.evidence || {};
          NulltraceEvidence.downloadJson({ ...currentResult, evidence });
        });
      }

      const complaintBtn = shadowRoot.getElementById('nt-complaint-btn');
      if (complaintBtn) {
        complaintBtn.addEventListener('click', async () => {
          switchTab('evidence');
          setTimeout(() => openComplaintSection(), 100);
        });
      }
    } catch (err) {
      console.error('[NulltracePanel] Error in attachEventListeners:', err);
    }
  }

  function switchTab(tab) {
    try {
      console.log('[NulltracePanel] switchTab:', tab);
      currentTab = tab;
      if (!shadowRoot) return;
      const tabs = shadowRoot.querySelectorAll('.nt-tab');
      tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
      const content = shadowRoot.getElementById('nt-content');
      if (content) {
        content.innerHTML = renderContent(tab, currentResult, currentEvidence);
        attachContentEventListeners();
      }
    } catch (err) {
      console.error('[NulltracePanel] Error in switchTab:', err);
    }
  }

  function attachContentEventListeners() {
    const screenshotBtn = shadowRoot.getElementById('nt-screenshot-btn');
    const downloadEvidenceBtn = shadowRoot.getElementById('nt-download-evidence-btn');

    if (screenshotBtn) {
      screenshotBtn.addEventListener('click', async () => {
        screenshotBtn.textContent = '⏳ Capturing...';
        const screenshot = await NulltraceEvidence.captureScreenshot();
        if (screenshot && currentEvidence) {
          currentEvidence.screenshot = screenshot;
          showFeedback('Screenshot captured!');
        } else {
          showFeedback('Screenshot failed');
        }
        screenshotBtn.textContent = '📸 Screenshot';
      });
    }

    if (downloadEvidenceBtn) {
      downloadEvidenceBtn.addEventListener('click', () => {
        const ev = { ...(currentEvidence || {}), threatResult: currentResult };
        NulltraceEvidence.downloadJson(ev);
      });
    }
  }

  async function openComplaintSection() {
    const section = shadowRoot.getElementById('nt-complaint-section');
    if (!section) return;
    section.style.display = 'block';

    try {
      const payload = NulltraceEvidence.buildComplaintPayload(
        currentResult,
        currentEvidence || currentResult.evidence || {},
        NulltracePlatform.getPlatformId()
      );
      const response = await NulltraceApi.generateComplaint(payload);

      const loading = shadowRoot.getElementById('nt-complaint-loading');
      const content = shadowRoot.getElementById('nt-complaint-content');

      if (loading) loading.style.display = 'none';
      if (content) content.style.display = 'block';

      const bodyEl = shadowRoot.getElementById('nt-complaint-body');
      const linksEl = shadowRoot.getElementById('nt-report-links');
      const copyBtn = shadowRoot.getElementById('nt-copy-complaint-btn');

      if (bodyEl && response.complaint) {
        bodyEl.textContent = response.complaint.body;
      }

      if (linksEl && response.complaint?.reportLinks) {
        linksEl.innerHTML = response.complaint.reportLinks
          .map((link) => `<a class="nt-report-link" href="${link.url}" target="_blank">🔗 ${link.label}</a>`)
          .join('');
      }

      if (copyBtn && response.complaint) {
        copyBtn.addEventListener('click', async () => {
          await NulltraceEvidence.copyToClipboard(response.complaint.body);
          showFeedback('Complaint copied!');
        });
      }
    } catch (err) {
      const loading = shadowRoot.getElementById('nt-complaint-loading');
      if (loading) loading.textContent = 'Failed to generate complaint. Try again.';
    }
  }

  function showFeedback(message) {
    const fb = shadowRoot.getElementById('nt-feedback');
    if (!fb) return;
    fb.textContent = message;
    fb.classList.add('show');
    setTimeout(() => fb.classList.remove('show'), 2000);
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  function show() {
    try {
      console.log('[NulltracePanel] Showing panel...');
      if (!panelRoot) createPanel();
      const panel = shadowRoot.getElementById('nulltrace-panel');
      if (panel) {
        panel.style.display = 'flex';
        isMinimized = false;
        panel.classList.remove('minimized');
      } else {
        console.error('[NulltracePanel] Cannot show: #nulltrace-panel is missing.');
      }
    } catch (err) {
      console.error('[NulltracePanel] Error showing panel:', err);
    }
  }

  function hide() {
    try {
      console.log('[NulltracePanel] Hiding panel...');
      if (!panelRoot) return;
      const panel = shadowRoot.getElementById('nulltrace-panel');
      if (panel) {
        panel.style.display = 'none';
      }
    } catch (err) {
      console.error('[NulltracePanel] Error hiding panel:', err);
    }
  }

  function setLoading(scanning = true) {
    try {
      console.log('[NulltracePanel] setLoading:', scanning);
      if (!panelRoot) createPanel();
      show();

      const loading = shadowRoot.getElementById('nt-loading');
      const tabs = shadowRoot.getElementById('nt-tabs');
      const content = shadowRoot.getElementById('nt-content');
      const actions = shadowRoot.getElementById('nt-actions');
      const errorDiv = shadowRoot.getElementById('nt-error');
      const badge = shadowRoot.getElementById('nt-risk-badge');

      if (loading) loading.style.display = scanning ? 'flex' : 'none';
      if (errorDiv) errorDiv.style.display = 'none';
      if (tabs) tabs.style.display = 'none';
      if (content) content.style.display = 'none';
      if (actions) actions.style.display = 'none';
      if (badge) {
        badge.textContent = 'SCANNING';
        badge.className = 'risk-low';
      }
    } catch (err) {
      console.error('[NulltracePanel] Error in setLoading:', err);
    }
  }

  function setError(message) {
    try {
      console.log('[NulltracePanel] setError:', message);
      if (!panelRoot) createPanel();
      show();

      const loading = shadowRoot.getElementById('nt-loading');
      const tabs = shadowRoot.getElementById('nt-tabs');
      const content = shadowRoot.getElementById('nt-content');
      const actions = shadowRoot.getElementById('nt-actions');
      const errorDiv = shadowRoot.getElementById('nt-error');
      const errorMsg = shadowRoot.getElementById('nt-error-msg');
      const badge = shadowRoot.getElementById('nt-risk-badge');

      if (loading) loading.style.display = 'none';
      if (errorDiv) errorDiv.style.display = 'block';
      if (tabs) tabs.style.display = 'none';
      if (content) content.style.display = 'none';
      if (actions) actions.style.display = 'none';
      if (errorMsg) errorMsg.textContent = message;
      if (badge) {
        badge.textContent = 'ERROR';
        badge.className = 'risk-medium';
      }
    } catch (err) {
      console.error('[NulltracePanel] Error in setError:', err);
    }
  }

  function setResult(result, evidence) {
    try {
      console.log('[NulltracePanel] setResult received:', result);
      if (!result) {
        setError('Empty response from backend.');
        return;
      }

      currentResult = result;
      currentEvidence = evidence;
      currentTab = 'overview';

      show();

      const loading = shadowRoot.getElementById('nt-loading');
      const tabs = shadowRoot.getElementById('nt-tabs');
      const content = shadowRoot.getElementById('nt-content');
      const actions = shadowRoot.getElementById('nt-actions');
      const errorDiv = shadowRoot.getElementById('nt-error');
      const badge = shadowRoot.getElementById('nt-risk-badge');
      const complaintBtn = shadowRoot.getElementById('nt-complaint-btn');

      if (loading) loading.style.display = 'none';
      if (errorDiv) errorDiv.style.display = 'none';
      if (tabs) tabs.style.display = 'flex';
      if (content) content.style.display = 'block';
      if (actions) actions.style.display = 'flex';

      const threat = result.threat;
      if (threat && badge) {
        // Update badge
        const riskClass = {
          CRITICAL: 'risk-critical',
          HIGH: 'risk-high',
          MEDIUM: 'risk-medium',
          LOW: 'risk-low',
        }[threat.riskLevel] || 'risk-low';
        badge.className = riskClass;
        badge.textContent = threat.riskLevel;

        // Show complaint button for HIGH/CRITICAL
        if (complaintBtn) {
          complaintBtn.style.display = (threat.riskLevel === 'HIGH' || threat.riskLevel === 'CRITICAL')
            ? 'flex' : 'none';
        }
      }

      // Render initial tab
      switchTab('overview');
    } catch (err) {
      console.error('[NulltracePanel] Error in setResult:', err);
      setError(`Render error: ${err.message}`);
    }
  }

  function setVoiceResult(result) {
    try {
      console.log('[NulltracePanel] setVoiceResult received:', result);
      if (!result) {
        setError('Empty voice response.');
        return;
      }

      show();

      const loading = shadowRoot.getElementById('nt-loading');
      const tabs = shadowRoot.getElementById('nt-tabs');
      const content = shadowRoot.getElementById('nt-content');
      const actions = shadowRoot.getElementById('nt-actions');
      const errorDiv = shadowRoot.getElementById('nt-error');
      const badge = shadowRoot.getElementById('nt-risk-badge');

      if (loading) loading.style.display = 'none';
      if (errorDiv) errorDiv.style.display = 'none';
      if (tabs) tabs.style.display = 'none';
      if (content) content.style.display = 'block';
      if (actions) actions.style.display = 'flex';

      // Update badge
      if (badge) {
        const riskClass = {
          CRITICAL: 'risk-critical',
          HIGH: 'risk-high',
          MEDIUM: 'risk-medium',
          LOW: 'risk-low',
        }[result.riskLevel] || 'risk-low';
        badge.className = riskClass;
        badge.textContent = result.riskLevel;
      }

      // Generate HTML
      const riskColor = RISK_COLORS[result.riskLevel] || '#888';
      const authenticityPercent = result.voiceType === 'Human Voice' ? result.confidence : Math.round(100 - result.confidence);
      
      content.innerHTML = `
        <div class="nt-card" style="border-left: 3px solid ${riskColor}">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <div style="font-weight:700; font-size:14px; color:#fff">🎤 Voice Authenticity</div>
            <div style="font-size:14px; font-weight:800; color:${riskColor}">${result.voiceType}</div>
          </div>
          <div class="nt-summary" style="margin-bottom:0">${result.summary}</div>
        </div>

        <div class="nt-card">
          <div class="nt-card-title"><span>📊</span> Detection Metrics</div>
          <div class="nt-prop-row">
            <span class="nt-prop-key">Authenticity Score</span>
            <span class="nt-prop-val" style="font-weight:700; color:#fff">${authenticityPercent}%</span>
          </div>
          <div class="nt-prop-row">
            <span class="nt-prop-key">Spoof Probability</span>
            <span class="nt-prop-val">${result.spoofProbability}</span>
          </div>
          <div class="nt-prop-row">
            <span class="nt-prop-key">Model Confidence</span>
            <span class="nt-prop-val">${result.confidence}%</span>
          </div>
          <div class="nt-prop-row">
            <span class="nt-prop-key">Model Used</span>
            <span class="nt-prop-val">Spectra-AASIST3</span>
          </div>
        </div>

        <div class="nt-card" style="background: rgba(240,196,0,0.05); border: 1px solid rgba(240,196,0,0.15)">
          <div class="nt-rec-label" style="color: #f0c400">Recommendation</div>
          <div class="nt-rec-action" style="background:transparent; border:none; padding:0; font-size:11px; color:rgba(255,255,255,0.7)">
            ${result.voiceType === 'AI Generated' 
              ? 'This recording may have been created using AI voice synthesis or voice cloning technology. Verify the source before trusting any information.'
              : 'This recording appears to be authentic. Always confirm critical operations via secondary verification protocols.'}
          </div>
        </div>
      `;

      // Set actions
      const copyBtn = shadowRoot.getElementById('nt-copy-btn');
      const downloadBtn = shadowRoot.getElementById('nt-download-btn');
      const complaintBtn = shadowRoot.getElementById('nt-complaint-btn');

      if (complaintBtn) complaintBtn.style.display = 'none';

      if (copyBtn) {
        copyBtn.onclick = () => {
          navigator.clipboard.writeText(JSON.stringify(result, null, 2));
          const feedback = shadowRoot.getElementById('nt-feedback');
          if (feedback) {
            feedback.textContent = 'Copied JSON!';
            feedback.className = 'nt-feedback show';
            setTimeout(() => { feedback.className = 'nt-feedback'; }, 1500);
          }
        };
      }

      if (downloadBtn) {
        downloadBtn.onclick = () => {
          const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `nulltrace-voice-${Date.now()}.json`;
          a.click();
          URL.revokeObjectURL(url);
        };
      }

    } catch (err) {
      console.error('[NulltracePanel] Error in setVoiceResult:', err);
      setError(`Render error: ${err.message}`);
    }
  }

  function showSafeNotification() {
    try {
      if (!panelRoot) createPanel();
      
      // Remove any existing toast
      let toast = shadowRoot.querySelector('.nt-toast');
      if (toast) toast.remove();
      
      toast = document.createElement('div');
      toast.className = 'nt-toast safe';
      toast.innerHTML = `<span>✓</span> Website appears safe.`;
      
      shadowRoot.appendChild(toast);
      
      setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    } catch (err) {
      console.error('[NulltracePanel] Error showing safe notification:', err);
    }
  }

  function showWarningNotification(url, result) {
    try {
      if (!panelRoot) createPanel();
      
      // Remove any existing toast
      let toast = shadowRoot.querySelector('.nt-toast');
      if (toast) toast.remove();
      
      let domain = 'unknown';
      try { domain = new URL(url).hostname; } catch (e) { domain = url; }
      
      toast = document.createElement('div');
      toast.className = 'nt-toast warn';
      
      const score = result.threat?.riskScore || 0;
      const riskLevel = result.threat?.riskLevel || 'HIGH';
      
      toast.innerHTML = `
        <span style="font-size:16px">⚠️</span>
        <div style="flex:1">
          <strong style="color:#ff6b6b">Nulltrace Alert:</strong> Suspicious site patterns on <strong>${domain}</strong> (${riskLevel} Risk, Score: ${score}/100). Click to analyze.
        </div>
      `;
      
      shadowRoot.appendChild(toast);
      
      toast.addEventListener('click', () => {
        toast.remove();
        show();
        setResult(result);
      });
      
      setTimeout(() => {
        if (toast.parentNode) {
          toast.classList.add('fade-out');
          setTimeout(() => toast.remove(), 300);
        }
      }, 8000);
    } catch (err) {
      console.error('[NulltracePanel] Error showing warning notification:', err);
    }
  }

  function setSafeBrowsingAlert(url, result, onContinue, onBlock, onViewAnalysis) {
    try {
      if (!panelRoot) createPanel();
      
      // Hide the default floating panel
      hide();
      
      // Remove existing overlay
      let overlay = shadowRoot.querySelector('.nt-shield-overlay');
      if (overlay) overlay.remove();
      
      overlay = document.createElement('div');
      overlay.className = 'nt-shield-overlay';
      
      let domain = 'unknown';
      try { domain = new URL(url).hostname; } catch (e) { domain = url; }
      
      const score = result.threat?.riskScore || 0;
      const riskLevel = result.threat?.riskLevel || 'LOW';
      const indicators = result.threat?.indicators || [];
      const recommendation = result.threat?.recommendedAction || 'Block navigation.';
      
      overlay.innerHTML = `
        <div class="nt-shield-alert-card">
          <div class="nt-shield-alert-header">
            <span style="font-size: 24px;">⚠️</span>
            <span class="nt-shield-alert-title">Potential Risk Detected</span>
          </div>
          
          <div style="font-size: 13px; color: #94a3b8; line-height: 1.5">
            You are attempting to visit a suspicious destination. Nulltrace Sentinel has blocked access for your security.
          </div>
          
          <div class="nt-shield-metric-label" style="margin-bottom: -12px;">Destination URL</div>
          <div class="nt-shield-dest">${domain}</div>
          
          <div class="nt-shield-metrics">
            <div class="nt-shield-metric">
              <div class="nt-shield-metric-label">Risk Level</div>
              <div class="nt-shield-metric-val" style="color: #ef4444;">${riskLevel}</div>
            </div>
            <div class="nt-shield-metric" style="border-left: 1px solid rgba(255, 255, 255, 0.1); padding-left: 20px;">
              <div class="nt-shield-metric-label">Threat Score</div>
              <div class="nt-shield-metric-val" style="color: #ef4444;">${score} <span style="font-size: 11px; font-weight: 500; color: #64748b;">/ 100</span></div>
            </div>
          </div>
          
          <div class="nt-shield-reasons">
            <div class="nt-shield-reasons-title">Reasons for block</div>
            ${indicators.length > 0 ? indicators.map(i => `
              <div class="nt-shield-reason-item">
                <span class="nt-shield-reason-dot">•</span>
                <span>${i}</span>
              </div>
            `).join('') : `
              <div class="nt-shield-reason-item">
                <span class="nt-shield-reason-dot">•</span>
                <span>Suspicious keywords, pattern or newly registered domain.</span>
              </div>
            `}
          </div>
          
          <div style="font-size: 11px; padding: 12px; background: rgba(239, 68, 68, 0.1); border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.2); color: #fca5a5;">
            <strong>Recommendation:</strong> ${recommendation}
          </div>
          
          <div class="nt-shield-btn-group">
            <button class="nt-shield-btn block" id="nt-shield-block-btn">🔴 Block Navigation</button>
            <button class="nt-shield-btn continue" id="nt-shield-continue-btn">🟢 Continue Anyway</button>
            <button class="nt-shield-btn analysis" id="nt-shield-analysis-btn">📄 View Full Analysis</button>
          </div>
        </div>
      `;
      
      shadowRoot.appendChild(overlay);
      
      shadowRoot.getElementById('nt-shield-continue-btn').addEventListener('click', () => {
        overlay.remove();
        if (onContinue) onContinue();
      });
      
      shadowRoot.getElementById('nt-shield-block-btn').addEventListener('click', () => {
        overlay.remove();
        if (onBlock) onBlock();
      });
      
      shadowRoot.getElementById('nt-shield-analysis-btn').addEventListener('click', () => {
        overlay.remove();
        show();
        setResult(result);
        if (onViewAnalysis) onViewAnalysis();
      });
      
    } catch (err) {
      console.error('[NulltracePanel] Error setting safe browsing alert:', err);
    }
  }

  return { show, hide, setLoading, setError, setResult, setVoiceResult, showSafeNotification, showWarningNotification, setSafeBrowsingAlert };
})();

// Export to window for content script access
if (typeof window !== 'undefined') {
  window.NulltracePanel = NulltracePanel;
}
