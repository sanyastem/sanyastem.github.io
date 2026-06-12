---
layout: post
title: "MySQL 8.4: индексы, EXPLAIN и оптимизация запросов"
categories: databases
translation_of: "/en/databases/mysql-optimization/"
tldr:
  - "EXPLAIN ANALYZE показывает план и реальное время: «Table scan» — нет индекса, Sort перед Limit — нужен индекс на сортировку, actual rows >> estimated — ANALYZE TABLE."
  - "Составной индекс строится по правилу ESR: сначала поля с равенством (=), затем колонка сортировки ORDER BY, диапазоны (>, <, BETWEEN) — последними."
  - "OFFSET-пагинация сканирует все пропущенные строки; cursor-пагинация WHERE id > :last_id ORDER BY id LIMIT 20 работает за O(log n) через индекс."
  - "Медленные запросы ловят через slow_query_log с long_query_time = 1 и mysqldumpslow -s t -t 10; неиспользуемые индексы видны в performance_schema."
faq:
  - q: "Чем EXPLAIN ANALYZE отличается от обычного EXPLAIN в MySQL?"
    a: "EXPLAIN показывает только предполагаемый план выполнения, а EXPLAIN ANALYZE реально выполняет запрос и выводит план с фактическим временем (actual time) и числом строк (actual rows) для каждого шага. Это позволяет увидеть, где план разошёлся с реальностью: если actual rows сильно больше estimated — статистика устарела и нужен ANALYZE TABLE, а строка «Table scan» означает отсутствие индекса."
  - q: "В каком порядке располагать колонки в составном индексе MySQL?"
    a: "По правилу ESR: сначала поля с равенством (=), затем колонка сортировки из ORDER BY, последними — диапазоны (>, <, BETWEEN). Для запроса WHERE user_id = 42 AND status = 'completed' ORDER BY created_at DESC правильный индекс — CREATE INDEX idx_good ON orders (user_id, status, created_at), а индекс с created_at в начале работать на фильтрацию не будет."
  - q: "Почему OFFSET-пагинация медленная и чем её заменить?"
    a: "LIMIT 20 OFFSET 19980 заставляет MySQL просмотреть и отбросить все 19 980 пропущенных строк — на миллионной таблице OFFSET 999980 равен скану почти всей таблицы. Замена — cursor-пагинация: WHERE id > :last_id ORDER BY id LIMIT 20, где :last_id — последний id предыдущей страницы; такой запрос работает за O(log n) через индекс. Для сортировки по неуникальному полю добавляется id как tie-breaker и индекс (category_id, created_at DESC, id DESC)."
  - q: "Как найти медленные запросы в MySQL 8.4?"
    a: "Включи slow_query_log = 1 с long_query_time = 1 (логировать запросы дольше секунды) и log_queries_not_using_indexes = 1 в mysqld.cnf, затем анализируй лог: mysqldumpslow -s t -t 10 /var/log/mysql/slow.log покажет топ-10 самых медленных. Альтернатива без лога — performance_schema: запрос к events_statements_summary_by_digest с сортировкой по SUM_TIMER_WAIT даёт топ запросов по суммарному времени, а table_io_waits_summary_by_index_usage показывает индексы с COUNT_READ = 0, которые можно удалить."
  - q: "Что такое covering index и когда он нужен?"
    a: "Это индекс, который содержит все колонки, нужные запросу — MySQL читает данные прямо из индекса, не обращаясь к таблице; в EXPLAIN это видно как «Using index». Например, для SELECT id, name, price WHERE category_id = 5 AND is_active = 1 ORDER BY name подойдёт CREATE INDEX idx_cover ON products (category_id, is_active, name, price, id). Но не стоит делать covering index из 10 колонок — он становится тяжёлым; используй только для реально частых и тяжёлых запросов."
date: 2026-04-05
date_ru: "5 апреля 2026"
read_time: 12
difficulty: advanced
series: "MySQL: безопасность и производительность"
part: 2
description: "Как читать EXPLAIN ANALYZE, строить составные индексы, находить медленные запросы и выбирать между cursor и OFFSET пагинацией в MySQL 8.4."
excerpt_text: "EXPLAIN ANALYZE, составные индексы, slow query log и cursor пагинация — оптимизируем MySQL 8.4"
keywords: "MySQL EXPLAIN ANALYZE, составной индекс MySQL, slow query log MySQL 8.4, cursor пагинация MySQL, оптимизация запросов MySQL"
---

## Читаем EXPLAIN ANALYZE

`EXPLAIN` показывает план выполнения. `EXPLAIN ANALYZE` — план + реальное время:

```sql
EXPLAIN ANALYZE
SELECT o.id, o.amount, u.email
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.status = 'pending'
  AND o.created_at > '2026-01-01'
ORDER BY o.created_at DESC
LIMIT 20;
```

Пример вывода:

```
-> Limit: 20 row(s)  (cost=1842 rows=20) (actual time=45.3..45.4 rows=20 loops=1)
    -> Sort: o.created_at DESC  (cost=1842 rows=8432) (actual time=45.3..45.3 rows=20 loops=1)
        -> Nested loop inner join  (cost=1842 rows=8432) (actual time=0.15..44.1 rows=8432 loops=1)
            -> Filter: (o.status = 'pending' and o.created_at > '2026-01-01')
               (cost=852 rows=8432) (actual time=0.12..39.2 rows=8432 loops=1)
                -> Table scan on o  (cost=852 rows=84321) (actual time=0.10..32.1 rows=84321 loops=1)
```

**Что смотреть:**

| Признак проблемы | Что делать |
|------------------|------------|
| `Table scan` — скан всей таблицы | Добавить индекс |
| `rows=` реальных >> ожидаемых | Обновить статистику: `ANALYZE TABLE orders;` |
| `Sort` перед `Limit` | Индекс на (status, created_at) |
| `actual time` >> `cost` | Проблема с кешем, I/O, или lock contention |

## Как MySQL использует индексы

Индекс — это отсортированная структура B-Tree по одному или нескольким полям. MySQL может использовать индекс для:
- Поиска по WHERE
- Сортировки ORDER BY
- Покрытия всего запроса (covering index)

```sql
-- Смотрим индексы таблицы
SHOW INDEX FROM orders;

-- Смотрим кардинальность (уникальность значений)
-- Высокая кардинальность = индекс эффективнее
SELECT
    COLUMN_NAME,
    CARDINALITY
FROM information_schema.STATISTICS
WHERE TABLE_NAME = 'orders'
ORDER BY CARDINALITY DESC;
```

## Составные индексы — порядок важен

Правило: порядок колонок в составном индексе должен совпадать с порядком в WHERE + ORDER BY.

```sql
-- Запрос
SELECT * FROM orders
WHERE user_id = 42
  AND status = 'completed'
ORDER BY created_at DESC;

-- Плохой индекс — created_at в начале, но WHERE по user_id и status
CREATE INDEX idx_bad ON orders (created_at, user_id, status);

-- Хороший индекс — сначала равенства, потом сортировка
CREATE INDEX idx_good ON orders (user_id, status, created_at);
```

**Правило "ESR":**
1. **E**quality — поля с `=` первые
2. **S**ort — поле для ORDER BY
3. **R**ange — поля с `>`, `<`, `BETWEEN` последними

```sql
-- Запрос: WHERE category_id = 5 AND price BETWEEN 100 AND 500 ORDER BY name
-- Правильный порядок: equality → sort → range? Нет — range нарушает сортировку!
-- Правильно: equality → range, и отдельно смотреть нужен ли sort

CREATE INDEX idx_products ON products (category_id, price, name);
-- MySQL использует (category_id, price) для фильтрации, name — для сортировки если возможно
```

## Covering Index — избегаем обращений к таблице

Если индекс содержит все поля которые нужны запросу — MySQL не обращается к основной таблице:

```sql
-- Запрос для списка товаров в категории
SELECT id, name, price FROM products
WHERE category_id = 5 AND is_active = 1
ORDER BY name;

-- Обычный индекс — MySQL найдёт строки по индексу, потом сходит в таблицу за name, price
CREATE INDEX idx_category ON products (category_id, is_active);

-- Covering index — всё нужное уже в индексе, в таблицу не ходим
CREATE INDEX idx_cover ON products (category_id, is_active, name, price, id);

-- В EXPLAIN увидишь: "Using index" вместо "Using index; Using where"
```

Не делай covering index с 10 колонками — индекс станет тяжёлым. Только для реально частых и тяжёлых запросов.

## Slow Query Log

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 1         # запросы дольше 1 секунды
log_queries_not_using_indexes = 1  # логировать запросы без индексов
min_examined_row_limit = 100       # только если просмотрено > 100 строк
```

Анализ через `mysqldumpslow`:

```bash
# Топ-10 самых медленных запросов
mysqldumpslow -s t -t 10 /var/log/mysql/slow.log

# Топ-10 по количеству выполнений
mysqldumpslow -s c -t 10 /var/log/mysql/slow.log

# Запросы конкретной таблицы
mysqldumpslow -s t /var/log/mysql/slow.log | grep orders
```

Или `pt-query-digest` из Percona Toolkit — даёт подробный анализ с группировкой похожих запросов.

## Performance Schema — находим узкие места

```sql
-- Топ запросов по суммарному времени
SELECT
    DIGEST_TEXT,
    COUNT_STAR as calls,
    ROUND(SUM_TIMER_WAIT / 1e12, 3) as total_seconds,
    ROUND(AVG_TIMER_WAIT / 1e9, 3) as avg_ms,
    SUM_ROWS_EXAMINED as rows_examined
FROM performance_schema.events_statements_summary_by_digest
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 10;

-- Таблицы с наибольшим числом full scan
SELECT
    OBJECT_SCHEMA,
    OBJECT_NAME,
    COUNT_READ,
    COUNT_FULL_SCAN
FROM performance_schema.table_io_waits_summary_by_table
WHERE COUNT_FULL_SCAN > 0
ORDER BY COUNT_FULL_SCAN DESC;

-- Индексы которые не используются
SELECT
    OBJECT_SCHEMA,
    OBJECT_NAME,
    INDEX_NAME
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE INDEX_NAME IS NOT NULL
  AND COUNT_READ = 0
  AND OBJECT_SCHEMA NOT IN ('mysql', 'performance_schema', 'information_schema')
ORDER BY OBJECT_SCHEMA, OBJECT_NAME;
```

## Пагинация: OFFSET убивает производительность

Та же проблема существует на уровне ORM — см. [cursor-пагинацию в EF Core](/dotnet/efcore-optimization/).

```sql
-- ПЛОХО — при page=1000 MySQL просматривает 20 000 строк
SELECT id, name, price FROM products
WHERE category_id = 5
ORDER BY id
LIMIT 20 OFFSET 19980;
```

На миллионной таблице `OFFSET 999980` = сканирование почти всей таблицы.

```sql
-- ХОРОШО — cursor пагинация, всегда O(log n) через индекс
-- Первая страница
SELECT id, name, price FROM products
WHERE category_id = 5
ORDER BY id
LIMIT 20;

-- Следующая страница (передаём last_id из предыдущей)
SELECT id, name, price FROM products
WHERE category_id = 5
  AND id > :last_id    -- :last_id = последний id предыдущей страницы
ORDER BY id
LIMIT 20;
```

Если нужна двусторонняя навигация или сортировка по не-уникальному полю:

```sql
-- Сортировка по created_at (не уникальный) + id (уникальный тайbreaker)
SELECT id, name, created_at FROM products
WHERE category_id = 5
  AND (created_at < :last_created_at
    OR (created_at = :last_created_at AND id < :last_id))
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- Индекс для этого запроса
CREATE INDEX idx_cursor ON products (category_id, created_at DESC, id DESC);
```

## Партиционирование для больших таблиц

```sql
-- Партиционирование по диапазону дат (логи, события)
CREATE TABLE event_log (
    id BIGINT AUTO_INCREMENT,
    event_type VARCHAR(50),
    created_at DATETIME NOT NULL,
    payload JSON,
    PRIMARY KEY (id, created_at)  -- created_at обязателен в PK для партиций
)
PARTITION BY RANGE (YEAR(created_at)) (
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION p2026 VALUES LESS THAN (2027),
    PARTITION pmax VALUES LESS THAN MAXVALUE
);

-- Запросы с фильтром по created_at будут сканировать только нужные партиции
-- "Partition pruning" — видно в EXPLAIN
EXPLAIN SELECT * FROM event_log WHERE created_at BETWEEN '2026-01-01' AND '2026-03-31';

-- Удаление старых данных — мгновенно, без блокировки
ALTER TABLE event_log DROP PARTITION p2024;
-- vs DELETE WHERE year=2024 — долго, генерирует много undo log
```

## Быстрая диагностика — чек-лист

```sql
-- 1. Таблицы без первичного ключа
SELECT TABLE_SCHEMA, TABLE_NAME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA NOT IN ('mysql','information_schema','performance_schema','sys')
  AND TABLE_NAME NOT IN (
      SELECT TABLE_NAME FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_TYPE = 'PRIMARY KEY'
  );

-- 2. Большие таблицы без индексов на foreign keys
SELECT
    kcu.TABLE_NAME,
    kcu.COLUMN_NAME,
    kcu.REFERENCED_TABLE_NAME
FROM information_schema.KEY_COLUMN_USAGE kcu
LEFT JOIN information_schema.STATISTICS s
    ON s.TABLE_NAME = kcu.TABLE_NAME
    AND s.COLUMN_NAME = kcu.COLUMN_NAME
    AND s.TABLE_SCHEMA = kcu.TABLE_SCHEMA
WHERE kcu.REFERENCED_TABLE_NAME IS NOT NULL
  AND s.INDEX_NAME IS NULL;

-- 3. Фрагментированные таблицы (нужна OPTIMIZE)
SELECT
    TABLE_NAME,
    ROUND(DATA_LENGTH/1024/1024, 2) AS data_mb,
    ROUND(DATA_FREE/1024/1024, 2) AS free_mb,
    ROUND(DATA_FREE/(DATA_LENGTH+INDEX_LENGTH)*100, 1) AS fragmentation_pct
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'myapp'
  AND DATA_FREE > 0
ORDER BY DATA_FREE DESC;
```

> 💡 Правило большого пальца: индекс ускоряет SELECT но замедляет INSERT/UPDATE/DELETE. На таблице с частой записью держи только необходимые индексы — каждый добавленный индекс это дополнительная запись при каждом изменении строки. База должна быть ещё и защищённой — см. [гайд по безопасности MySQL 8.4](/databases/mysql-security/). Разбор медленных запросов автоматизирует [скилл /mysql-explain](/ai/claude-code-skills-migration/).
