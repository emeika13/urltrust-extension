# URLTrust Extension

Расширение для Яндекс Браузера, которое проверяет текущий URL через backend URLTrust и показывает вероятность фишинга.

## Как работает

1. Расширение получает URL текущей вкладки.
2. Отправляет URL на backend: `http://localhost:8000/check`.
3. Backend извлекает признаки URL и применяет Random Forest модель.
4. Расширение показывает вердикт, вероятность фишинга и уровень риска.

## Структура

```text
urltrust-extension/
├── manifest.json
├── config.js
├── src/
│   ├── background/
│   │   └── background.js
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   └── icons/
│       ├── icon16.png
│       ├── icon28.png
│       └── icon128.png
├── .gitignore
└── README.md
```

## Запуск

1. Сначала запустить backend URLTrust на Python/FastAPI.
2. Убедиться, что backend доступен по адресу:

```text
http://localhost:8000/health
```

3. Открыть Яндекс Браузер.
4. Перейти на страницу:

```text
browser://extensions
```

5. Включить режим разработчика.
6. Нажать **Загрузить распакованное расширение**.
7. Выбрать папку `urltrust-extension`.

## Backend API

Расширение ожидает endpoint:

```http
POST http://localhost:8000/check
```

Тело запроса:

```json
{
  "url": "https://example.com"
}
```

Ожидаемый ответ:

```json
{
  "url": "https://example.com",
  "verdict": "✅ ЛЕГИТИМНЫЙ САЙТ",
  "probability": 8.5,
  "risk_level": "🟢 НИЗКИЙ",
  "is_phishing": false
}
```

## Назначение

Проект URLTrust используется для выявления фишинговых веб-ресурсов на основе анализа URL и структурных признаков.
