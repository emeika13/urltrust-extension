// Адрес backend-сервера URLTrust.
// Backend должен быть запущен отдельно, например: http://localhost:8000
const URLTRUST_CONFIG = {
  API_URL: "http://localhost:8000/check",
  HEALTH_URL: "http://localhost:8000/health",
  HIGH_RISK_THRESHOLD: 70,
  MEDIUM_RISK_THRESHOLD: 30
};
