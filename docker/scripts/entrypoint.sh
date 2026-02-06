#!/bin/bash
echo "=== Запуск тестового окружения 1С ==="

# Инициализация базы данных
echo "Инициализация БД..."
psql -h postgresql -U 1c_user -d 1c_test_db -f /opt/1c_project/sql/init.sql

# Создание информационной базы
echo "Создание ИБ 1С..."
/opt/1c/8.3/x86_64/1cestart \
    /CreateIB /S postgresql:5432 \
    /N "Тестовая база" /Out ./logs/create_ib.log

# Запуск тестов
echo "Запуск тестов..."
/opt/1c_project/scripts/run_tests.sh

# Запуск сервера 1С
echo "Запуск сервера 1С..."
exec /opt/1c/8.3/x86_64/ragent
