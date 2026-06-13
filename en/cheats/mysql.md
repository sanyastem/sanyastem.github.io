---
layout: default
lang: en
title: "MySQL: cheat sheet"
permalink: /en/cheats/mysql/
description: "Connecting, users and privileges, indexes, EXPLAIN, backups, slow-query diagnostics — MySQL 8.4 on one page. Bookmark-ready."
keywords: "mysql cheat sheet, mysql commands, explain, indexes, mysqldump, grant, slow query"
og_image: /assets/og-databases.png
translation_of: /cheats/mysql/
---

<article class="article-body" markdown="1" style="max-width:820px; margin:calc(var(--nav-height) + 56px) auto 100px; padding:0 24px;">

# MySQL: cheat sheet

Commands for daily work with MySQL 8.4. Bookmark it. Deep dives: [MySQL security](/en/databases/mysql-security/) and [indexes and optimization](/en/databases/mysql-optimization/).

## Connecting

```bash
mysql -u root -p                          # local
mysql -h 10.0.0.5 -P 3306 -u app -p shop  # remote, specific DB
mysql --ssl-mode=REQUIRED -u app -p       # force SSL
mysql -u app -p shop < dump.sql           # run a file
```

## Databases and tables

```sql
SHOW DATABASES;
CREATE DATABASE shop CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE shop;
SHOW TABLES;
DESCRIBE orders;            -- table structure
SHOW CREATE TABLE orders\G  -- full DDL
SHOW TABLE STATUS\G         -- size, engine, rows
```

## Users and privileges

```sql
CREATE USER 'app'@'%' IDENTIFIED BY 'strong-pass';
GRANT SELECT, INSERT, UPDATE, DELETE ON shop.* TO 'app'@'%';  -- least privilege
FLUSH PRIVILEGES;
SHOW GRANTS FOR 'app'@'%';
ALTER USER 'app'@'%' IDENTIFIED BY 'new-pass';
DROP USER 'app'@'%';
SELECT user, host FROM mysql.user;        -- who exists
```

> Never give the app `ALL PRIVILEGES` or root. Details: [MySQL security](/en/databases/mysql-security/).

## Indexes

```sql
SHOW INDEX FROM orders;
CREATE INDEX idx_user_created ON orders(user_id, created_at);  -- composite
CREATE UNIQUE INDEX idx_email ON users(email);
ALTER TABLE orders DROP INDEX idx_user_created;
```

> ESR rule: equality columns from `WHERE` first, then `ORDER BY`, then ranges. Column order in a composite index is critical.

## EXPLAIN — why a query is slow

```sql
EXPLAIN SELECT * FROM orders WHERE user_id = 42;
EXPLAIN ANALYZE SELECT ...;   -- real execution time (8.0+)
```

What to look at:

| `type` | Meaning |
|---|---|
| `const` / `eq_ref` | Excellent — key lookup |
| `ref` / `range` | Good — index used |
| `index` | Full index scan |
| `ALL` | Bad — full table scan, needs an index |

`key: NULL` + a large `rows` = the index isn't used. Details: [indexes and optimization](/en/databases/mysql-optimization/).

## Slow queries

```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;           -- log queries > 1s
SHOW PROCESSLIST;                          -- what's running now
KILL <id>;                                 -- kill a stuck query
```

```bash
mysqldumpslow -s t -t 10 /var/log/mysql/slow.log   # top 10 slowest
```

## Backup and restore

```bash
# Dump
mysqldump -u root -p --single-transaction shop > shop.sql
mysqldump -u root -p --all-databases > all.sql
mysqldump -u root -p shop orders > orders.sql       # one table

# Restore
mysql -u root -p shop < shop.sql

# Compressed
mysqldump -u root -p shop | gzip > shop.sql.gz
gunzip < shop.sql.gz | mysql -u root -p shop
```

> `--single-transaction` — a consistent InnoDB backup without locking tables.

## Diagnostics

```sql
SELECT VERSION();
SHOW STATUS LIKE 'Threads_connected';     -- active connections
SHOW VARIABLES LIKE 'max_connections';
SHOW ENGINE INNODB STATUS\G               -- deadlocks, buffers
SELECT * FROM information_schema.INNODB_TRX;  -- active transactions
```

## Handy

```sql
-- Table sizes in MB
SELECT table_name,
       ROUND(data_length/1024/1024, 1) AS data_mb,
       ROUND(index_length/1024/1024, 1) AS index_mb
FROM information_schema.tables
WHERE table_schema = 'shop'
ORDER BY data_length DESC;
```

Injection defense and production hardening — in the [MySQL 8.4 security](/en/databases/mysql-security/) article.

</article>
