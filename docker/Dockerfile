FROM ubuntu:22.04

# Установка зависимостей
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    curl \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Установка 1С:Предприятие (демо-версия)
RUN wget -qO - https://download.1c.ru/installers/1CEnterprise/8.3.21/deb/Release.key | apt-key add -
RUN echo "deb https://download.1c.ru/installers/1CEnterprise/8.3.21/deb/ stable main" > /etc/apt/sources.list.d/1c.list
RUN apt-get update && apt-get install -y \
    1c-enterprise83 \
    1c-enterprise83-server \
    && rm -rf /var/lib/apt/lists/*

# Копирование конфигурации проекта
COPY ./src /opt/1c_project/src
COPY ./tests /opt/1c_project/tests
COPY ./scripts /opt/1c_project/scripts

# Настройка прав
RUN chmod +x /opt/1c_project/scripts/*.sh

# Точка входа
ENTRYPOINT ["/opt/1c_project/scripts/entrypoint.sh"]
