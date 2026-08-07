/* DetectoAI Content Script - Google & Global Compatibility Overhaul */
console.log("DetectoAI: Security Shield Active");

let isEnabled = true;
const processedContent = new Set();
let debounceTimer;
let floatingButton = null;
let activePopover = null;

// Initial state load
try {
    chrome.storage.local.get("enabled", (data) => {
        isEnabled = data.enabled !== false;
        console.log("DetectoAI status:", isEnabled ? "Active" : "Inactive");
        if (isEnabled) scanPage();
    });
} catch (e) { console.log("DetectoAI storage error:", e); }

// Universal Message Listener 
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggle") {
        isEnabled = request.enabled;
        if (isEnabled) { scanPage(); } else { removeAllBadges(); }
    } else if (request.action === "show_result") {
        showFloatingResult(request.result, null, null, request.selectionText);
    }
});

/**
 * ROBUST TEXT SELECTION logic
 * Optimized for Google (Search, Gmail) and complex DOMs.
 */
document.addEventListener("mouseup", (e) => {
    if (!isEnabled) return;
    if (e.target.closest('.detecto-badge, .detecto-selection-btn, .detecto-floating-result')) return;

    // Small delay to ensure browser finalizes selection
    setTimeout(() => {
        const selection = getDeepSelection();
        const selectedText = selection ? selection.toString().trim() : "";

        if (selectedText.length > 5 && !isInsideInput(selection?.anchorNode)) {
            try {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) return;

                // Positioning logic:
                // Use absolute positioning relative to the document.
                // Place it BELOW the selection (rect.bottom) for better Google compatibility.
                const x = rect.left + (rect.width / 2) + window.scrollX;
                const y = rect.bottom + window.scrollY;

                injectSelectionButton(x, y, selectedText);
            } catch (err) { console.error("DetectoAI selection err:", err); }
        } else {
            setTimeout(() => { if (!isClickingButton(e.target)) hideSelectionButton(); }, 100);
        }
    }, 10);
});

// Traversing Shadow Roots for selections if needed
function getDeepSelection() {
    let focusNode = window.getSelection().focusNode;
    if (focusNode?.parentElement?.shadowRoot) {
        // Handle simple shadow root selection (may need complex traversal for multi-layer)
        return focusNode.parentElement.shadowRoot.getSelection();
    }
    return window.getSelection();
}

function isInsideInput(node) {
    if (!node) return false;
    const parent = node.nodeType === 3 ? node.parentElement : node;
    return parent.closest('input, textarea, [contenteditable="true"]');
}

function isClickingButton(target) { return target.closest('.detecto-selection-btn'); }

function injectSelectionButton(x, y, text) {
    if (floatingButton) floatingButton.remove();

    floatingButton = document.createElement("div");
    floatingButton.className = "detecto-selection-btn";
    
    // Explicit position calculations with high z-index
    floatingButton.style.cssText = `
        position: absolute !important;
        left: ${x}px !important;
        top: ${y + 8}px !important;
        z-index: 2147483647 !important;
        transform: translate(-50%, 0) !important;
    `;

    floatingButton.innerHTML = `🛡️ Scan with DetectoAI`;

    floatingButton.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        floatingButton.innerHTML = "🛡️ Analyzing...";
        floatingButton.classList.add('loading');

        chrome.runtime.sendMessage({ 
            action: "analyze_text", 
            text, 
            type: "Selected Text" 
        }, (response) => {
            if (response && response.success) {
                showFloatingResult(response.result, x, y + 30, text); 
            } else {
                const errorMsg = response?.error || "Shield timeout.";
                alert(`DetectoAI Error: ${errorMsg}`);
            }
            hideSelectionButton();
        });
    };

    document.body.appendChild(floatingButton);
}

function hideSelectionButton() {
    if (floatingButton) { floatingButton.remove(); floatingButton = null; }
}

/**
 * FLOATING UI OVERLAY
 */
function showFloatingResult(result, x = null, y = null, originalText = "") {
    if (activePopover) activePopover.remove();

    const popover = document.createElement("div");
    const safeRiskLevel = (result.riskLevel || 'low').toLowerCase();
    popover.className = `detecto-floating-result ${safeRiskLevel}`;
    popover.style.zIndex = "2147483647";

    if (x === null || isNaN(x)) {
        popover.style.cssText = `
            position: fixed !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            z-index: 2147483647 !important;
        `;
    } else {
        popover.style.cssText = `
            position: absolute !important;
            left: ${x}px !important;
            top: ${y + 10}px !important; 
            transform: translate(-50%, 0) !important;
            z-index: 2147483647 !important;
        `;
    }

    const scoreColor = getRiskColor(safeRiskLevel);
    const trustScore = typeof result.trustScore === 'number' ? result.trustScore : 50;

    popover.innerHTML = `
        <div class="detecto-close-btn" title="Close">&times;</div>
        <div class="detecto-popover-header">
            <div class="detecto-brand">
                <span class="detecto-chip ${safeRiskLevel}">${safeRiskLevel.toUpperCase()} RISK</span>
            </div>
        </div>
        <div class="detecto-popover-body">
            ${originalText ? `
                <div class="detecto-snippet-box">
                    <div class="detecto-snippet-label">SENTINEL SCAN</div>
                    <div class="detecto-snippet-text">"${originalText.substring(0, 100)}..."</div>
                </div>
            ` : ''}
            <div class="detecto-score-section">
                <div class="detecto-score-header">
                    <span class="detecto-trust-label">Trust Quotient</span>
                    <span class="detecto-trust-value" style="color: ${scoreColor}">${trustScore}%</span>
                </div>
                <div class="detecto-score-track"><div class="detecto-score-fill" style="width: ${trustScore}%; background: ${scoreColor}"></div></div>
            </div>
            <div class="detecto-reasoning">
                <div class="detecto-reasoning-label">FORENSIC ANALYSIS</div>
                <p class="detecto-explanation-text">${result.explanation || "No immediate threats detected."}</p>
            </div>
        </div>
        <div class="detecto-popover-footer">
            <a href="http://localhost:3000/dashboard" target="_blank" class="detecto-full-report-btn">Dashboard Forensic View →</a>
        </div>
    `;

    popover.querySelector(".detecto-close-btn").onclick = () => { popover.remove(); activePopover = null; };
    document.body.appendChild(popover);
    activePopover = popover;
}

function getRiskColor(level) {
    switch(level.toLowerCase()) {
        case 'critical': return '#ef4444';
        case 'high': return '#f97316';
        case 'medium': return '#eab308';
        default: return '#22d3ee';
    }
}

/**
 * AUTO-SCAN LOGIC
 */
function scanPage() {
    if (!isEnabled) return;
    const h = window.location.hostname;
    if (h.includes("whatsapp.com")) scanWhatsApp();
    else if (h.includes("mail.google.com")) scanGmail();
    else scanGeneric();
}

function scanWhatsApp() {
    const s = [".message-in", ".message-out", "[role='row'] :not(input):not(textarea)", ".chat-line-middle"];
    document.querySelectorAll(s.join(", ")).forEach(c => {
        if (c.querySelector(".detecto-badge")) return;
        const t = c.querySelector("span.selectable-text, .copyable-text span, ._1Gy50");
        if (t && t.textContent.trim().length > 5) injectBadge(c, t.textContent.trim(), "WhatsApp Message");
    });
}

function scanGmail() {
    document.querySelectorAll(".adn.ads, .zA, .ii.gt").forEach(c => {
        if (c.querySelector(".detecto-badge")) return;
        const t = c.querySelector(".a3s, .y2, div[dir='ltr']");
        if (t && t.textContent.trim().length > 10) injectBadge(c, t.textContent.trim(), "Email Content");
    });
}

function scanGeneric() {
    document.querySelectorAll("article, [role='article'], .comment, .message, .post-text").forEach(c => {
        if (c.querySelector(".detecto-badge")) return;
        const t = c.textContent.trim();
        if (t.length > 20 && t.length < 1000 && !processedContent.has(t)) injectBadge(c, t, "Aggregated Site Content");
    });
}

function injectBadge(c, t, type) {
    if (processedContent.has(t)) return;
    processedContent.add(t);
    const b = document.createElement("div");
    b.className = "detecto-badge loading";
    b.innerHTML = `🛡️ <span class="badge-text">SCANNING</span>`;
    const s = window.getComputedStyle(c);
    if (s.position === 'static') c.style.position = "relative";
    c.appendChild(b);
    chrome.runtime.sendMessage({ action: "analyze_text", text: t, type }, (r) => {
        if (r && r.success) { updateBadge(b, r.result); } else { b.remove(); }
    });
}

function updateBadge(b, r) {
    b.className = `detecto-badge ${r.riskLevel.toLowerCase()}`;
    b.innerHTML = `🛡️ <span class="badge-text">${r.riskLevel.toUpperCase()}</span>`;
    b.onclick = (e) => {
        e.stopPropagation();
        const rect = b.getBoundingClientRect();
        showFloatingResult(r, rect.left + window.scrollX, rect.top + window.scrollY + 20, "");
    };
}

function removeAllBadges() { document.querySelectorAll(".detecto-badge, .detecto-selection-btn, .detecto-floating-result").forEach(el => el.remove()); }

const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(scanPage, 1500);
});

observer.observe(document.body, { childList: true, subtree: true });
setTimeout(scanPage, 2000);
