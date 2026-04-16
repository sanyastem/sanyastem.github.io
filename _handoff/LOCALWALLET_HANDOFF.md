# LocalWallet — передача работы в новую сессию

Этот документ + архив `localwallet-source.zip` позволяют продолжить работу над приложением **LocalWallet** в любой новой сессии Claude Code.

## Быстрый контекст

**LocalWallet** — Android-приложение для учёта личных финансов под .NET 9 MAUI. Разрабатывается в репозитории `sanyastem/localwallet` (master). Базовая валюта — **PLN** (пользователь живёт в Польше). Данные хранятся локально в SQLite.

**Планируется (не в MVP):** семьи / совместный бюджет с синхронизацией по локальной сети (mDNS + Noise handshake + XChaCha20-Poly1305), без серверов.

---

## Что уже сделано (содержимое архива)

Полный MVP-каркас, 60 файлов, ~2845 строк кода. См. `localwallet-source.zip` в этой же папке. Распакуйте в корень репозитория `localwallet` и запушьте.

### Реализовано

- **Проект**: `LocalWallet.sln` + `src/LocalWallet/LocalWallet.csproj` (net9.0-android, .NET 9 MAUI)
- **Bootstrap**: `MauiProgram.cs` с DI-регистрацией всех сервисов и VM, `App.xaml`, `AppShell.xaml` с 5 табами
- **Модели SQLite** (5): `Account`, `Category` (с типом Income/Expense), `Transaction`, `ExchangeRate`, `AppSettings`. Все уже имеют поля `FamilyId`, `IsDeleted`, `LamportClock`, `LastModifiedBy` — готовы для будущей P2P-синхронизации, но пока не используются.
- **Сервисы**:
  - `DatabaseService` (sqlite-net-pcl) — CRUD для всех сущностей, seed дефолтных категорий
  - `NbpRatesProvider` — https://api.nbp.pl/api/exchangerates/tables/A (primary, без регистрации)
  - `FrankfurterRatesProvider` — https://api.frankfurter.app (fallback, ECB data)
  - `ExchangeRateService` — оркестратор с кэшированием
  - `BiometricService` — Plugin.Fingerprint обёртка
  - `ExportService` — CSV через CsvHelper + системный Share sheet
  - `SettingsService` — чтение/запись настроек
- **ViewModels** (CommunityToolkit.Mvvm): Base + 8 VM для всех страниц
- **Views (9 страниц)**: Lock, Dashboard, MultiCurrency, Transactions, AddTransaction, Accounts, Categories, Statistics, Settings
- **Converters**: `InverseBoolConverter`
- **Resources**: Colors.xaml (Material Green), Styles.xaml (Light/Dark через AppThemeBinding), SVG AppIcon + Splash placeholder
- **GitHub Actions**: `.github/workflows/android-build.yml` — сборка APK на ubuntu-latest, артефакт `LocalWallet-apk` хранится 90 дней

### Ключевые экраны

- **Dashboard** — общий баланс в базовой валюте + последние операции + FAB-кнопка `+`
- **Multi-currency** — тот же баланс в списке валют из настроек + кнопка обновления курсов
- **Transactions** — список с фильтром по периоду, swipe-to-delete
- **AddTransaction** — форма добавления с переключателем Доход/Расход
- **Accounts / Categories** — CRUD с swipe-to-delete
- **Statistics** — DonutChart (Microcharts) + таблица по категориям, фильтр по периоду
- **Settings** — базовая валюта, отображаемые валюты, биометрия, обновить курсы, экспорт CSV, удалить за период, сбросить всё

---

## Что делать в новой сессии

### Шаг 1. Достать исходники

**Вариант A** (если добавили `sanyastem/localwallet` в whitelist Claude):

```bash
# скачать zip из блога
curl -L -o /tmp/lw.zip https://github.com/sanyastem/sanyastem.github.io/raw/master/_handoff/localwallet-source.zip
# клонировать пустой репо
git clone https://github.com/sanyastem/localwallet.git /home/user/localwallet
# распаковать исходники в него
cd /home/user/localwallet && unzip /tmp/lw.zip
git add -A
git commit -m "Initial MVP: .NET 9 MAUI Android finance tracker"
git push -u origin master
```

**Вариант B** (если whitelist не настроен): Claude не сможет пушить в `localwallet` напрямую — попросите пользователя сделать это самостоятельно с компьютера после распаковки архива.

### Шаг 2. Проверить сборку

1. После `git push` открыть https://github.com/sanyastem/localwallet/actions
2. Дождаться окончания workflow "Build Android APK" (~5–8 минут)
3. Если зелёный — в Artifacts появится `LocalWallet-apk.zip`
4. Скачать на телефон, распаковать, установить (разрешить установку из неизвестных источников)

### Шаг 3. Возможные проблемы первого запуска и их фикс

- **Build fails: MauiImage включает пустую папку Images/** — создать заглушку или убрать `<MauiImage>` из csproj
- **Runtime: Font not found** — шрифты OpenSans уже убраны, но если где-то остались ссылки — используйте системный
- **Plugin.Fingerprint версия 3.0.0-beta.1** может оказаться несовместимой с .NET 9 — откатить на `2.1.5` стабильную или обновить до последней 3.x

### Шаг 4. После первого успешного APK — развивать по плану

Следующие PR (в порядке приоритета):

1. **Криптоинфраструктура** — `Services/Crypto/DeviceIdentityService.cs` (Ed25519 keypair через NSec.Cryptography + SecureStorage), базовые unit-тесты шифрования
2. **Event sourcing** — таблица `SyncEvent`, `EventStore.cs`, `Projector.cs`, перевод `SaveTransactionAsync` и др. на генерацию событий + проекцию
3. **Family + pairing** — `FamilyService`, `InvitationCodec` (QR payload), `PairingService` (Noise XX handshake + SAS), страницы `FamilyListPage/FamilyDetailsPage/InvitePage/JoinFamilyPage`
4. **LAN discovery + sync** — `LanDiscoveryService` (mDNS через Zeroconf), `SyncTransport` (TcpListener), `SyncService` (оркестратор), индикаторы статуса на Dashboard
5. **Revoke участника + ротация ключей** — опционально после базовой P2P

---

## Технологический стек

| Слой | Пакет | Версия |
|---|---|---|
| UI | Microsoft.Maui.Controls | 9.0.10 |
| MVVM | CommunityToolkit.Mvvm | 8.3.2 |
| DB | sqlite-net-pcl + SQLitePCLRaw.bundle_green | 1.9.172 / 2.1.10 |
| Биометрия | Plugin.Fingerprint | 3.0.0-beta.1 |
| Графики | Microcharts.Maui | 1.0.0 |
| CSV | CsvHelper | 33.0.1 |
| *(планируется)* Crypto | NSec.Cryptography | 24.x |
| *(планируется)* mDNS | Zeroconf | 3.x |
| *(планируется)* QR | QRCoder + ZXing.Net.Maui.Controls | 1.6.x / 0.4.x |

---

## Важные технические детали, которые легко упустить

### Курсы валют и конвертация

- `ExchangeRate.Rate` хранится в формате **«сколько единиц target-валюты за 1 единицу base»**. Для NBP `mid` — это сколько PLN за 1 единицу валюты, поэтому в `NbpRatesProvider` делается инверсия: `Rate = 1m / mid`
- `Transaction.ExchangeRateToBase` — снимок курса на момент операции. Используется статистикой, чтобы исторические данные не «плыли»
- При конвертации в `ExchangeRateService.ConvertAsync` всё идёт через базовую валюту: `amount → base → target`

### База данных

- Путь: `FileSystem.AppDataDirectory/localwallet.db3`
- Удаление — **soft** (`IsDeleted=true`). Хард-удаление только в `ResetAllDataAsync`
- При первом запуске в `DatabaseService.InitializeAsync` seed-ятся 7 дефолтных категорий

### Android-разрешения

В MVP: `INTERNET`, `ACCESS_NETWORK_STATE`, `USE_BIOMETRIC`, `USE_FINGERPRINT`.
При добавлении P2P-части понадобятся: `ACCESS_WIFI_STATE`, `CHANGE_WIFI_MULTICAST_STATE`, `CAMERA`.

### Биометрия

Plugin.Fingerprint требует вызова `CrossFingerprint.SetCurrentActivityResolver` в `MainActivity.OnCreate` — это уже сделано.

### Стили / темизация

`Styles.xaml` содержит базовые Style-ы для Label/Button/Entry/Editor/Shell. Светлая/тёмная тема через `AppThemeBinding`. Primary-цвет: `#2E7D32` (Material Green 800).

### Стейт-сервис

`AppSettings` — single-row таблица с `Id=1`. Никогда не удалять эту строку. При `SaveSettingsAsync` используется `InsertOrReplaceAsync`.

---

## Полный исходный план (далее)

Детальный план со всеми архитектурными решениями — в файле `PLAN.md` в этой же папке `_handoff/`.

---

## Контакт с пользователем

- Репозиторий блога: `sanyastem/sanyastem.github.io` (где лежит этот handoff)
- Целевой репозиторий: `sanyastem/localwallet` (пустой, ждёт push)
- GitHub username: `sanyastem`
- Локация: Польша (базовая валюта PLN)
- Стек опыта пользователя: .NET, Angular
- Способ доставки APK: GitHub Actions artifacts, скачивание с телефона
