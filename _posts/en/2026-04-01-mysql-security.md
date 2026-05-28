---
layout: post
title: "MySQL 8.4: security — from install to production"
categories: databases
date: 2026-04-01
read_time: 10
difficulty: intermediate
series: "MySQL: security and performance"
part: 1
description: "Secure MySQL 8.4 LTS configuration: least privileges, SSL/TLS, SQL injection defense, caching_sha2_password, audit, and migration from 8.0."
excerpt_text: "Least privileges, SSL/TLS, caching_sha2_password and SQL injection defense — a secure MySQL 8.4"
keywords: "MySQL 8.4 security, MySQL least privileges, SSL TLS MySQL, SQL injection defense, caching_sha2_password, MySQL 8.0 EOL"
translation_of: "/databases/mysql-security/"
faq:
  - q: "Why move to MySQL 8.4 if 8.0 still works?"
    a: "MySQL 8.0 finished its innovation cycle, regular updates have stopped, only Extended Support and security patches remain. 8.4 is the current LTS, supported for at least 5 years. For new projects the choice is obvious; for old ones — migrate within a year or two."
  - q: "Should I give the app root access to the DB?"
    a: "Never. Create a separate user with minimum privileges only on the tables it needs (GRANT SELECT, INSERT, UPDATE, DELETE ON db.table). If someone gets the code, the attacker won't have CREATE USER, DROP, GRANT and other dangerous commands."
  - q: "SSL/TLS for MySQL connections — required or can I skip it?"
    a: "Required for all connections outside localhost. Without TLS, passwords and data travel in plain text. Within one machine via Unix socket — safe, TLS is overkill. Between hosts in the cloud — TLS is critical, even if the network seems 'private'."
  - q: "How do I defend against SQL injection at the DB level?"
    a: "The DB won't protect you from injection — that's the app's responsibility (prepared statements). At the DB level you add a second layer: minimum privileges (the app can't DROP TABLE), separate users per module, query timeouts for long queries. If injection happens — damage is localized."
  - q: "caching_sha2_password breaks old libraries — what now?"
    a: "It's the default auth plugin since MySQL 8.0. Old drivers (PHP < 7.2, Node mysql) may not support it. Solutions in order of correctness: 1) update to a modern driver (mysql2, latest PDO_mysql), 2) enable TLS — any plugin works then, 3) revert the user to mysql_native_password — only for legacy."
---

## Why 8.4, not 8.0

**MySQL 8.0** — EOL April 2026. After that, no security patches.

**MySQL 8.4 LTS** — released May 2024, supported through April 2032. The current production version for new projects.

**MySQL 9.x** (Innovation) — new features, but not LTS. For experiments, not production.

If you're still on 8.0 — migrate to 8.4. The upgrade is compatible: `mysql_upgrade` isn't needed starting with 8.x, just update the package.

## First run — mysql_secure_installation

Right after install:

```bash
mysql_secure_installation
```

It will:
- Install the validate_password plugin
- Ask for a strong root password
- Remove anonymous users
- Disallow remote root login
- Drop the `test` database

That's the minimum. Below — details.

## Principle of least privileges

One user for everything is bad practice. Create users for specific tasks:

```sql
-- Application user (read/write to its own tables only)
CREATE USER 'app_user'@'10.0.0.%' IDENTIFIED BY 'StrongPassword123!';
GRANT SELECT, INSERT, UPDATE, DELETE ON myapp.* TO 'app_user'@'10.0.0.%';

-- Read-only replica / reporting user
CREATE USER 'readonly_user'@'10.0.0.%' IDENTIFIED BY 'AnotherPassword!';
GRANT SELECT ON myapp.* TO 'readonly_user'@'10.0.0.%';

-- Migration user (structural changes only)
CREATE USER 'migration_user'@'localhost' IDENTIFIED BY 'MigrationPass!';
GRANT ALTER, CREATE, DROP, INDEX, REFERENCES ON myapp.* TO 'migration_user'@'localhost';

-- Apply immediately
FLUSH PRIVILEGES;
```

**Never** connect the app as `root`. If breached — attackers get access to all databases, can delete data, mess with `mysql.user`.

See what each user has:

```sql
SHOW GRANTS FOR 'app_user'@'10.0.0.%';
-- Or all users with privileges
SELECT user, host, authentication_string FROM mysql.user;
```

## caching_sha2_password — the new default

In MySQL 8.x the default auth method changed from `mysql_native_password` to `caching_sha2_password`. Safer — SHA-256 instead of SHA-1.

Problem: old clients (PHP < 8.1, old JDBC) may not support it.

```sql
-- Check the plugin for a specific user
SELECT user, plugin FROM mysql.user WHERE user = 'app_user';

-- If the client doesn't support caching_sha2_password — enable SSL
-- or switch to mysql_native_password (less desirable)
ALTER USER 'app_user'@'10.0.0.%'
    IDENTIFIED WITH caching_sha2_password BY 'password'
    REQUIRE SSL; -- require SSL

-- For clients that can't do SHA2 (temporary)
ALTER USER 'legacy_user'@'10.0.0.%'
    IDENTIFIED WITH mysql_native_password BY 'password';
```

## SSL/TLS — connection encryption

MySQL 8.4 enables SSL automatically on install (auto-generated certificates). Check:

```sql
SHOW VARIABLES LIKE 'have_ssl';        -- YES
SHOW VARIABLES LIKE 'ssl_ca';          -- CA path
SHOW STATUS LIKE 'Ssl_cipher';         -- current connection cipher
```

Force a user to use SSL:

```sql
-- On creation
CREATE USER 'secure_user'@'%' IDENTIFIED BY 'password' REQUIRE SSL;

-- Or alter existing
ALTER USER 'app_user'@'10.0.0.%' REQUIRE SSL;

-- Stricter — require a specific X.509 certificate
ALTER USER 'app_user'@'10.0.0.%' REQUIRE X509;
```

Verify from app (C# + MySQL Connector):

```csharp
var connStr = "Server=db;Database=myapp;User=app_user;Password=pass;" +
              "SslMode=Required;SslCa=/path/to/ca.pem;";
```

## validate_password — password policy

```sql
-- Check current settings
SHOW VARIABLES LIKE 'validate_password%';

-- Set the level (LOW, MEDIUM, STRONG)
SET GLOBAL validate_password.policy = MEDIUM;  -- length + special chars
SET GLOBAL validate_password.length = 12;
SET GLOBAL validate_password.mixed_case_count = 1;
SET GLOBAL validate_password.number_count = 1;
SET GLOBAL validate_password.special_char_count = 1;

-- Check a password without creating a user
SELECT VALIDATE_PASSWORD_STRENGTH('MyPassword123!');
-- Returns 0-100: <25 LOW, <50 MEDIUM, <75 STRONG, 100 — strong
```

## SQL injection defense

Injection is a code problem, not a MySQL one. But MySQL helps detect:

```sql
-- Enable general_log during development to see all queries
SET GLOBAL general_log = 'ON';
SET GLOBAL general_log_file = '/var/log/mysql/general.log';
-- DISABLE in production — slow and leaks data!
```

**How to protect in code:**

```csharp
// NEVER — string concatenation
string query = "SELECT * FROM users WHERE email = '" + email + "'";
// SQL injection: email = "' OR 1=1 --" → returns all users

// RIGHT — parameterized queries (ADO.NET)
using var cmd = connection.CreateCommand();
cmd.CommandText = "SELECT * FROM users WHERE email = @email";
cmd.Parameters.AddWithValue("@email", email);

// RIGHT — EF Core LINQ (parameterized automatically)
var user = await context.Users
    .FirstOrDefaultAsync(u => u.Email == email);

// RIGHT — EF Core raw SQL with parameters
var user = await context.Users
    .FromSqlInterpolated($"SELECT * FROM users WHERE email = {email}")
    .FirstOrDefaultAsync();
// DON'T use FromSqlRaw with concatenation!
```

## Firewall and network isolation

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf

# Listen on a specific interface only (not 0.0.0.0)
bind-address = 127.0.0.1
# Or for Docker/internal network:
# bind-address = 10.0.0.5

# Disable LOCAL INFILE (lets clients read files)
local_infile = 0
```

```bash
# Iptables — allow only from appserver
iptables -A INPUT -p tcp --dport 3306 -s 10.0.0.10 -j ACCEPT
iptables -A INPUT -p tcp --dport 3306 -j DROP
```

In Docker — don't expose 3306 unless needed:

```yaml
# docker-compose.yml
services:
  db:
    image: mysql:8.4
    # Don't add: ports: - "3306:3306"  # unless external access needed
    networks:
      - internal

  app:
    networks:
      - internal

networks:
  internal:
    driver: bridge
```

## Audit and monitoring

```sql
-- Log failed logins
SET GLOBAL log_error_verbosity = 3;

-- Check brute-force attempts
SELECT * FROM performance_schema.host_cache
WHERE sum_connect_errors > 0;

-- Reset a blocked host (if it exceeded max_connect_errors)
FLUSH HOSTS;

-- Who's connected right now
SELECT user, host, db, command, time, state
FROM information_schema.processlist
WHERE user != 'system user';
```

MySQL Enterprise Edition ships with MySQL Enterprise Audit. For open-source — MariaDB Audit Plugin or MySQL Community Audit (third-party).

## Encrypted backups

```bash
# mysqldump with password via --defaults-extra-file (not on the command line!)
cat > /tmp/mysql_creds.cnf <<EOF
[client]
user=backup_user
password=BackupPass!
EOF
chmod 600 /tmp/mysql_creds.cnf

# Encrypted backup
mysqldump --defaults-extra-file=/tmp/mysql_creds.cnf \
    --single-transaction --routines --triggers \
    myapp | gzip | openssl enc -aes-256-cbc -salt \
    -pass pass:$(cat /etc/backup.key) \
    -out /backups/myapp_$(date +%Y%m%d).sql.gz.enc

rm /tmp/mysql_creds.cnf
```

**Why not the password on the command line:** `ps aux` shows all process arguments — the password is visible to every system user.

> 💡 After setup, run `mysqlcheck --all-databases -u root -p` — it checks table integrity. And enable `innodb_file_per_table=ON` if not already — easier backups and space reclamation.
