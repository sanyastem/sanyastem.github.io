---
layout: post
title: "MySQL 8.4: indexes, EXPLAIN, and query optimization"
categories: databases
date: 2026-04-05
read_time: 12
difficulty: advanced
series: "MySQL: security and performance"
part: 2
description: "How to read EXPLAIN ANALYZE, build composite indexes, find slow queries, and choose between cursor and OFFSET pagination in MySQL 8.4."
excerpt_text: "EXPLAIN ANALYZE, composite indexes, slow query log, and cursor pagination — optimizing MySQL 8.4"
keywords: "MySQL EXPLAIN ANALYZE, composite index MySQL, slow query log MySQL 8.4, cursor pagination MySQL, MySQL query optimization"
translation_of: "/databases/mysql-optimization/"
tldr:
  - "EXPLAIN ANALYZE shows the plan plus real timings: a Table scan means a missing index, Sort before Limit needs a sort index, actual rows >> estimated — run ANALYZE TABLE."
  - "Build composite indexes by the ESR rule: equality (=) columns first, then the ORDER BY column, range conditions (>, <, BETWEEN) last."
  - "OFFSET pagination scans every skipped row; cursor pagination WHERE id > :last_id ORDER BY id LIMIT 20 stays O(log n) via the index."
  - "Catch slow queries with slow_query_log and long_query_time = 1 plus mysqldumpslow -s t -t 10; find unused indexes via performance_schema."
faq:
  - q: "How is EXPLAIN ANALYZE different from plain EXPLAIN in MySQL?"
    a: "EXPLAIN only shows the estimated execution plan, while EXPLAIN ANALYZE actually runs the query and prints the plan with real timings (actual time) and row counts (actual rows) for every step. That reveals where the plan diverged from reality: if actual rows is far above the estimate, the statistics are stale and you need ANALYZE TABLE, and a 'Table scan' line means a missing index."
  - q: "In what order should columns go in a composite MySQL index?"
    a: "Follow the ESR rule: equality (=) fields first, then the ORDER BY column, and range conditions (>, <, BETWEEN) last. For WHERE user_id = 42 AND status = 'completed' ORDER BY created_at DESC the right index is CREATE INDEX idx_good ON orders (user_id, status, created_at), while an index starting with created_at will not help the filtering at all."
  - q: "Why is OFFSET pagination slow and what should replace it?"
    a: "LIMIT 20 OFFSET 19980 forces MySQL to read and discard all 19,980 skipped rows — on a million-row table OFFSET 999980 is nearly a full table scan. The replacement is cursor pagination: WHERE id > :last_id ORDER BY id LIMIT 20, where :last_id is the last id of the previous page; that query stays O(log n) via the index. For sorting by a non-unique column, add id as a tie-breaker and an index like (category_id, created_at DESC, id DESC)."
  - q: "How do I find slow queries in MySQL 8.4?"
    a: "Enable slow_query_log = 1 with long_query_time = 1 (log queries longer than one second) and log_queries_not_using_indexes = 1 in mysqld.cnf, then analyze the log: mysqldumpslow -s t -t 10 /var/log/mysql/slow.log shows the top 10 slowest queries. The log-free alternative is performance_schema: querying events_statements_summary_by_digest ordered by SUM_TIMER_WAIT gives the top queries by total time, and table_io_waits_summary_by_index_usage exposes indexes with COUNT_READ = 0 that can be dropped."
  - q: "What is a covering index and when do you need one?"
    a: "It is an index containing every column the query needs — MySQL reads the data straight from the index without touching the table; EXPLAIN shows it as 'Using index'. For SELECT id, name, price WHERE category_id = 5 AND is_active = 1 ORDER BY name a fitting index is CREATE INDEX idx_cover ON products (category_id, is_active, name, price, id). But do not build a covering index out of 10 columns — it gets heavy; reserve it for genuinely frequent and expensive queries."
---

## Reading EXPLAIN ANALYZE

`EXPLAIN` shows the execution plan. `EXPLAIN ANALYZE` — plan + actual timings:

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

Example output:

```
-> Limit: 20 row(s)  (cost=1842 rows=20) (actual time=45.3..45.4 rows=20 loops=1)
    -> Sort: o.created_at DESC  (cost=1842 rows=8432) (actual time=45.3..45.3 rows=20 loops=1)
        -> Nested loop inner join  (cost=1842 rows=8432) (actual time=0.15..44.1 rows=8432 loops=1)
            -> Filter: (o.status = 'pending' and o.created_at > '2026-01-01')
               (cost=852 rows=8432) (actual time=0.12..39.2 rows=8432 loops=1)
                -> Table scan on o  (cost=852 rows=84321) (actual time=0.10..32.1 rows=84321 loops=1)
```

**What to look at:**

| Symptom | What to do |
|---------|-----------|
| `Table scan` — scanning the whole table | Add an index |
| `rows=` actual >> estimated | Refresh statistics: `ANALYZE TABLE orders;` |
| `Sort` before `Limit` | Index on (status, created_at) |
| `actual time` >> `cost` | Cache, I/O, or lock contention issue |

## How MySQL uses indexes

An index is a sorted B-Tree on one or more columns. MySQL can use indexes for:
- WHERE lookups
- ORDER BY sorting
- Covering the whole query (covering index)

```sql
-- Show table indexes
SHOW INDEX FROM orders;

-- Cardinality (uniqueness of values)
-- High cardinality = more effective index
SELECT
    COLUMN_NAME,
    CARDINALITY
FROM information_schema.STATISTICS
WHERE TABLE_NAME = 'orders'
ORDER BY CARDINALITY DESC;
```

## Composite indexes — order matters

Rule: column order in a composite index should match WHERE + ORDER BY order.

```sql
-- Query
SELECT * FROM orders
WHERE user_id = 42
  AND status = 'completed'
ORDER BY created_at DESC;

-- Bad index — created_at first, but WHERE filters by user_id and status
CREATE INDEX idx_bad ON orders (created_at, user_id, status);

-- Good index — equality first, then sort
CREATE INDEX idx_good ON orders (user_id, status, created_at);
```

**"ESR" rule:**
1. **E**quality — `=` fields first
2. **S**ort — ORDER BY field
3. **R**ange — `>`, `<`, `BETWEEN` fields last

```sql
-- Query: WHERE category_id = 5 AND price BETWEEN 100 AND 500 ORDER BY name
-- Right order: equality → sort → range? No — range breaks the sort!
-- Right: equality → range, then separately check if sort is needed

CREATE INDEX idx_products ON products (category_id, price, name);
-- MySQL uses (category_id, price) for filtering, name — for sorting where possible
```

## Covering Index — avoid hitting the table

If an index contains all the columns the query needs — MySQL doesn't touch the table:

```sql
-- Product-list query for a category
SELECT id, name, price FROM products
WHERE category_id = 5 AND is_active = 1
ORDER BY name;

-- Plain index — MySQL finds rows via the index, then fetches name, price from the table
CREATE INDEX idx_category ON products (category_id, is_active);

-- Covering index — everything needed is in the index, no table lookup
CREATE INDEX idx_cover ON products (category_id, is_active, name, price, id);

-- In EXPLAIN you'll see "Using index" instead of "Using index; Using where"
```

Don't build covering indexes with 10 columns — the index gets heavy. Only for genuinely hot, heavy queries.

## Slow Query Log

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 1         # queries longer than 1 second
log_queries_not_using_indexes = 1  # log queries without indexes
min_examined_row_limit = 100       # only if > 100 rows examined
```

Analyze via `mysqldumpslow`:

```bash
# Top 10 slowest
mysqldumpslow -s t -t 10 /var/log/mysql/slow.log

# Top 10 by call count
mysqldumpslow -s c -t 10 /var/log/mysql/slow.log

# Queries on a specific table
mysqldumpslow -s t /var/log/mysql/slow.log | grep orders
```

Or `pt-query-digest` from Percona Toolkit — detailed analysis with grouping of similar queries.

## Performance Schema — finding bottlenecks

```sql
-- Top queries by total time
SELECT
    DIGEST_TEXT,
    COUNT_STAR as calls,
    ROUND(SUM_TIMER_WAIT / 1e12, 3) as total_seconds,
    ROUND(AVG_TIMER_WAIT / 1e9, 3) as avg_ms,
    SUM_ROWS_EXAMINED as rows_examined
FROM performance_schema.events_statements_summary_by_digest
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 10;

-- Tables with the most full scans
SELECT
    OBJECT_SCHEMA,
    OBJECT_NAME,
    COUNT_READ,
    COUNT_FULL_SCAN
FROM performance_schema.table_io_waits_summary_by_table
WHERE COUNT_FULL_SCAN > 0
ORDER BY COUNT_FULL_SCAN DESC;

-- Unused indexes
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

## Pagination: OFFSET kills performance

```sql
-- BAD — at page=1000 MySQL scans 20,000 rows
SELECT id, name, price FROM products
WHERE category_id = 5
ORDER BY id
LIMIT 20 OFFSET 19980;
```

On a million-row table `OFFSET 999980` = scanning almost the entire table.

```sql
-- GOOD — cursor pagination, always O(log n) via index
-- First page
SELECT id, name, price FROM products
WHERE category_id = 5
ORDER BY id
LIMIT 20;

-- Next page (pass last_id from previous)
SELECT id, name, price FROM products
WHERE category_id = 5
  AND id > :last_id    -- :last_id = last id of previous page
ORDER BY id
LIMIT 20;
```

If you need bidirectional navigation or sorting by a non-unique field:

```sql
-- Sort by created_at (not unique) + id (unique tiebreaker)
SELECT id, name, created_at FROM products
WHERE category_id = 5
  AND (created_at < :last_created_at
    OR (created_at = :last_created_at AND id < :last_id))
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- Index for this query
CREATE INDEX idx_cursor ON products (category_id, created_at DESC, id DESC);
```

## Partitioning for large tables

```sql
-- Partitioning by date range (logs, events)
CREATE TABLE event_log (
    id BIGINT AUTO_INCREMENT,
    event_type VARCHAR(50),
    created_at DATETIME NOT NULL,
    payload JSON,
    PRIMARY KEY (id, created_at)  -- created_at required in PK for partitions
)
PARTITION BY RANGE (YEAR(created_at)) (
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION p2026 VALUES LESS THAN (2027),
    PARTITION pmax VALUES LESS THAN MAXVALUE
);

-- Queries filtering by created_at will scan only relevant partitions
-- "Partition pruning" — visible in EXPLAIN
EXPLAIN SELECT * FROM event_log WHERE created_at BETWEEN '2026-01-01' AND '2026-03-31';

-- Deleting old data — instant, no locking
ALTER TABLE event_log DROP PARTITION p2024;
-- vs DELETE WHERE year=2024 — slow, generates lots of undo log
```

## Quick diagnostic — checklist

```sql
-- 1. Tables without a primary key
SELECT TABLE_SCHEMA, TABLE_NAME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA NOT IN ('mysql','information_schema','performance_schema','sys')
  AND TABLE_NAME NOT IN (
      SELECT TABLE_NAME FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_TYPE = 'PRIMARY KEY'
  );

-- 2. Large tables without indexes on foreign keys
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

-- 3. Fragmented tables (need OPTIMIZE)
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

> 💡 Rule of thumb: an index speeds up SELECT but slows down INSERT/UPDATE/DELETE. On write-heavy tables keep only the necessary indexes — each added index is an extra write on every row change.
