// Nulltrace Sentinel — Platform Detector
// Detects the current platform to enable platform-aware scanning behavior

const NulltracePlatform = (() => {
  const PLATFORM_PATTERNS = [
    {
      id: 'gmail',
      label: 'Gmail',
      patterns: [/mail\.google\.com/i, /gmail\.com/i],
      emoji: '📧',
      color: '#EA4335',
    },
    {
      id: 'instagram',
      label: 'Instagram',
      patterns: [/instagram\.com/i, /instagr\.am/i],
      emoji: '📸',
      color: '#E1306C',
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp Web',
      patterns: [/web\.whatsapp\.com/i, /whatsapp\.com/i],
      emoji: '💬',
      color: '#25D366',
    },
    {
      id: 'twitter',
      label: 'X / Twitter',
      patterns: [/twitter\.com/i, /x\.com/i],
      emoji: '🐦',
      color: '#1DA1F2',
    },
    {
      id: 'facebook',
      label: 'Facebook',
      patterns: [/facebook\.com/i, /fb\.com/i],
      emoji: '👍',
      color: '#1877F2',
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      patterns: [/linkedin\.com/i],
      emoji: '💼',
      color: '#0A66C2',
    },
    {
      id: 'telegram',
      label: 'Telegram Web',
      patterns: [/web\.telegram\.org/i, /telegram\.org/i],
      emoji: '✈️',
      color: '#26A5E4',
    },
    {
      id: 'youtube',
      label: 'YouTube',
      patterns: [/youtube\.com/i, /youtu\.be/i],
      emoji: '▶️',
      color: '#FF0000',
    },
    {
      id: 'amazon',
      label: 'Amazon',
      patterns: [/amazon\.(in|com|co\.uk)/i],
      emoji: '🛒',
      color: '#FF9900',
    },
    {
      id: 'banking',
      label: 'Banking Site',
      patterns: [/sbi\.co\.in/i, /hdfcbank\.com/i, /icicibank\.com/i, /axisbank\.com/i, /paytm\.com/i, /phonpe\.com/i, /googlepay/i],
      emoji: '🏦',
      color: '#4CAF50',
    },
  ];

  /**
   * Detect platform from current URL
   * @returns {{ id: string, label: string, emoji: string, color: string } | null}
   */
  function detect() {
    const url = window.location.href;
    for (const platform of PLATFORM_PATTERNS) {
      if (platform.patterns.some((p) => p.test(url))) {
        return platform;
      }
    }
    return null;
  }

  /**
   * Get platform ID string for API calls
   * @returns {string}
   */
  function getPlatformId() {
    const platform = detect();
    return platform ? platform.id : 'general';
  }

  /**
   * Get platform-specific scan suggestions
   * @param {string} platformId
   * @returns {string[]}
   */
  function getScanSuggestions(platformId) {
    const suggestions = {
      gmail: [
        'Select email body text to scan for phishing',
        'Right-click on suspicious links to analyze',
        'Look for urgent or threatening language',
      ],
      instagram: [
        'Select bio or message text to scan',
        'Analyze profile URLs for suspicious patterns',
        'Watch for fake verification badges in descriptions',
      ],
      whatsapp: [
        'Select message text to scan for scams',
        'Analyze forwarded links with Nulltrace',
        'Be cautious of messages requesting OTP or payment',
      ],
      twitter: [
        'Scan suspicious bio or tweet text',
        'Analyze shortened links before clicking',
        'Watch for impersonation of verified accounts',
      ],
      general: [
        'Select suspicious text to scan',
        'Right-click links to analyze before clicking',
        'Use "Scan This Page" for full page analysis',
      ],
    };
    return suggestions[platformId] || suggestions.general;
  }

  /**
   * Extract platform-relevant text from the page
   * For Gmail: tries to get email body
   * For WhatsApp: tries to get chat messages
   */
  function extractPlatformContent() {
    const platform = detect();
    if (!platform) return null;

    try {
      switch (platform.id) {
        case 'gmail': {
          // Gmail email body containers
          const emailBody = document.querySelector('.a3s.aiL, .ii.gt, [data-message-id] .a3s');
          if (emailBody) {
            return {
              type: 'email',
              content: emailBody.innerText.slice(0, 3000),
              source: 'Gmail email body',
            };
          }
          break;
        }
        case 'whatsapp': {
          // WhatsApp message bubbles
          const messages = document.querySelectorAll('.message-in .copyable-text, .message-out .copyable-text');
          if (messages.length > 0) {
            const text = Array.from(messages)
              .slice(-10) // last 10 messages
              .map((m) => m.innerText)
              .join('\n');
            return {
              type: 'chat',
              content: text.slice(0, 3000),
              source: 'WhatsApp messages',
            };
          }
          break;
        }
        case 'instagram': {
          // Instagram bio or post captions
          const bio = document.querySelector('._aacl._aaco._aacu._aacx._aad7._aade, header section ._aa_-');
          if (bio) {
            return {
              type: 'profile',
              content: bio.innerText.slice(0, 1000),
              source: 'Instagram profile',
            };
          }
          break;
        }
      }
    } catch (e) {
      console.warn('[Nulltrace] Platform content extraction failed:', e);
    }

    return null;
  }

  return {
    detect,
    getPlatformId,
    getScanSuggestions,
    extractPlatformContent,
  };
})();

if (typeof window !== 'undefined') {
  window.NulltracePlatform = NulltracePlatform;
}
