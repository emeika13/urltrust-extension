const API_URL = "http://localhost:8000/check";

// Белый список доменов, для которых очищаем всё, кроме домена
const TRUSTED_DOMAINS = [
    "google.com", "github.com", "yandex.ru", "microsoft.com",
    "wikipedia.org", "vk.com", "samsung.com"
];

function normalizeUrl(fullUrl) {
    try {
        const url = new URL(fullUrl);
        let hostname = url.hostname;
        if (hostname.startsWith('www.')) {
            hostname = hostname.slice(4);
        }
        // Если домен в белом списке – возвращаем только схему + домен
        if (TRUSTED_DOMAINS.includes(hostname)) {
            return url.protocol + '//' + hostname;
        }
        // Иначе – оставляем путь (без параметров и якоря)
        let path = url.pathname;
        if (path !== '/' && path.endsWith('/')) {
            path = path.slice(0, -1);
        }
        const clean = url.protocol + '//' + hostname + path;
        return clean;
    } catch (e) {
        console.error('normalizeUrl error:', e);
        return fullUrl;
    }
}

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
    if (isInternalBrowserUrl(url)) return;

    const cleanUrl = normalizeUrl(url);
    console.log(`Checking: ${cleanUrl}`);

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: cleanUrl })
        });

        if (!response.ok) throw new Error(`Backend error: ${response.status}`);

        const result = await response.json();
        const probability = Number(result.probability ?? 0);
        const HIGH = 50;
        const MEDIUM = 30;

        await chrome.storage.local.set({
            [`urltrust:${url}`]: {
                ...result,
                checkedAt: new Date().toISOString()
            }
        });

        if (result.is_phishing || probability >= HIGH) {
            chrome.action.setBadgeText({ tabId, text: "!" });
            chrome.action.setBadgeBackgroundColor({ tabId, color: "#D93025" });
        } else if (probability >= MEDIUM) {
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
    }
}

chrome.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId === 0) checkUrl(details.tabId, details.url);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url) checkUrl(tabId, tab.url);
});