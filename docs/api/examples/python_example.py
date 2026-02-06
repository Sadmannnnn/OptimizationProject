#!/usr/bin/env python3
"""
Пример использования API 1С Optimization Project на Python
"""

import requests
import json
from datetime import datetime, timedelta
import pandas as pd
from typing import Dict, List, Optional

class OneCApiClient:
    """Клиент для работы с API 1С системы"""
    
    def __init__(self, base_url: str, token: str):
        """
        Инициализация клиента
        
        Args:
            base_url: Базовый URL API (например, https://api.1c-project.example.com/v1)
            token: JWT токен для аутентификации
        """
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    
    def get_top_products(self, start_date: str, end_date: str, 
                        detail: str = 'month', limit: int = 10) -> Dict:
        """
        Получить ТОП товаров за период
        
        Args:
            start_date: Начало периода (YYYY-MM-DD)
            end_date: Конец периода (YYYY-MM-DD)
            detail: Детализация (day/month/quarter)
            limit: Количество записей
        
        Returns:
            Словарь с данными отчета
        """
        params = {
            'start_date': start_date,
            'end_date': end_date,
            'detail': detail,
            'limit': limit
        }
        
        response = requests.get(
            f'{self.base_url}/reports/top-products',
            params=params,
            headers=self.headers
        )
        
        response.raise_for_status()
        return response.json()
    
    def generate_test_data(self, days_count: int = 365, 
                          sales_per_day: int = 100,
                          products_count: int = 1000) -> Dict:
        """
        Генерация тестовых данных
        
        Args:
            days_count: Количество дней
            sales_per_day: Продаж в день
            products_count: Количество товаров
        
        Returns:
            Статус операции
        """
        data = {
            'days_count': days_count,
            'sales_per_day': sales_per_day,
            'products_count': products_count
        }
        
        response = requests.post(
            f'{self.base_url}/test/generate-data',
            json=data,
            headers=self.headers
        )
        
        response.raise_for_status()
        return response.json()
    
    def get_slow_queries(self, limit: int = 20) -> List[Dict]:
        """
        Получить список медленных запросов
        
        Args:
            limit: Максимальное количество записей
        
        Returns:
            Список медленных запросов
        """
        response = requests.get(
            f'{self.base_url}/monitoring/slow-queries',
            params={'limit': limit},
            headers=self.headers
        )
        
        response.raise_for_status()
        return response.json()['data']
    
    def invalidate_cache(self, date: Optional[str] = None) -> bool:
        """
        Инвалидация кэша
        
        Args:
            date: Дата для инвалидации (YYYY-MM-DD), если None - весь кэш
        
        Returns:
            Успешность операции
        """
        params = {}
        if date:
            params['date'] = date
        
        response = requests.delete(
            f'{self.base_url}/cache/invalidate',
            params=params,
            headers=self.headers
        )
        
        response.raise_for_status()
        return response.json()['success']
    
    def get_performance_metrics(self, time_range: str = '1h') -> Dict:
        """
        Получение метрик производительности
        
        Args:
            time_range: Диапазон времени (1h, 24h, 7d)
        
        Returns:
            Метрики производительности
        """
        response = requests.get(
            f'{self.base_url}/monitoring/metrics',
            params={'range': time_range},
            headers=self.headers
        )
        
        response.raise_for_status()
        return response.json()
    
    def stream_updates(self, callback):
        """
        Подписка на обновления через WebSocket
        
        Args:
            callback: Функция для обработки сообщений
        """
        import websocket
        import threading
        
        def on_message(ws, message):
            data = json.loads(message)
            callback(data)
        
        def on_error(ws, error):
            print(f"WebSocket error: {error}")
        
        def on_close(ws):
            print("WebSocket connection closed")
        
        def on_open(ws):
            print("WebSocket connection established")
        
        # Заменяем протокол и порт для WebSocket
        ws_url = self.base_url.replace('https://', 'wss://').replace('http://', 'ws://')
        ws_url = ws_url.replace('/v1', '/ws')
        
        ws = websocket.WebSocketApp(
            ws_url,
            header={'Authorization': f'Bearer {self.token}'},
            on_message=on_message,
            on_error=on_error,
            on_close=on_close,
            on_open=on_open
        )
        
        # Запуск в отдельном потоке
        wst = threading.Thread(target=ws.run_forever)
        wst.daemon = True
        wst.start()


# Пример использования
if __name__ == "__main__":
    # Конфигурация
    BASE_URL = "https://api.1c-project.example.com/v1"
    API_TOKEN = "your_jwt_token_here"
    
    # Создание клиента
    client = OneCApiClient(BASE_URL, API_TOKEN)
    
    print("=== Пример использования API 1С Optimization Project ===\n")
    
    # 1. Получение ТОП товаров
    try:
        today = datetime.now().strftime('%Y-%m-%d')
        month_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        
        result = client.get_top_products(month_ago, today)
        
        if result['success']:
            print(f"ТОП товаров за последние 30 дней:")
            print(f"Время генерации: {result['metadata']['generated_in']} сек.")
            print(f"Из кэша: {'Да' if result['metadata']['cached'] else 'Нет'}\n")
            
            # Преобразование в DataFrame для красивого вывода
            df = pd.DataFrame(result['data'])
            print(df.to_string(index=False))
        else:
            print(f"Ошибка: {result['error']['message']}")
    
    except requests.exceptions.RequestException as e:
        print(f"Ошибка запроса: {e}")
    
    # 2. Получение медленных запросов
    print("\n" + "="*50 + "\n")
    
    try:
        slow_queries = client.get_slow_queries(limit=5)
        print(f"ТОП-5 медленных запросов:")
        
        for i, query in enumerate(slow_queries, 1):
            print(f"{i}. {query['query_name']}: {query['avg_duration']:.3f} сек.")
    
    except Exception as e:
        print(f"Ошибка при получении медленных запросов: {e}")
    
    # 3. Генерация тестовых данных (закомментировано для безопасности)
    """
    print("\n" + "="*50 + "\n")
    
    try:
        confirmation = input("Сгенерировать тестовые данные? (y/n): ")
        if confirmation.lower() == 'y':
            result = client.generate_test_data(days_count=30, sales_per_day=50)
            if result['success']:
                print(f"Успешно сгенерировано: {result['message']}")
            else:
                print(f"Ошибка: {result['error']}")
    except Exception as e:
        print(f"Ошибка: {e}")
    """
    
    # 4. Пример обработки обновлений через WebSocket
    def handle_update(data):
        """Обработчик обновлений"""
        print(f"\nПолучено обновление: {data['type']}")
        if data['type'] == 'cache_invalidated':
            print(f"Кэш инвалидирован для даты: {data.get('date', 'all')}")
        elif data['type'] == 'new_sales':
            print(f"Новые продажи: {data['count']} записей")
    
    # Подписка на обновления (раскомментировать при необходимости)
    # print("\nПодключение к WebSocket для обновлений...")
    # client.stream_updates(handle_update)
    
    print("\n=== Пример завершен ===")


# Дополнительные утилиты
def export_to_excel(data: Dict, filename: str = 'top_products.xlsx'):
    """Экспорт данных в Excel"""
    df = pd.DataFrame(data['data'])
    df.to_excel(filename, index=False)
    print(f"Данные экспортированы в {filename}")


def create_visualization(data: Dict):
    """Создание визуализации"""
    import matplotlib.pyplot as plt
    
    df = pd.DataFrame(data['data'])
    
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 6))
    
    # График продаж по количеству
    df_sorted = df.sort_values('sales_count', ascending=False).head(10)
    ax1.barh(df_sorted['product'], df_sorted['sales_count'])
    ax1.set_xlabel('Количество продаж')
    ax1.set_title('ТОП-10 товаров по количеству')
    ax1.invert_yaxis()
    
    # График продаж по сумме
    df_sorted = df.sort_values('sales_amount', ascending=False).head(10)
    ax2.barh(df_sorted['product'], df_sorted['sales_amount'] / 1000)
    ax2.set_xlabel('Сумма продаж, тыс. руб.')
    ax2.set_title('ТОП-10 товаров по сумме')
    ax2.invert_yaxis()
    
    plt.tight_layout()
    plt.savefig('top_products_chart.png', dpi=300)
    print("График сохранен как 'top_products_chart.png'")
