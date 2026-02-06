# API для интеграции с системой 1С

## Базовый URL

https://api.1c-project.example.com/v1

text

## Аутентификация
```bash
curl -X POST https://api.1c-project.example.com/auth \
  -H "Content-Type: application/json" \
  -d '{"username": "api_user", "password": "secret"}'
Ответ:

json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600
}
Эндпоинты
1. Получение ТОП товаров
http
GET /reports/top-products
Параметры:

start_date (required): Начало периода (YYYY-MM-DD)

end_date (required): Конец периода (YYYY-MM-DD)

detail (optional): Детализация (day/month/quarter)

limit (optional): Количество записей (default: 10)

Пример:

bash
curl -X GET \
  'https://api.1c-project.example.com/v1/reports/top-products?start_date=2023-01-01&end_date=2023-12-31' \
  -H 'Authorization: Bearer YOUR_TOKEN'
Ответ:

json
{
  "success": true,
  "data": [
    {
      "product": "Товар 1",
      "sales_count": 1250,
      "sales_amount": 1250000.50,
      "period": "2023-01"
    }
  ],
  "metadata": {
    "generated_in": 0.45,
    "cached": true
  }
}
2. Генерация тестовых данных
http
POST /test/generate-data
Тело запроса:

json
{
  "days_count": 365,
  "sales_per_day": 100,
  "products_count": 1000
}
3. Мониторинг производительности
http
GET /monitoring/slow-queries
4. Управление кэшем
http
DELETE /cache/invalidate?date=2023-12-01
WebSocket для реальных обновлений
javascript
// Подключение к WebSocket
const ws = new WebSocket('wss://api.1c-project.example.com/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'cache_invalidated') {
    console.log('Кэш обновлен для даты:', data.date);
  }
};
Обработка ошибок
json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Неверный формат даты",
    "details": {
      "field": "start_date",
      "expected": "YYYY-MM-DD"
    }
  }
}
Примеры на разных языках
Python:

python
import requests

class OneCApi:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {'Authorization': f'Bearer {token}'}
    
    def get_top_products(self, start_date, end_date):
        response = requests.get(
            f'{self.base_url}/reports/top-products',
            params={'start_date': start_date, 'end_date': end_date},
            headers=self.headers
        )
        return response.json()
JavaScript:

javascript
class OneCApiClient {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.token = token;
  }
  
  async getTopProducts(startDate, endDate) {
    const response = await fetch(
      `${this.baseUrl}/reports/top-products?start_date=${startDate}&end_date=${endDate}`,
      {
        headers: { 'Authorization': `Bearer ${this.token}` }
      }
    );
    return await response.json();
  }
}
text

## 📊 **5. Дашборды мониторинга в Grafana**

**`monitoring/grafana/dashboard.json`**
```json
{
  "dashboard": {
    "title": "1C Optimization Project Dashboard",
    "panels": [
      {
        "title": "Производительность запросов",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(1c_query_duration_seconds_sum[5m]) / rate(1c_query_duration_seconds_count[5m])",
            "legendFormat": "{{query_name}}"
          }
        ],
        "yaxes": [
          {"format": "s", "min": 0},
          {"format": "short"}
        ]
      },
      {
        "title": "ТОП медленных запросов",
        "type": "table",
        "targets": [
          {
            "expr": "topk(10, 1c_slow_query_duration_seconds)",
            "instant": true,
            "format": "table"
          }
        ],
        "columns": [
          {"text": "Query", "type": "string"},
          {"text": "Duration (s)", "type": "number"}
        ]
      },
      {
        "title": "Эффективность кэша",
        "type": "stat",
        "targets": [
          {
            "expr": "1c_cache_hit_ratio * 100",
            "format": "percent"
          }
        ],
        "thresholds": {
          "steps": [
            {"color": "red", "value": 70},
            {"color": "yellow", "value": 85},
            {"color": "green", "value": 95}
          ]
        }
      },
      {
        "title": "Загрузка СУБД",
        "type": "gauge",
        "targets": [
          {
            "expr": "pg_stat_database_numbackends{datname=\"1c_test_db\"}",
            "legendFormat": "Active connections"
          }
        ],
        "max": 100
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    }
  }
}
