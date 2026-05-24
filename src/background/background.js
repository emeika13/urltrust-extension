const API_URL = "http://localhost:8000/check";

function isInternalBrowserUrl(url) {
  return (
    !url ||
    url.startsWith("chrome://") ||
    url.startsWith("browser://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("file://")
  );
}

async function checkUrl(tabId, url) {
  if (isInternalBrowserUrl(url)) {
    return;
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const result = await response.json();

    await chrome.storage.local.set({
      [`urltrust:${url}`]: {
        ...result,
        checkedAt: new Date().toISOString()
      }
    });

    const probability = Number(result.probability ?? 0);

    if (result.is_phishing || probability >= 70) {
      chrome.action.setBadgeText({ tabId, text: "!" });
      chrome.action.setBadgeBackgroundColor({ tabId, color: "#D93025" });
    } else if (probability >= 30) {
      chrome.action.setBadgeText({ tabId, text: "?" });
      chrome.action.setBadgeBackgroundColor({ tabId, color: "#F9AB00" });
    } else {
      chrome.action.setBadgeText({ tabId, text: "✓" });
      chrome.action.setBadgeBackgroundColor({ tabId, color: "#188038" });
    }
  } catch (error) {
    console.error("URLTrust API error:", error);
    chrome.action.setBadgeText({ tabId, text: "?" });
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#5F6368" });

    await chrome.storage.local.set({
      [`urltrust:${url}`]: {
        url,
        verdict: "Ошибка проверки",
        probability: 0,
        risk_level: "Неизвестно",
        is_phishing: false,
        error: error.message,
        checkedAt: new Date().toISOString()
      }
    });
  }
}

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId === 0) {
    checkUrl(details.tabId, details.url);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    checkUrl(tabId, tab.url);
  }
});
