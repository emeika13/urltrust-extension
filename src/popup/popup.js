// Белый список доменов
const TRUSTED_DOMAINS = [
    "google.com", "github.com", "yandex.ru", "microsoft.com",
    "wikipedia.org", "vk.com", "samsung.com"
];

function getCleanUrl(fullUrl) {
    try {
        const url = new URL(fullUrl);
        let hostname = url.hostname;
        if (hostname.startsWith('www.')) {
            hostname = hostname.slice(4);
        }
        if (TRUSTED_DOMAINS.includes(hostname)) {
            return url.protocol + '//' + hostname;
        }
        let path = url.pathname;
        if (path !== '/' && path.endsWith('/')) {
            path = path.slice(0, -1);
        }
        return url.protocol + '//' + hostname + path;
    } catch (e) {
        console.error('Ошибка парсинга URL:', e);
        return fullUrl;
    }
}

function updateUI(data) {
    const verdictEl = document.getElementById('verdict');
    const probabilityEl = document.getElementById('probability');
    const riskLevelEl = document.getElementById('riskLevel');
    const currentUrlEl = document.getElementById('currentUrl');
    const checkedAtEl = document.getElementById('checkedAt');

    if (verdictEl) verdictEl.innerText = data.verdict;
    if (probabilityEl) probabilityEl.innerText = data.probability + '%';
    if (riskLevelEl) riskLevelEl.innerText = data.risk_level;
    if (currentUrlEl) currentUrlEl.innerText = data.url;
    if (checkedAtEl) checkedAtEl.innerText = new Date().toLocaleString();

    const card = document.getElementById('statusCard');
    if (card) {
        card.classList.remove('card-safe', 'card-warning', 'card-danger', 'card-neutral');
        if (data.risk_level.includes('НИЗКИЙ')) {
            card.classList.add('card-safe');
        } else if (data.risk_level.includes('СРЕДНИЙ')) {
            card.classList.add('card-warning');
        } else if (data.risk_level.includes('КРИТИЧЕСКИЙ') || data.verdict.includes('ФИШИНГ')) {
            card.classList.add('card-danger');
        } else {
            card.classList.add('card-neutral');
        }
    }
}

function showError(message) {
    const verdictEl = document.getElementById('verdict');
    const probabilityEl = document.getElementById('probability');
    const riskLevelEl = document.getElementById('riskLevel');
    if (verdictEl) verdictEl.innerText = '❌ ' + message;
    if (probabilityEl) probabilityEl.innerText = '—';
    if (riskLevelEl) riskLevelEl.innerText = 'Ошибка';
    const card = document.getElementById('statusCard');
    if (card) {
        card.classList.remove('card-safe', 'card-warning', 'card-danger');
        card.classList.add('card-neutral');
    }
}

async function checkCurrentTab() {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs || tabs.length === 0 || !tabs[0].url) {
            showError('Не удалось получить URL');
            return;
        }
        let rawUrl = tabs[0].url;
        if (rawUrl.startsWith('chrome://') || rawUrl.startsWith('browser://') || rawUrl.startsWith('about:')) {
            showError('Системная страница');
            return;
        }
        const cleanUrl = getCleanUrl(rawUrl);
        const currentUrlEl = document.getElementById('currentUrl');
        if (currentUrlEl) currentUrlEl.innerText = cleanUrl;

        const response = await fetch('http://localhost:8000/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: cleanUrl })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        data.url = cleanUrl;
        updateUI(data);
    } catch (error) {
        console.error('Ошибка соединения:', error);
        showError('Ошибка соединения с бэкендом');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkCurrentTab();
    const btn = document.getElementById('checkButton');
    if (btn) {
        btn.addEventListener('click', () => checkCurrentTab());
    }
});