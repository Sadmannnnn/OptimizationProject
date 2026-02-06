/**
 * Пример использования API 1С Optimization Project на JavaScript/Node.js
 */

const axios = require('axios');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

class OneCApiClient {
    /**
     * Клиент для работы с API 1С системы
     * @param {string} baseUrl - Базовый URL API
     * @param {string} token - JWT токен для аутентификации
     */
    constructor(baseUrl, token) {
        this.baseUrl = baseUrl;
        this.token = token;
        
        this.axiosInstance = axios.create({
            baseURL: baseUrl,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 30000
        });
    }

    /**
     * Получить ТОП товаров за период
     * @param {string} startDate - Начало периода (YYYY-MM-DD)
     * @param {string} endDate - Конец периода (YYYY-MM-DD)
     * @param {string} detail - Детализация (day/month/quarter)
     * @param {number} limit - Количество записей
     * @returns {Promise<Object>}
     */
    async getTopProducts(startDate, endDate, detail = 'month', limit = 10) {
        try {
            const response = await this.axiosInstance.get('/reports/top-products', {
                params: {
                    start_date: startDate,
                    end_date: endDate,
                    detail: detail,
                    limit: limit
                }
            });
            
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Генерация тестовых данных
     * @param {number} daysCount - Количество дней
     * @param {number} salesPerDay - Продаж в день
     * @param {number} productsCount - Количество товаров
     * @returns {Promise<Object>}
     */
    async generateTestData(daysCount = 365, salesPerDay = 100, productsCount = 1000) {
        try {
            const response = await this.axiosInstance.post('/test/generate-data', {
                days_count: daysCount,
                sales_per_day: salesPerDay,
                products_count: productsCount
            });
            
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Получить список медленных запросов
     * @param {number} limit - Максимальное количество записей
     * @returns {Promise<Array>}
     */
    async getSlowQueries(limit = 20) {
        try {
            const response = await this.axiosInstance.get('/monitoring/slow-queries', {
                params: { limit: limit }
            });
            
            return response.data.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Инвалидация кэша
     * @param {string|null} date - Дата для инвалидации (YYYY-MM-DD), если null - весь кэш
     * @returns {Promise<boolean>}
     */
    async invalidateCache(date = null) {
        try {
            const params = date ? { date: date } : {};
            const response = await this.axiosInstance.delete('/cache/invalidate', {
                params: params
            });
            
            return response.data.success;
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Получение метрик производительности
     * @param {string} timeRange - Диапазон времени (1h, 24h, 7d)
     * @returns {Promise<Object>}
     */
    async getPerformanceMetrics(timeRange = '1h') {
        try {
            const response = await this.axiosInstance.get('/monitoring/metrics', {
                params: { range: timeRange }
            });
            
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Подписка на обновления через WebSocket
     * @param {Function} onMessageCallback - Функция для обработки сообщений
     */
    connectToWebSocket(onMessageCallback) {
        const wsUrl = this.baseUrl.replace('https://', 'wss://').replace('http://', 'ws://').replace('/v1', '/ws');
        
        const ws = new WebSocket(wsUrl, {
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });

        ws.on('open', () => {
            console.log('WebSocket connection established');
        });

        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                onMessageCallback(message);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });

        ws.on('close', () => {
            console.log('WebSocket connection closed');
        });

        this.wsConnection = ws;
        return ws;
    }

    /**
     * Обработка ошибок
     * @param {Error} error - Ошибка
     */
    handleError(error) {
        if (error.response) {
            console.error('API Error:', {
                status: error.response.status,
                data: error.response.data,
                url: error.response.config.url
            });
            throw new Error(`API Error ${error.response.status}: ${error.response.data.error?.message || error.message}`);
        } else if (error.request) {
            console.error('Network Error:', error.request);
            throw new Error('Network error: No response received');
        } else {
            console.error('Request Error:', error.message);
            throw error;
        }
    }

    /**
     * Экспорт данных в CSV
     * @param {Object} data - Данные отчета
     * @param {string} filename - Имя файла
     */
    exportToCSV(data, filename = 'top_products.csv') {
        if (!data.data || data.data.length === 0) {
            console.warn('No data to export');
            return;
        }

        const headers = Object.keys(data.data[0]);
        const csvRows = [
            headers.join(','),
            ...data.data.map(row => 
                headers.map(header => {
                    const value = row[header];
                    return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
                }).join(',')
            )
        ];

        const csvContent = csvRows.join('\n');
        fs.writeFileSync(filename, csvContent, 'utf8');
        console.log(`Data exported to ${filename}`);
    }
}

// Пример использования
async function main() {
    // Конфигурация
    const BASE_URL = 'https://api.1c-project.example.com/v1';
    const API_TOKEN = 'your_jwt_token_here';
    
    // Создание клиента
    const client = new OneCApiClient(BASE_URL, API_TOKEN);
    
    console.log('=== Пример использования API 1С Optimization Project ===\n');
    
    try {
        // 1. Получение ТОП товаров
        const today = new Date().toISOString().split('T')[0];
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        const monthAgoStr = monthAgo.toISOString().split('T')[0];
        
        console.log('Получение ТОП товаров за последние 30 дней...');
        const topProducts = await client.getTopProducts(monthAgoStr, today);
        
        if (topProducts.success) {
            console.log(`\nТОП товаров:`);
            console.log(`Время генерации: ${topProducts.metadata.generated_in} сек.`);
            console.log(`Из кэша: ${topProducts.metadata.cached ? 'Да' : 'Нет'}\n`);
            
            topProducts.data.forEach((item, index) => {
                console.log(`${index + 1}. ${item.product}`);
                console.log(`   Продано: ${item.sales_count} шт.`);
                console.log(`   Сумма: ${item.sales_amount.toLocaleString('ru-RU')} руб.`);
                console.log(`   Период: ${item.period}\n`);
            });
            
            // Экспорт в CSV
            client.exportToCSV(topProducts);
        }
        
        // 2. Получение медленных запросов
        console.log('\n' + '='.repeat(50) + '\n');
        console.log('Получение ТОП-5 медленных запросов...');
        
        const slowQueries = await client.getSlowQueries(5);
        console.log('\nМедленные запросы:');
        slowQueries.forEach((query, index) => {
            console.log(`${index + 1}. ${query.query_name}`);
            console.log(`   Среднее время: ${query.avg_duration.toFixed(3)} сек.`);
            console.log(`   Вызовов: ${query.call_count}\n`);
        });
        
        // 3. Подписка на обновления через WebSocket
        console.log('\n' + '='.repeat(50) + '\n');
        console.log('Подключение к WebSocket для обновлений...');
        
        client.connectToWebSocket((message) => {
            console.log('\nПолучено обновление:', message.type);
            
            switch (message.type) {
                case 'cache_invalidated':
                    console.log(`Кэш инвалидирован для даты: ${message.date || 'all'}`);
                    break;
                case 'new_sales':
                    console.log(`Новые продажи: ${message.count} записей`);
                    break;
                case 'performance_alert':
                    console.log(`Предупреждение производительности: ${message.query} (${message.duration} сек.)`);
                    break;
            }
        });
        
        // Ожидание обновлений (30 секунд)
        console.log('Ожидание обновлений в течение 30 секунд...');
        await new Promise(resolve => setTimeout(resolve, 30000));
        
    } catch (error) {
        console.error('Ошибка:', error.message);
    }
    
    console.log('\n=== Пример завершен ===');
}

// Запуск примера
if (require.main === module) {
    main().catch(console.error);
}

// Пример для использования в браузере
class BrowserOneCApiClient {
    constructor(baseUrl, token) {
        this.baseUrl = baseUrl;
        this.token = token;
    }
    
    async getTopProducts(startDate, endDate) {
        const response = await fetch(
            `${this.baseUrl}/reports/top-products?start_date=${startDate}&end_date=${endDate}`,
            {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    }
    
    createChart(data, elementId) {
        const ctx = document.getElementById(elementId).getContext('2d');
        
        const chartData = {
            labels: data.map(item => item.product),
            datasets: [{
                label: 'Продажи, шт.',
                data: data.map(item => item.sales_count),
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        };
        
        return new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'ТОП товаров по продажам'
                    }
                }
            }
        });
    }
}

module.exports = {
    OneCApiClient,
    BrowserOneCApiClient
};
