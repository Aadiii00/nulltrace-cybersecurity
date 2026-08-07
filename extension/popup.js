/* DetectoAI Popup Logic */
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("toggle-shield");
  const statusText = document.getElementById("status-text");

  // Load state
  chrome.storage.local.get("enabled", (data) => {
    const isEnabled = data.enabled !== false;
    toggle.checked = isEnabled;
    updateUI(isEnabled);
  });

  // Handle toggle
  toggle.addEventListener("change", (e) => {
    const isEnabled = e.target.checked;
    chrome.storage.local.set({ enabled: isEnabled });
    updateUI(isEnabled);

    // Notify active tabs
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { action: "toggle", enabled: isEnabled }).catch(() => {});
      });
    });
  });

  function updateUI(isEnabled) {
    statusText.textContent = isEnabled ? "SHIELD ACTIVE" : "SHIELD INACTIVE";
    statusText.className = isEnabled ? "status-active" : "status-inactive";
  }
});
