---
layout: default
lang: ru
title: "MySQL: шпаргалка"
permalink: /cheats/mysql/
description: "Подключение, пользователи и права, индексы, EXPLAIN, бэкапы, диагностика медленных запросов — MySQL 8.4 одной страницей. Готовая закладка."
keywords: "mysql шпаргалка, mysql cheat sheet, mysql команды, explain, индексы, mysqldump, grant, slow query"
og_image: /assets/og-databases.png
translation_of: /en/cheats/mysql/
---

<article class="article-body" markdown="1" style="max-width:820px; margin:calc(var(--nav-height) + 56px) auto 100px; padding:0 24px;">

# MySQL: шпаргалка

Команды для ежедневной работы с MySQL 8.4. Сделай закладку. Подробные разборы — в статьях про [безопасность MySQL](/databases/mysql-security/) и [индексы и оптимизацию](/databases/mysql-optimization/).

## Подключение

```bash
mysql -u root -p                          # локально
mysql -h 10.0.0.5 -P 3306 -u app -p shop  # удалённо, конкретная БД
mysql --ssl-mode=REQUIRED -u app -p       # принудительный SSL
mysql -u app -p shop < dump.sql           # выполнить файл
```

## Базы и таблицы

```sql
SHOW DATABASES;
CREATE DATABASE shop CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE shop;
SHOW TABLES;
DESCRIBE orders;            -- структура таблицы
SHOW CREATE TABLE orders\G  -- полный DDL
SHOW TABLE STATUS\G         -- размер, движок, строки
```

## Пользователи и права

```sql
CREATE USER 'app'@'%' IDENTIFIED BY 'strong-pass';
GRANT SELECT, INSERT, UPDATE, DELETE ON shop.* TO 'app'@'%';  -- минимум прав
FLUSH PRIVILEGES;
SHOW GRANTS FOR 'app'@'%';
ALTER USER 'app'@'%' IDENTIFIED BY 'new-pass';
DROP USER 'app'@'%';
SELECT user, host FROM mysql.user;        -- кто есть
```

> Никогда не давай приложению `ALL PRIVILEGES` или root. Подробно: [безопасность MySQL](/databases/mysql-security/).

## Индексы

```sql
SHOW INDEX FROM orders;
CREATE INDEX idx_user_created ON orders(user_id, created_at);  -- составной
CREATE UNIQUE INDEX idx_email ON users(email);
ALTER TABLE orders DROP INDEX idx_user_created;
```

> Правило ESR: сначала колонки из `WHERE` (равенство), потом `ORDER BY`, потом диапазоны. Порядок в составном индексе критичен.

## EXPLAIN — почему запрос медленный

```sql
EXPLAIN SELECT * FROM orders WHERE user_id = 42;
EXPLAIN ANALYZE SELECT ...;   -- реальное время выполнения (8.0+)
```

На что смотреть:

| `type` | Значение |
|---|---|
| `const` / `eq_ref` | Отлично — поиск по ключу |
| `ref` / `range` | Хорошо — используется индекс |
| `index` | Скан всего индекса |
| `ALL` | Плохо — полный скан таблицы, нужен индекс |

`key: NULL` + `rows` большое = индекс не используется. Подробно: [индексы и оптимизация](/databases/mysql-optimization/).

## Медленные запросы

```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;           -- логировать > 1 сек
SHOW PROCESSLIST;                          -- что выполняется сейчас
KILL <id>;                                 -- убить зависший запрос
```

```bash
mysqldumpslow -s t -t 10 /var/log/mysql/slow.log   # топ-10 медленных
```

## Бэкап и восстановление

```bash
# Дамп
mysqldump -u root -p --single-transaction shop > shop.sql
mysqldump -u root -p --all-databases > all.sql
mysqldump -u root -p shop orders > orders.sql       # одна таблица

# Восстановление
mysql -u root -p shop < shop.sql

# С сжатием
mysqldump -u root -p shop | gzip > shop.sql.gz
gunzip < shop.sql.gz | mysql -u root -p shop
```

> `--single-transaction` — консистентный бэкап InnoDB без блокировки таблиц.

## Диагностика

```sql
SELECT VERSION();
SHOW STATUS LIKE 'Threads_connected';     -- активные подключения
SHOW VARIABLES LIKE 'max_connections';
SHOW ENGINE INNODB STATUS\G               -- дедлоки, буферы
SELECT * FROM information_schema.INNODB_TRX;  -- активные транзакции
```

## Полезное

```sql
-- Размер таблиц в МБ
SELECT table_name,
       ROUND(data_length/1024/1024, 1) AS data_mb,
       ROUND(index_length/1024/1024, 1) AS index_mb
FROM information_schema.tables
WHERE table_schema = 'shop'
ORDER BY data_length DESC;
```

Защита от инъекций и продакшн-настройка — в статье про [безопасность MySQL 8.4](/databases/mysql-security/).

</article>
