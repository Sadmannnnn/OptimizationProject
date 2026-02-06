# Инструкция по развертыванию проекта 1С Optimization

## Оглавление
1. [Требования](#требования)
2. [Быстрый старт](#быстрый-старт)
3. [Ручная установка](#ручная-установка)
4. [Настройка СУБД](#настройка-субд)
5. [Конфигурация 1С](#конфигурация-1с)
6. [Развертывание API](#развертывание-api)
7. [Мониторинг](#мониторинг)
8. [Обновление](#обновление)
9. [Устранение неисправностей](#устранение-неисправностей)

## Требования

### Минимальные требования
- **ОС**: Ubuntu 20.04+/CentOS 8+/Windows Server 2019+
- **Память**: 8 GB RAM
- **Процессор**: 4 ядра
- **Диск**: 50 GB свободного места
- **Docker**: 20.10+ (для контейнерного развертывания)
- **1С:Предприятие**: 8.3.21+

### Рекомендуемые требования
- **ОС**: Ubuntu 22.04 LTS
- **Память**: 16 GB RAM
- **Процессор**: 8 ядер
- **Диск**: 100 GB SSD
- **PostgreSQL**: 15+
- **Docker Compose**: 2.0+

## Быстрый старт

### Развертывание через Docker Compose (рекомендуется)

```bash
# 1. Клонирование репозитория
git clone https://github.com/your-company/1c-optimization.git
cd 1c-optimization

# 2. Настройка переменных окружения
cp .env.example .env
# Отредактируйте .env файл при необходимости

# 3. Запуск всех сервисов
docker-compose up -d

# 4. Проверка статуса
docker-compose ps

# 5. Просмотр логов
docker-compose logs -f

Проверка установки
bash
# Проверка API
curl http://localhost:8080/api/health

# Проверка базы данных
curl http://localhost:5050 (pgAdmin)

# Проверка мониторинга
curl http://localhost:9090 (Prometheus)
curl http://localhost:3000 (Grafana)
Ручная установка
1. Установка зависимостей
Ubuntu/Debian:

bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker
sudo apt install -y docker.io docker-compose
sudo systemctl enable --now docker

# Установка PostgreSQL
sudo apt install -y postgresql-15 postgresql-contrib-15
sudo systemctl enable --now postgresql

# Установка зависимостей для 1С
wget -qO - https://download.1c.ru/installers/1CEnterprise/8.3.21/deb/Release.key | sudo apt-key add -
echo "deb https://download.1c.ru/installers/1CEnterprise/8.3.21/deb/ stable main" | sudo tee /etc/apt/sources.list.d/1c.list
sudo apt update
sudo apt install -y 1c-enterprise83 1c-enterprise83-server
CentOS/RHEL:

bash
# Установка Docker
sudo yum install -y docker
sudo systemctl enable --now docker
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
2. Настройка сети и безопасности
bash
# Создание сетевого моста
docker network create 1c-network

# Настройка фаервола
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 1540:1541/tcp
sudo ufw allow 5432/tcp
sudo ufw enable

# Создание пользователей
sudo useradd -m -s /bin/bash 1c_user
sudo usermod -aG docker 1c_user
Настройка СУБД
PostgreSQL
sql
-- Создание базы данных
CREATE DATABASE 1c_optimization
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'ru_RU.UTF-8'
    LC_CTYPE = 'ru_RU.UTF-8'
    TEMPLATE = template0;

-- Создание пользователя
CREATE USER 1c_user WITH PASSWORD 'StrongPassword123!';
GRANT ALL PRIVILEGES ON DATABASE 1c_optimization TO 1c_user;

-- Настройка производительности
ALTER SYSTEM SET shared_buffers = '4GB';
ALTER SYSTEM SET work_mem = '64MB';
ALTER SYSTEM SET maintenance_work_mem = '1GB';
ALTER SYSTEM SET effective_cache_size = '12GB';
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET checkpoint_completion_target = 0.9;

-- Перезагрузка конфигурации
SELECT pg_reload_conf();
Создание таблиц и индексов
bash
# Применение SQL скриптов
psql -U postgres -d 1c_optimization -f sql/init.sql
psql -U postgres -d 1c_optimization -f sql/indexes.sql
psql -U postgres -d 1c_optimization -f sql/functions.sql
Конфигурация 1С
Создание информационной базы
bash
# Использование утилиты 1С
/opt/1c/8.3/x86_64/1cestart \
    /CreateIB \
    /S localhost \
    /D "1c_optimization" \
    /N "Оптимизация продаж" \
    /Out /var/log/1c/create_ib.log
Загрузка конфигурации
Откройте 1С:Предприятие

Выберите "Добавить в список информационных баз"

Укажите параметры:

Имя: Оптимизация продаж

Каталог: /var/opt/1C/db/optimization

Сервер: localhost

Имя БД: 1c_optimization

Пользователь: 1c_user

Загрузите конфигурацию из файлов:

bash
# Выгрузка в формате XML
/opt/1c/8.3/x86_64/1cestart \
    /LoadConfig \
    /IBConnectionString "Srvr=localhost;Ref=1c_optimization;SUsr=1c_user;SPwd=password" \
    /ConfigurationRepositoryF ./src/Configuration \
    /Out /var/log/1c/load_config.log
Настройка кластера
bash
# Создание кластера
/opt/1c/8.3/x86_64/clusteradmin \
    --create \
    --name "Оптимизация" \
    --host localhost \
    --port 1541 \
    --username admin \
    --password admin123

# Добавление рабочего процесса
/opt/1c/8.3/x86_64/ras \
    cluster \
    --cluster=localhost:1541 \
    --cluster-user=admin \
    --cluster-pwd=admin123 \
    agent \
    --create \
    --name rphost \
    --host=localhost \
    --port=1540
Развертывание API
Установка Python зависимостей
bash
# Создание виртуального окружения
python3 -m venv /opt/1c-api/venv
source /opt/1c-api/venv/bin/activate

# Установка зависимостей
pip install -r api/requirements.txt

# Создание системного сервиса
sudo cp deployment/1c-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable 1c-api
sudo systemctl start 1c-api
Настройка Nginx
nginx
# /etc/nginx/sites-available/1c-api
server {
    listen 80;
    server_name api.1c-optimization.local;
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /ws {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
SSL сертификаты (Let's Encrypt)
bash
# Установка certbot
sudo apt install -y certbot python3-certbot-nginx

# Получение сертификата
sudo certbot --nginx -d api.1c-optimization.local

# Автоматическое обновление
sudo certbot renew --dry-run
Мониторинг
Установка Prometheus
bash
# Скачивание и установка
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xvf prometheus-*.tar.gz
cd prometheus-*

# Конфигурация
sudo cp prometheus /usr/local/bin/
sudo mkdir /etc/prometheus
sudo cp prometheus.yml /etc/prometheus/

# Создание сервиса
sudo cp deployment/prometheus.service /etc/systemd/system/
sudo systemctl enable prometheus
sudo systemctl start prometheus
Установка Grafana
bash
# Добавление репозитория
sudo apt-get install -y software-properties-common
sudo add-apt-repository "deb https://packages.grafana.com/oss/deb stable main"
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -

# Установка
sudo apt-get update
sudo apt-get install -y grafana

# Настройка
sudo cp monitoring/grafana/dashboard.json /var/lib/grafana/dashboards/
sudo systemctl enable grafana-server
sudo systemctl start grafana-server
Настройка алертинга
yaml
# monitoring/prometheus/alert_rules.yml
groups:
  - name: 1c_alerts
    rules:
      - alert: SlowQuery
        expr: 1c_query_duration_seconds > 5
        for: 5m
        annotations:
          summary: "Медленный запрос в 1С"
          description: "Запрос {{ $labels.query_name }} выполняется {{ $value }} секунд"
      
      - alert: HighCacheMissRate
        expr: 1c_cache_hit_ratio < 0.7
        for: 10m
        annotations:
          summary: "Низкий процент попаданий в кэш"
          description: "Процент попаданий в кэш упал до {{ $value | humanizePercentage }}"
Обновление
Процедура обновления
bash
#!/bin/bash
# deployment/update.sh

echo "=== Начало обновления ==="

# 1. Резервное копирование
echo "Создание резервной копии..."
pg_dump -U postgres 1c_optimization > backup_$(date +%Y%m%d_%H%M%S).sql
tar czf config_backup_$(date +%Y%m%d_%H%M%S).tar.gz /etc/1C/

# 2. Остановка сервисов
echo "Остановка сервисов..."
docker-compose down || true
sudo systemctl stop 1c-api || true

# 3. Обновление кода
echo "Обновление кода..."
git pull origin main

# 4. Обновление зависимостей
echo "Обновление зависимостей..."
docker-compose build --no-cache
source /opt/1c-api/venv/bin/activate
pip install -r api/requirements.txt --upgrade

# 5. Применение миграций
echo "Применение миграций БД..."
psql -U postgres -d 1c_optimization -f sql/migrations/$(cat .current_migration).sql

# 6. Запуск сервисов
echo "Запуск сервисов..."
docker-compose up -d
sudo systemctl start 1c-api

# 7. Проверка
echo "Проверка работоспособности..."
sleep 30
curl -f http://localhost:8080/api/health || echo "Ошибка проверки"

echo "=== Обновление завершено ==="
Устранение неисправностей
Частые проблемы
Нет соединения с базой данных

bash
# Проверка подключения
psql -h localhost -U 1c_user -d 1c_optimization
# Если ошибка, проверьте:
# - Запущен ли PostgreSQL: sudo systemctl status postgresql
# - Правильность пароля
# - Настройки pg_hba.conf
Ошибки 1С сервера

bash
# Просмотр логов
tail -f /var/log/1C/1cv8*.log
journalctl -u 1c-server -f

# Перезапуск
sudo systemctl restart 1c-server
Медленная работа запросов

sql
-- Поиск медленных запросов
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
Проблемы с кэшированием

bash
# Очистка кэша
curl -X DELETE http://localhost:8080/api/cache/invalidate

# Статистика кэша
curl http://localhost:8080/api/cache/stats
Мониторинг логов
bash
# Объединенный просмотр логов
multitail \
    /var/log/1C/1cv8.log \
    /var/log/postgresql/postgresql-15-main.log \
    /var/log/nginx/access.log \
    /var/log/nginx/error.log

# Поиск ошибок
grep -i "error\|fail\|exception" /var/log/1C/*.log
Контакты для поддержки
Техническая поддержка: support@1c-optimization.local

Документация: https://docs.1c-optimization.local

Мониторинг: https://grafana.1c-optimization.local

Панель управления: https://api.1c-optimization.local/admin

Лицензия
Этот проект распространяется под лицензией MIT. См. файл LICENSE для подробностей.

Вклад в проект
Форкните репозиторий

Создайте ветку для функции (git checkout -b feature/amazing-feature)

Зафиксируйте изменения (git commit -m 'Add amazing feature')

Запушьте ветку (git push origin feature/amazing-feature)

Откройте Pull Request
