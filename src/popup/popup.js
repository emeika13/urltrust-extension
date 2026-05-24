const API_URL = "http://localhost:8000/check";

const verdictEl = document.getElementById("verdict");
const probabilityEl = document.getElementById("probability");
const riskLevelEl = document.getElementById("riskLevel");
const currentUrlEl = document.getElementById("currentUrl");
const statusCardEl = document.getElementById("statusCard");
const errorBoxEl = document.getElementById("errorBox");
const checkButtonEl = document.getElementById("checkButton");
const checkedAtEl = document.getElementById("checkedAt");

function setLoading(url) {
  verdictEl.textContent = "Проверка...";
  probabilityEl.textContent = "—";
  riskLevelEl.textContent = "Отправляем URL на ML-модель";
  currentUrlEl.textContent = url || "—";
  statusCardEl.className = "card card-neutral";
  errorBoxEl.classList.add("hidden");
  checkButtonEl.disabled = true;
}

function setError(message) {
  errorBoxEl.textContent = message;
  errorBoxEl.classList.remove("hidden");
  statusCardEl.className = "card card-neutral";
  verdictEl.textContent = "Ошибка проверки";
  probabilityEl.textContent = "—";
  riskLevelEl.textContent = "Проверьте, запущен ли backend";
  checkButtonEl.disabled = false;
}

function renderResult(result) {
  const probability = Number(result.probability ?? 0);
  const isPhishing = Boolean(result.is_phishing);

  verdictEl.textContent = result.verdict || (isPhishing ? "⚠️ ФИШИНГ!" : "✅ ЛЕГИТИМНЫЙ САЙТ");
  probabilityEl.textContent = `${probability.toFixed(2)}%`;
  riskLevelEl.textContent = result.risk_level || "Уровень риска не определён";

  if (isPhishing || probability >= 70) {
    statusCardEl.className = "card card-danger";
  } else if (probability >= 30) {
    statusCardEl.className = "card card-warning";
  } else {
    statusCardEl.className = "card card-safe";
  }

  if (result.checkedAt) {
    checkedAtEl.textContent = `Проверено: ${new Date(result.checkedAt).toLocaleString("ru-RU")}`;
  } else {
    checkedAtEl.textContent = "URLTrust ML Detector";
  }

  errorBoxEl.classList.add("hidden");
  checkButtonEl.disabled = false;
}

async function getCurrentTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
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

async function checkCurrentSite() {
  const tab = await getCurrentTab();
  const url = tab?.url;

  currentUrlEl.textContent = url || "—";

  if (isInternalBrowserUrl(url)) {
    setError("Внутренние страницы браузера не проверяются.");
    return;
  }

  setLoading(url);

  try {
    const cached = await chrome.storage.local.get(`urltrust:${url}`);
    const cachedResult = cached[`urltrust:${url}`];

    if (cachedResult && !cachedResult.error) {
      renderResult(cachedResult);
      return;
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      throw new Error(`Backend вернул ошибку ${response.status}`);
    }

    const result = await response.json();
    result.checkedAt = new Date().toISOString();

    await chrome.storage.local.set({ [`urltrust:${url}`]: result });
    renderResult(result);
  } catch (error) {
    setError(`Не удалось проверить сайт: ${error.message}`);
  }
}

checkButtonEl.addEventListener("click", async () => {
  const tab = await getCurrentTab();
  const url = tab?.url;
  if (url) {
    await chrome.storage.local.remove(`urltrust:${url}`);
  }
  checkCurrentSite();
});

document.addEventListener("DOMContentLoaded", checkCurrentSite);
