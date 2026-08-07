// DetectoAI Background Service Worker
const API_BASE_URL = "http://localhost:3000"; // Update for production

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "scan_selection",
    title: "Scan with DetectoAI",
    contexts: ["selection"]
  });
});

// Listen for context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "scan_selection" && info.selectionText) {
    try {
      const result = await analyzeText(info.selectionText, "selection");
      chrome.tabs.sendMessage(tab.id, { 
        action: "show_result", 
        result,
        selectionText: info.selectionText 
      });
    } catch (error) {
      console.error("Selection analysis error:", error);
    }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "analyze_text") {
    analyzeText(request.text, request.type || "message")
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }
});

async function analyzeText(text, type) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, type })
    });

    if (!response.ok) {
      let errorMsg = "Analysis failed";
      try {
        const errorData = await response.json();
        errorMsg = errorData.details || errorData.error || errorMsg;
      } catch (e) {
        errorMsg = `Server error: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMsg);
    }

    const analysis = await response.json();
    console.log("DetectoAI: Backend analysis received", analysis);
    
    // Map backend response fields to extension UI fields with robust defaults
    return {
      trustScore: typeof analysis.trustScore === 'number' ? analysis.trustScore : 50,
      riskLevel: analysis.riskLevel || 'unknown',
      explanation: analysis.analysis || analysis.explanation || "Forensic analysis complete. No specific threat patterns identified.", 
      isThreat: analysis.riskLevel === 'high' || analysis.riskLevel === 'critical'
    };
  } catch (error) {
    console.error("DetectoAI: API Error", error);
    if (error.message.includes("Failed to fetch")) {
      throw new Error("Cannot connect to DetectoAI Shield. Make sure http://localhost:3000 is running and reachable.");
    }
    throw error;
  }
}
