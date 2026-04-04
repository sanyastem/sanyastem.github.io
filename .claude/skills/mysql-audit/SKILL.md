---
name: mysql-audit
description: Audit MySQL 8.4 security configuration — check users/privileges, SSL, password policy, network exposure
allowed-tools: Read, Bash
---

Проверь безопасность MySQL: $ARGUMENTS

Подключение берётся из `.env` или `appsettings.json` — найди connection string автоматически.

## Чеклист аудита

Выполни следующие SQL-запросы и проверь результаты:

### 1. Пользователи с избыточными правами
```sql
SELECT user, host, Super_priv, Grant_priv, File_priv 
FROM mysql.user 
WHERE Super_priv='Y' OR Grant_priv='Y' OR File_priv='Y';
```
Если есть не-root пользователи с Super/Grant/File — флаг.

### 2. Пользователи без пароля или с пустым паролем
```sql
SELECT user, host, authentication_string, plugin
FROM mysql.user
WHERE authentication_string = '' OR authentication_string IS NULL;
```

### 3. Пользователи с доступом с любого хоста (%)
```sql
SELECT user, host FROM mysql.user WHERE host = '%';
```
Для приложений — должен быть конкретный IP или подсеть, не `%`.

### 4. SSL статус
```sql
SHOW VARIABLES LIKE 'have_ssl';
SELECT user, host, ssl_type FROM mysql.user WHERE ssl_type = '';
```
Если пользователи приложения без SSL — флаг.

### 5. local_infile
```sql
SHOW VARIABLES LIKE 'local_infile';
```
Должно быть OFF.

### 6. Версия MySQL
```sql
SELECT VERSION();
```
Если версия < 8.4 — предупреди: 8.0 EOL апрель 2026, нужен апгрейд.

## Вывод

Для каждой найденной проблемы:
- Опиши риск
- Дай точную SQL-команду для исправления
- Укажи приоритет: КРИТИЧНО / ВЫСОКИЙ / СРЕДНИЙ

Не выполняй изменения автоматически — только покажи что нужно сделать.
