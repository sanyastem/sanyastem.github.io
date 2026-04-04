---
name: mysql-explain
description: Analyze MySQL query performance with EXPLAIN ANALYZE, suggest indexes, rewrite slow queries
allowed-tools: Read, Bash
---

Проанализируй и оптимизируй MySQL запрос: $ARGUMENTS

Если запрос не передан — возьми из slow query log: `sudo tail -50 /var/log/mysql/slow.log`

## Порядок работы

### 1. Запусти EXPLAIN ANALYZE
```sql
EXPLAIN ANALYZE <запрос>;
```

### 2. Что искать в результате

| Проблема | Признак |
|----------|---------|
| Full table scan | `Table scan on tablename` |
| Нет индекса | `type: ALL` вместо `ref`/`range` |
| Лишняя сортировка | `Sort` до `Limit` |
| Много строк отфильтровано | `rows_examined >> rows_returned` |
| Неверная статистика | `actual rows >> estimated rows` |

### 3. Проверь существующие индексы
```sql
SHOW INDEX FROM <table>;
```

### 4. Предложи индекс

Правило ESR для составного индекса:
- Сначала — поля с `=` (equality)
- Потом — поле для `ORDER BY` (sort)
- В конце — поля с `>`, `<`, `BETWEEN` (range)

Пример:
```sql
-- WHERE category_id = 5 AND status = 'active' ORDER BY created_at DESC
CREATE INDEX idx_name ON table (category_id, status, created_at DESC);
```

### 5. Covering index
Если запрос читает только несколько полей — добавь их в индекс чтобы избежать обращения к таблице.

### 6. Проверь пагинацию
Если есть `OFFSET` на большом значении — предложи cursor пагинацию:
```sql
-- Вместо: LIMIT 20 OFFSET 10000
-- WHERE id > :last_id ORDER BY id LIMIT 20
```

## Финальный ответ

- Текущий план выполнения с объяснением что плохо
- Конкретный `CREATE INDEX` который решит проблему
- Переписанный запрос если нужно
- Ожидаемое улучшение
