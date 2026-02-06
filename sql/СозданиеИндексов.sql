-- Индексы для оптимизации производительности
CREATE INDEX idx_Реализация_Дата 
ON Реализация (Дата) 
WHERE Проведен = true;

CREATE INDEX idx_РеализацияТовары_Номенклатура 
ON Реализация_Товары (Номенклатура);

-- Статистика для планировщика запросов
ANALYZE Реализация;
ANALYZE Реализация_Товары;
ANALYZE Номенклатура;

-- Настройки PostgreSQL для 1С
ALTER SYSTEM SET shared_buffers = '4GB';
ALTER SYSTEM SET work_mem = '64MB';
ALTER SYSTEM SET maintenance_work_mem = '1GB';
