---
layout: post
title: "MySQL 8.4: безопасность — от установки до продакшна"
categories: databases
translation_of: "/en/databases/mysql-security/"
tldr:
  - "MySQL 8.0 — EOL апрель 2026; текущая LTS — 8.4 с поддержкой до апреля 2032. После установки сразу запускай mysql_secure_installation."
  - "Приложение не должно ходить под root: отдельный пользователь с GRANT SELECT, INSERT, UPDATE, DELETE ON myapp.* и хостом 10.0.0.%; отдельные юзеры для отчётов и миграций."
  - "Дефолтная аутентификация — caching_sha2_password (SHA-256); для внешних подключений REQUIRE SSL, политика паролей — validate_password.policy и length = 12."
  - "Сетевая изоляция: bind-address = 127.0.0.1, local_infile = 0, в Docker не пробрасывай порт 3306 наружу; бэкапы mysqldump шифруй openssl enc -aes-256-cbc."
date: 2026-04-01
date_ru: "1 апреля 2026"
read_time: 10
difficulty: intermediate
series: "MySQL: безопасность и производительность"
part: 1
description: "Безопасная конфигурация MySQL 8.4 LTS: минимальные привилегии, SSL/TLS, защита от SQL-инъекций, caching_sha2_password, аудит и миграция с 8.0."
excerpt_text: "Минимальные привилегии, SSL/TLS, caching_sha2_password и защита от SQL-инъекций — безопасный MySQL 8.4"
keywords: "MySQL 8.4 безопасность, MySQL privileges минимальные, SSL TLS MySQL, SQL injection защита, caching_sha2_password, MySQL 8.0 EOL"
faq:
  - q: "Зачем переходить на MySQL 8.4 если 8.0 ещё работает?"
    a: "MySQL 8.0 завершила innovation-цикл, регулярные апдейты прекращены, дальше — только Extended Support и патчи безопасности. 8.4 — текущая LTS-версия, минимум 5 лет поддержки. Для новых проектов выбор однозначный, для старых — миграция в течение года-двух."
  - q: "Стоит ли давать root-доступ приложению к БД?"
    a: "Никогда. Создай отдельного пользователя с минимальными привилегиями именно на нужные таблицы (GRANT SELECT, INSERT, UPDATE, DELETE ON db.table). Если кто-то получит доступ к коду — у атакующего не будет CREATE USER, DROP, GRANT и других опасных команд."
  - q: "SSL/TLS для подключений к MySQL — обязательно или можно отключить?"
    a: "Обязательно для всех соединений извне localhost. Без TLS пароли и данные ходят по сети в открытом виде. Внутри одной машины через Unix socket — безопасно, TLS избыточен. Между разными хостами в облаке — TLS критичен, даже если кажется что сеть «приватная»."
  - q: "Как защититься от SQL-инъекций на уровне БД?"
    a: "БД не защитит от инъекций — это ответственность приложения (prepared statements). На уровне БД ты делаешь второй слой: минимальные привилегии (приложение не может DROP TABLE), отдельные пользователи на разные модули, query timeout на долгие запросы. Если инъекция случилась — урон локальный."
  - q: "caching_sha2_password ломает старые библиотеки — что делать?"
    a: "Это плагин аутентификации по умолчанию начиная с MySQL 8.0. Старые драйверы (PHP < 7.2, Node mysql) могут не поддерживать. Решения по убыванию правильности: 1) обновить драйвер на современный (mysql2, PDO_mysql последний), 2) включить TLS — тогда работает любой плагин, 3) откатить пользователя на mysql_native_password — только для legacy."
---

## Почему 8.4, а не 8.0

**MySQL 8.0** — EOL апрель 2026. После этой даты нет патчей безопасности.

**MySQL 8.4 LTS** — релиз май 2024, поддержка до апреля 2032. Это текущая production-версия для новых проектов.

**MySQL 9.x** (Innovation) — новые фичи, но не LTS. Для экспериментов, не для продакшна.

Если ты ещё на 8.0 — мигрируй на 8.4. Upgrade совместим: `mysql_upgrade` не нужен начиная с 8.x, просто обнови пакет.

## Первый запуск — mysql_secure_installation

После установки сразу:

```bash
mysql_secure_installation
```

Сделает:
- Установит validate_password плагин
- Запросит сложный root-пароль
- Удалит анонимных пользователей
- Запретит root-логин с удалённых хостов
- Удалит тестовую базу `test`

Это минимум. Дальше — подробнее.

## Принцип минимальных привилегий

Один пользователь на всё — плохая практика. Создавай пользователей под конкретные задачи:

```sql
-- Пользователь для приложения (только чтение/запись своих таблиц)
CREATE USER 'app_user'@'10.0.0.%' IDENTIFIED BY 'StrongPassword123!';
GRANT SELECT, INSERT, UPDATE, DELETE ON myapp.* TO 'app_user'@'10.0.0.%';

-- Пользователь для readonly реплики / отчётов
CREATE USER 'readonly_user'@'10.0.0.%' IDENTIFIED BY 'AnotherPassword!';
GRANT SELECT ON myapp.* TO 'readonly_user'@'10.0.0.%';

-- Пользователь для миграций (только структурные изменения)
CREATE USER 'migration_user'@'localhost' IDENTIFIED BY 'MigrationPass!';
GRANT ALTER, CREATE, DROP, INDEX, REFERENCES ON myapp.* TO 'migration_user'@'localhost';

-- Применить немедленно
FLUSH PRIVILEGES;
```

**Никогда** не подключай приложение под `root`. Если взломают — получат доступ ко всем базам, могут удалить данные, залезть в `mysql.user`.

Посмотреть что у кого есть:

```sql
SHOW GRANTS FOR 'app_user'@'10.0.0.%';
-- Или все пользователи с привилегиями
SELECT user, host, authentication_string FROM mysql.user;
```

## caching_sha2_password — новый дефолт

В MySQL 8.x дефолтный метод аутентификации сменился с `mysql_native_password` на `caching_sha2_password`. Это безопаснее — SHA-256 вместо SHA-1.

Проблема: старые клиенты (PHP <8.1, старые JDBC) могут не поддерживать.

```sql
-- Проверить метод конкретного пользователя
SELECT user, plugin FROM mysql.user WHERE user = 'app_user';

-- Если клиент не поддерживает caching_sha2_password — включить SSL
-- или переключить на mysql_native_password (менее желательно)
ALTER USER 'app_user'@'10.0.0.%'
    IDENTIFIED WITH caching_sha2_password BY 'password'
    REQUIRE SSL; -- требуем SSL обязательно

-- Для клиентов которые не умеют SHA2 (временное решение)
ALTER USER 'legacy_user'@'10.0.0.%'
    IDENTIFIED WITH mysql_native_password BY 'password';
```

## SSL/TLS — шифрование соединений

MySQL 8.4 включает SSL автоматически при установке (auto-generated сертификаты). Проверить:

```sql
SHOW VARIABLES LIKE 'have_ssl';        -- YES
SHOW VARIABLES LIKE 'ssl_ca';          -- путь к CA
SHOW STATUS LIKE 'Ssl_cipher';         -- шифр текущего соединения
```

Принудить пользователя использовать SSL:

```sql
-- При создании
CREATE USER 'secure_user'@'%' IDENTIFIED BY 'password' REQUIRE SSL;

-- Или изменить существующего
ALTER USER 'app_user'@'10.0.0.%' REQUIRE SSL;

-- Более строгий вариант — требовать конкретный X.509 сертификат
ALTER USER 'app_user'@'10.0.0.%' REQUIRE X509;
```

Проверить из приложения (C# + MySQL Connector):

```csharp
var connStr = "Server=db;Database=myapp;User=app_user;Password=pass;" +
              "SslMode=Required;SslCa=/path/to/ca.pem;";
```

## validate_password — политика паролей

```sql
-- Проверить текущие настройки
SHOW VARIABLES LIKE 'validate_password%';

-- Настроить уровень (LOW, MEDIUM, STRONG)
SET GLOBAL validate_password.policy = MEDIUM;  -- длина + спецсимволы
SET GLOBAL validate_password.length = 12;
SET GLOBAL validate_password.mixed_case_count = 1;
SET GLOBAL validate_password.number_count = 1;
SET GLOBAL validate_password.special_char_count = 1;

-- Проверить пароль без создания пользователя
SELECT VALIDATE_PASSWORD_STRENGTH('MyPassword123!');
-- Возвращает 0-100: <25 LOW, <50 MEDIUM, <75 STRONG, 100 — всё норм
```

## Защита от SQL-инъекций

Инъекции — это проблема кода, не MySQL. Но MySQL помогает обнаружить:

```sql
-- Включить general_log на время разработки, чтобы видеть все запросы
SET GLOBAL general_log = 'ON';
SET GLOBAL general_log_file = '/var/log/mysql/general.log';
-- ВЫКЛЮЧИ в продакшне — это медленно и раскрывает данные!
```

**Как защититься в коде:**

```csharp
// НИКОГДА — конкатенация строк
string query = "SELECT * FROM users WHERE email = '" + email + "'";
// SQL-инъекция: email = "' OR 1=1 --" → вернёт всех пользователей

// ПРАВИЛЬНО — параметризованные запросы (ADO.NET)
using var cmd = connection.CreateCommand();
cmd.CommandText = "SELECT * FROM users WHERE email = @email";
cmd.Parameters.AddWithValue("@email", email);

// ПРАВИЛЬНО — EF Core LINQ (автоматически параметризует)
var user = await context.Users
    .FirstOrDefaultAsync(u => u.Email == email);

// ПРАВИЛЬНО — EF Core raw SQL с параметрами
var user = await context.Users
    .FromSqlInterpolated($"SELECT * FROM users WHERE email = {email}")
    .FirstOrDefaultAsync();
// НЕ используй FromSqlRaw с конкатенацией!
```

## Файервол и сетевая изоляция

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf

# Слушать только на конкретном интерфейсе (не 0.0.0.0)
bind-address = 127.0.0.1
# Или для Docker/internal network:
# bind-address = 10.0.0.5

# Отключить LOCAL INFILE (позволяет читать файлы с клиента)
local_infile = 0
```

```bash
# Iptables — разрешить только с appserver
iptables -A INPUT -p tcp --dport 3306 -s 10.0.0.10 -j ACCEPT
iptables -A INPUT -p tcp --dport 3306 -j DROP
```

В Docker — не пробрасывай 3306 наружу без необходимости:

```yaml
# docker-compose.yml
services:
  db:
    image: mysql:8.4
    # Не добавляй: ports: - "3306:3306"  # если не нужен снаружи
    networks:
      - internal

  app:
    networks:
      - internal

networks:
  internal:
    driver: bridge
```

## Аудит и мониторинг

```sql
-- Логировать неудачные входы
SET GLOBAL log_error_verbosity = 3;

-- Посмотреть попытки брутфорса
SELECT * FROM performance_schema.host_cache
WHERE sum_connect_errors > 0;

-- Сбросить блокировку хоста (если превысил max_connect_errors)
FLUSH HOSTS;

-- Кто сейчас подключён
SELECT user, host, db, command, time, state
FROM information_schema.processlist
WHERE user != 'system user';
```

MySQL Enterprise Edition поставляется с MySQL Enterprise Audit. Для open-source — MariaDB Audit Plugin или MySQL Community Audit (сторонний).

## Резервные копии с шифрованием

```bash
# mysqldump с паролем через --defaults-extra-file (не в командной строке!)
cat > /tmp/mysql_creds.cnf <<EOF
[client]
user=backup_user
password=BackupPass!
EOF
chmod 600 /tmp/mysql_creds.cnf

# Бэкап с шифрованием
mysqldump --defaults-extra-file=/tmp/mysql_creds.cnf \
    --single-transaction --routines --triggers \
    myapp | gzip | openssl enc -aes-256-cbc -salt \
    -pass pass:$(cat /etc/backup.key) \
    -out /backups/myapp_$(date +%Y%m%d).sql.gz.enc

rm /tmp/mysql_creds.cnf
```

**Почему не пароль в командной строке:** `ps aux` покажет все аргументы процессов — пароль будет виден всем пользователям системы.

> 💡 После настройки запусти `mysqlcheck --all-databases -u root -p` — проверит целостность таблиц. И включи `innodb_file_per_table=ON` если ещё не включено — проще делать бэкапы и освобождать место.
