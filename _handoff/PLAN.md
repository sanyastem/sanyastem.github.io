# Plan: .NET MAUI Android — Finance Tracker

## Context

Пользователь хочет простое мобильное приложение для учёта личных финансов под Android. Живёт в Польше — базовая валюта PLN. Ключевые требования:

- Локальное хранение данных на телефоне (без облака/бэкенда)
- Автоконвертация валют через **бесплатный API без регистрации**
- Биометрический вход (отпечаток / Face)
- Несколько счетов/кошельков в разных валютах
- Категории расходов/доходов с иконками
- Графики и статистика
- Массовое удаление данных за выбранный период
- Экспорт в CSV
- Отдельный экран отображения баланса в нескольких валютах одновременно («доп окошко»)
- **Семья / совместное использование:** создание «семьи», приглашение других пользователей, синхронизация данных между устройствами **только по локальной сети без серверов**, с сильным end-to-end шифрованием

Приложение будет собираться бесплатно на GitHub Actions (Linux runner), готовый APK пользователь скачивает с телефона из Actions Artifacts.

**Репозиторий:** `sanyastem/localwallet` уже создан пользователем (пустой). Пользователь попросил коммитить прямо в `master`.

**Доступ:** пользователь добавит `sanyastem/localwallet` в whitelist доступных репозиториев Claude Code и перезапустит сессию. После этого Claude клонирует репо локально, создаст файлы, сделает commit и push напрямую в `master`.

**Объём первого коммита:** полный MVP-каркас — MAUI-проект, SQLite, модели, базовые экраны (Dashboard / Transactions / AddTransaction / Accounts / Categories / Settings / MultiCurrency), сервис курсов валют (NBP + Frankfurter + кэш), биометрия, CSV-экспорт, удаление за период, GitHub Actions для сборки APK. **Без** семейной/P2P части — она пойдёт отдельными PR после того, как MVP будет собран и запущен на телефоне.

---

## Технологический стек

| Слой | Выбор | Обоснование |
|---|---|---|
| UI-фреймворк | .NET 9 + MAUI (Android) | Современная версия, знакомый C#-стек пользователя |
| MVVM | CommunityToolkit.Mvvm | Стандарт, source generators, меньше бойлерплейта |
| БД | **sqlite-net-pcl** | Проще и легче EF Core для мобильной БД, native performance |
| HTTP | HttpClientFactory | Стандарт |
| Биометрия | Plugin.Fingerprint | Самый популярный плагин, поддерживает Android BiometricPrompt |
| Графики | Microcharts.Maui | Лёгкая, без лицензии, достаточно для pie/line |
| CSV-экспорт | CsvHelper | Стандарт де-факто в .NET |
| Safe storage | SecureStorage (MAUI Essentials) | Для флага биометрии / настроек |
| DI | Встроенный в MauiAppBuilder | Достаточно |
| **LAN discovery** | **Zeroconf.NET** (mDNS/Bonjour) | Автопоиск устройств семьи в Wi-Fi, стандарт |
| **E2E-шифрование** | **NSec.Cryptography** (libsodium) | Audited crypto: Ed25519 + X25519 + XChaCha20-Poly1305 |
| **Транспорт sync** | `System.Net.Sockets.TcpClient` + TLS 1.3 | Прямое TCP-подключение peer-to-peer, без сервера |
| **QR-пейринг** | `QRCoder` (генерация) + `ZXing.Net.Maui` (скан) | Безопасный первичный обмен ключами |

---

## Семья и мульти-пользовательский режим (P2P, без сервера)

### Модель доступа
- Устройство может быть в **нуле, одной или нескольких семьях** одновременно
- В рамках одной семьи — общие счета, категории, транзакции
- Каждое устройство всегда имеет **личное пространство** (не синхронизируется ни с кем)
- Транзакция/счёт/категория принадлежит либо личному пространству, либо одной конкретной семье (`FamilyId IS NULL` или `FamilyId = X`)
- Роли в семье: **Owner** (создатель, может удалять других, менять имя семьи) и **Member** (может CRUD-ить данные семьи)

### Идентичность устройства
- При первом запуске генерируется **Ed25519 keypair** устройства (long-term identity)
- Приватный ключ хранится в Android Keystore через `SecureStorage` (MAUI Essentials маппит на EncryptedSharedPreferences → AES-GCM с ключом из TEE)
- `DeviceId = Base64(PublicKey)` — стабильный, используется в sync-логах

### Создание семьи
1. Пользователь A нажимает «Создать семью» → вводит имя
2. Генерируется: `FamilyId` (UUID), `FamilyKey` (256-бит симметричный XChaCha20-Poly1305) — это **корневой групповой ключ**
3. `FamilyKey` шифруется локально ключом устройства и хранится в SQLite. Запись о семье содержит: `FamilyId, Name, FamilyKey (encrypted), Role=Owner`
4. Устройство A становится **Owner**

### Присоединение нового участника (пейринг через QR)
Цель: безопасно передать `FamilyKey` с устройства A на устройство B в одной Wi-Fi, не давая сниффить даже при компрометации роутера.

**Протокол (однократная «церемония»):**
1. A: «Пригласить» → генерирует эфемерный **X25519 keypair** + 6-значный SAS-код (Short Authentication String)
2. A отображает QR: `FamilyId | FamilyName | DeviceA_PublicKey | A_ephemeralPublicKey | A_LAN_IP:port | nonce`
3. B: «Присоединиться» → сканирует QR, генерирует свой эфемерный X25519 keypair
4. B подключается к A по TCP на указанный IP:port, запускает **Noise XX handshake** (или ручной ECDH + HKDF) → получают общий `sessionKey`
5. **Критично:** оба устройства показывают одинаковый 6-значный SAS (производный от hash сессии) → пользователи **визуально сравнивают** его вслух. Это защита от MitM: если SAS совпадает → канал аутентичен
6. После подтверждения SAS A отправляет `FamilyKey` + список других членов внутри шифрованного канала
7. B сохраняет `FamilyKey`, регистрируется как `Member`, отправляет обратно свой публичный ключ → A добавляет его в `FamilyMembers`
8. A рассылает обновлённый список членов остальным при следующей синхронизации

**Почему это безопасно:**
- Даже если атакующий в той же Wi-Fi перехватит трафик — без приватного ключа Noise он ничего не расшифрует
- SAS защищает от MitM: подменить QR незаметно нельзя, подменить канал и показать «правильный» SAS — невозможно без знания ключей
- `FamilyKey` никогда не пересекает сеть в незашифрованном виде

### Обычная работа и обнаружение (после пейринга)
- Каждое устройство при запуске/возврате в foreground запускает **mDNS-advertise**: сервис `_financetracker._tcp.local.`, TXT-запись `fid=<FamilyId-hash>,did=<DeviceId-short>`
- Параллельно слушает mDNS → обнаруживает других членов семей на LAN
- Найдя peer из своей семьи → открывает TCP-соединение, выполняет authenticated handshake (MAC по `FamilyKey` + challenge-response с подписью `DevicePrivateKey`), запускает sync-сессию
- Если нет сети / никого рядом → всё работает офлайн, данные накапливаются локально, синхронизируются при следующей встрече

### Протокол синхронизации (offline-first, без конфликтов)
**Архитектура:** event-sourced лог + Lamport timestamps + soft-delete tombstones.

- Каждое изменение (create/update/delete сущности) записывается не как «UPDATE», а как **событие** в таблице `SyncEvent`:
  - `Id` (UUID), `FamilyId`, `EntityType` (Transaction/Account/Category), `EntityId`, `Operation` (Upsert/Delete), `Payload` (JSON, зашифрован `FamilyKey` → XChaCha20-Poly1305), `LamportClock`, `DeviceId`, `Signature` (Ed25519 подпись автора)
- Состояние сущностей (`Transaction`, `Account` и т.д.) — это **проекция** применённых событий. При получении новых событий проекция пересчитывается.
- **Lamport clock** на каждом устройстве: `max(local, received) + 1`. Обеспечивает каузальный порядок.
- **Разрешение конфликтов:** last-writer-wins по `(LamportClock, DeviceId)` — детерминистично на всех устройствах
- **Удаление = tombstone:** запись не стирается, вставляется событие `Delete`. При массовом удалении за период — генерируется пачка tombstone-событий.

**Цикл sync между двумя peers:**
1. Handshake (MAC + подпись, см. выше)
2. Обмен **last seen vector clock** (`DeviceId → max LamportClock`) — несколько килобайт даже для тысяч событий
3. Каждый вычисляет «каких событий у тебя нет» → отправляет пачки
4. Получатель проверяет подпись события (Ed25519 от `DeviceId`-автора из `FamilyMembers`), дешифрует `Payload` ключом `FamilyKey`, применяет к проекции, сохраняет в SyncEvent
5. По завершении — обновляет LastSyncTime для этого peer

### Безопасность — резюме
| Угроза | Защита |
|---|---|
| Прослушка Wi-Fi | E2E-шифрование `FamilyKey` (XChaCha20-Poly1305) — TLS лишь дополнительный слой |
| Malicious peer в LAN | Handshake отклоняет неподписанные / не-членов; подмена событий невозможна (Ed25519-подпись автора) |
| MitM при пейринге | SAS (короткая строка визуальной сверки) |
| Потеря/кража телефона | Биометрия + ключи в Android Keystore (TEE); опция «удалить меня из семьи» через Owner |
| Компрометация одного устройства | Owner может отозвать участника → его новые события отбрасываются всеми остальными (revoke-событие, подписанное Owner, с tombstone для его ключа) |
| Replay | `nonce` в handshake + event-id уникальность |
| Чтение БД на устройстве | SQLite сама не шифруется; но payload событий — зашифрован; для защиты самой базы можно добавить SQLCipher позже (off-scope MVP) |

### Пользовательские сценарии
- «Муж и жена»: каждый — отдельный `Member` в одной семье `Home`. Личные кошельки остаются приватными (не в семье), общий бюджет — в семейных счетах.
- Добавление третьего (ребёнок / родитель) — точно такой же QR-пейринг у любого существующего члена.
- Потеря телефона: на новом устройстве Owner делает «Remove member» старому + «Invite» новому → новый получит свежий `FamilyKey` через ротацию (опция для MVP — упрощённо: все делают QR повторно).

---

## Источник курсов валют (бесплатно, без регистрации)

**Primary:** **NBP (Narodowy Bank Polski)** — официальный API ЦБ Польши
- `https://api.nbp.pl/api/exchangerates/tables/A?format=json`
- Возвращает курсы ~35 валют относительно PLN
- Обновление раз в рабочий день, без ключа, без лимитов для личного использования

**Fallback:** **frankfurter.app** (данные ЕЦБ)
- `https://api.frankfurter.app/latest?from=PLN`
- На случай если NBP недоступен или нужна валюта вне списка NBP

**Кэширование:** последние курсы сохраняются в SQLite. При отсутствии сети — используется кэш. Ручное обновление из Settings.

---

## Структура нового репозитория

```
localwallet/
├── LocalWallet.sln
├── .gitignore                          # стандартный dotnet + .vs/.idea/bin/obj
├── README.md                           # как собрать, как скачать APK
├── .github/workflows/
│   └── android-build.yml               # сборка APK на ubuntu-latest
└── src/LocalWallet/
    ├── LocalWallet.csproj           # TargetFramework: net9.0-android
    ├── MauiProgram.cs                  # DI-регистрация сервисов
    ├── App.xaml / App.xaml.cs
    ├── AppShell.xaml                   # TabBar навигация
    ├── Platforms/Android/
    │   ├── MainActivity.cs
    │   ├── MainApplication.cs
    │   └── AndroidManifest.xml         # INTERNET, USE_BIOMETRIC
    ├── Models/
    │   ├── Account.cs
    │   ├── Category.cs
    │   ├── Transaction.cs
    │   ├── ExchangeRate.cs
    │   └── AppSettings.cs
    ├── Services/
    │   ├── Database/
    │   │   ├── IDatabaseService.cs
    │   │   └── DatabaseService.cs      # sqlite-net, CreateTableAsync, CRUD
    │   ├── ExchangeRates/
    │   │   ├── IExchangeRateService.cs
    │   │   ├── NbpRatesProvider.cs
    │   │   ├── FrankfurterRatesProvider.cs
    │   │   └── ExchangeRateService.cs  # кэширование + fallback
    │   ├── Crypto/
    │   │   ├── DeviceIdentityService.cs   # Ed25519 keypair, Android Keystore
    │   │   ├── FamilyCryptoService.cs     # FamilyKey gen/encrypt/decrypt (XChaCha20-Poly1305)
    │   │   └── PairingService.cs          # Noise handshake + SAS verification
    │   ├── Sync/
    │   │   ├── ISyncService.cs
    │   │   ├── SyncService.cs             # оркестратор
    │   │   ├── LanDiscoveryService.cs     # mDNS advertise + browse (Zeroconf.NET)
    │   │   ├── SyncTransport.cs           # TcpListener/TcpClient + framing
    │   │   ├── EventStore.cs              # append/query SyncEvent + Lamport clock
    │   │   └── Projector.cs               # apply events -> entity projections
    │   ├── Family/
    │   │   ├── FamilyService.cs           # создать/присоединиться/покинуть/участники
    │   │   └── InvitationCodec.cs         # QR payload сериализация
    │   ├── BiometricService.cs
    │   ├── ExportService.cs            # CsvHelper → Share файл
    │   └── SettingsService.cs          # Preferences + SecureStorage
    ├── ViewModels/
    │   ├── Base/BaseViewModel.cs
    │   ├── DashboardViewModel.cs
    │   ├── MultiCurrencyViewModel.cs
    │   ├── TransactionsViewModel.cs
    │   ├── AddTransactionViewModel.cs
    │   ├── AccountsViewModel.cs
    │   ├── CategoriesViewModel.cs
    │   ├── StatisticsViewModel.cs
    │   ├── SettingsViewModel.cs
    │   ├── FamilyListViewModel.cs
    │   ├── FamilyDetailsViewModel.cs
    │   ├── InviteViewModel.cs           # показ QR + SAS
    │   └── JoinFamilyViewModel.cs       # скан QR + SAS verify
    ├── Views/
    │   ├── LockPage.xaml               # биометрия при запуске
    │   ├── DashboardPage.xaml
    │   ├── MultiCurrencyPage.xaml      # «доп окошко» — баланс в N валютах
    │   ├── TransactionsPage.xaml       # список + фильтр по периоду
    │   ├── AddTransactionPage.xaml
    │   ├── AccountsPage.xaml
    │   ├── CategoriesPage.xaml
    │   ├── StatisticsPage.xaml         # pie + line charts
    │   ├── SettingsPage.xaml           # базовая валюта, удаление за период, экспорт
    │   ├── FamilyListPage.xaml         # список семей с индикатором sync
    │   ├── FamilyDetailsPage.xaml      # участники, роль, «Пригласить», «Покинуть»
    │   ├── InvitePage.xaml             # QR-код + 6-значный SAS + статус ожидания
    │   └── JoinFamilyPage.xaml         # камера для скана QR + подтверждение SAS
    ├── Converters/
    │   ├── CurrencyFormatConverter.cs
    │   └── TransactionTypeColorConverter.cs
    └── Resources/
        ├── Styles/                     # Colors.xaml, Styles.xaml (светлая/тёмная тема)
        ├── Images/                     # иконки категорий (SVG/PNG)
        └── AppIcon/
```

---

## Модель данных (SQLite)

> Все сущности, которые могут принадлежать семье, получают поле `FamilyId` (`NULL` = личное). При удалении используется `IsDeleted` (tombstone) + событие в `SyncEvent`.

**Account**: `Id` (GUID), `FamilyId` (nullable), `Name`, `Currency`, `InitialBalance`, `IconName`, `ColorHex`, `CreatedAt`, `IsDeleted`, `LamportClock`, `LastModifiedBy` (DeviceId)

**Category**: `Id` (GUID), `FamilyId` (nullable), `Name`, `Type`, `IconName`, `ColorHex`, `IsDeleted`, `LamportClock`, `LastModifiedBy`

**Transaction**: `Id` (GUID), `FamilyId` (nullable), `AccountId` (FK), `CategoryId` (FK), `Amount`, `Currency`, `Date`, `Note`, `ExchangeRateToBase`, `CreatedBy` (DeviceId), `IsDeleted`, `LamportClock`, `LastModifiedBy`

**ExchangeRate**: `Id`, `BaseCurrency`, `TargetCurrency`, `Rate`, `FetchedAt`, `Source` — *локальная таблица, не синхронизируется*

**AppSettings** (single row): `BaseCurrency`, `DisplayCurrenciesCsv`, `BiometricEnabled`, `LastRatesUpdate`, `CurrentLamportClock`

### Новые таблицы для семьи/синхронизации

**DeviceIdentity** (single row): `DeviceId` (pub key base64), `PrivateKey` (в SecureStorage), `DisplayName`

**Family**: `Id` (GUID), `Name`, `FamilyKey` (XChaCha20-шифрован ключом устройства), `Role` (Owner/Member), `CreatedAt`

**FamilyMember**: `Id`, `FamilyId` (FK), `DeviceId` (pub key), `DisplayName`, `Role`, `JoinedAt`, `RevokedAt` (nullable), `LastSyncedAt`

**SyncEvent**: `Id` (GUID), `FamilyId`, `EntityType`, `EntityId`, `Operation` (Upsert/Delete), `EncryptedPayload` (blob, XChaCha20-Poly1305 под `FamilyKey`), `Nonce`, `LamportClock`, `AuthorDeviceId`, `Signature` (Ed25519), `CreatedAt`

**PairingSession** (временная): `Id`, `EphemeralPrivateKey`, `ExpectedPeerPubKey`, `SAS`, `ExpiresAt` — очищается после handshake

---

## Экраны и UX

1. **LockPage** — показывается при старте если включена биометрия.

2. **Dashboard (главный)** — суммарный баланс, конвертированный в базовую валюту. Переключатель области: **Личное / Семья «X» / Всё**. Индикатор статуса синхронизации (зелёная точка если кто-то из семьи онлайн). Последние 5 транзакций. Кнопка `+`.

3. **Multi-currency** — тот же общий баланс в списке валют из настроек.

4. **Transactions** — список с группировкой по датам. Фильтр: период, счёт, категория, **область (личное / семья)**. Для семейных записей — иконка автора.

5. **AddTransaction** — сумма, валюта, счёт, категория, дата, заметка, Income/Expense. Если активна семья — чекбокс «Семейная операция».

6. **Statistics** — выбор периода + области (личное/семья). Pie chart по категориям. Line chart динамики.

7. **Accounts** — CRUD. При создании — выбор: личный счёт или в рамках семьи X.

8. **Categories** — CRUD, с возможностью привязки к семье.

9. **Settings**:
   - Базовая валюта, мультиметка, биометрия
   - Удаление данных за период (с выбором области!)
   - Обновить курсы / экспорт CSV / сброс БД
   - Имя устройства (отображается другим членам семьи)

10. **FamilyListPage** — список семей пользователя + кнопка «Создать новую». У каждой — статус: N участников, последняя синхронизация, сколько онлайн сейчас.

11. **FamilyDetailsPage** — имя семьи, роль пользователя, список участников (с датой вступления, статусом online/offline, именем устройства). Кнопки:
    - «Пригласить участника» → InvitePage
    - «Покинуть семью» (любой член)
    - «Удалить участника» (только Owner)
    - «Переименовать» (Owner)

12. **InvitePage** — генерирует QR + показывает 6-значный SAS крупно. Текст: «Попросите нового участника отсканировать QR. После скана сверьте числа на обоих телефонах, прежде чем подтверждать». Статус: «Ожидание подключения…» → «Устройство подключилось, сверьте код» → «Присоединился».

13. **JoinFamilyPage** — камера со сканером QR. После скана устанавливает соединение, показывает полученный SAS, кнопка «Коды совпадают — принять» / «Не совпадают — отменить».

---

## GitHub Actions workflow (.github/workflows/android-build.yml)

- Триггеры: `push` в `main`, ручной `workflow_dispatch`
- Runner: `ubuntu-latest` (×1 множитель, бесплатно)
- Шаги:
  1. `actions/checkout@v4`
  2. `actions/setup-dotnet@v4` → .NET 9
  3. `dotnet workload install maui-android`
  4. `dotnet restore`
  5. `dotnet publish src/LocalWallet/LocalWallet.csproj -f net9.0-android -c Release -o ./artifacts`
  6. `actions/upload-artifact@v4` — загружает `*.apk` (unsigned или debug-signed)

Итог: APK хранится 90 дней в Actions → Artifacts, скачивается с телефона браузером. Для установки: Settings → «Неизвестные источники» → разрешить.

Опционально (на позже): подпись release-keystore через repo secrets.

---

## Ключевые моменты реализации (для последующего этапа)

- **Snapshot курса в транзакции** — `ExchangeRateToBase` сохраняется в момент создания транзакции, чтобы исторические суммы в базовой валюте не менялись при обновлении курсов.
- **NBP API** возвращает массив `rates` с полем `code` и `mid` (курс к PLN). Парсинг: `decimal pricePerUnit = rate.mid`.
- **Частота обновления курсов**: раз в сутки + ручная кнопка. Проверка `LastRatesUpdate` при старте.
- **Миграции БД**: при каждом запуске `db.CreateTableAsync<T>()` — идемпотентно в sqlite-net.
- **Темизация**: следовать системе (Light/Dark), через `AppThemeBinding`.

---

## Файлы и внешние зависимости (верхнеуровневый список)

NuGet-пакеты:
- `Microsoft.Maui.Controls` 9.0.x
- `CommunityToolkit.Mvvm` 8.x
- `sqlite-net-pcl` 1.9.x + `SQLitePCLRaw.bundle_green`
- `Plugin.Fingerprint` 3.x
- `Microcharts.Maui` 1.x
- `CsvHelper` 33.x
- `NSec.Cryptography` 24.x (libsodium — Ed25519/X25519/XChaCha20-Poly1305)
- `Zeroconf` 3.x (mDNS discovery)
- `QRCoder` 1.6.x (генерация QR)
- `ZXing.Net.Maui.Controls` 0.4.x (сканер QR)

Android-разрешения в `AndroidManifest.xml`:
- `INTERNET` (для API курсов)
- `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE`, `CHANGE_WIFI_MULTICAST_STATE` (mDNS)
- `USE_BIOMETRIC`
- `CAMERA` (скан QR при пейринге)

### Этапы реализации (рекомендую разбить на PR)

1. **MVP-ядро** (без семьи): MAUI-скелет, SQLite, категории/счета/транзакции, курсы, биометрия, CSV-экспорт, удаление за период, GitHub Actions.
2. **Криптоинфраструктура:** DeviceIdentityService, SecureStorage, базовые тесты шифрования.
3. **Event sourcing:** перевод сущностей на `SyncEvent` + `Projector`, Lamport clock, tombstones. Сохраняется обратная совместимость — личные сущности работают как раньше.
4. **Family + pairing:** FamilyService, QR-генерация/скан, Noise handshake, SAS-сверка.
5. **LAN discovery + sync:** mDNS, TCP-транспорт, обмен событиями, UI индикаторы.
6. **Отзыв участника + ротация ключей** (опционально после MVP семьи).

---

## Верификация

**Локально (если у пользователя есть Android Studio / SDK):**
```bash
dotnet build src/LocalWallet/LocalWallet.csproj -f net9.0-android
dotnet build -t:Run -f net9.0-android      # запуск на эмуляторе/подключённом устройстве
```

**Без локальной среды (основной сценарий пользователя):**
1. `git push` в новый репозиторий
2. GitHub → вкладка Actions → дождаться зелёной сборки (~5–8 минут)
3. Открыть последний run → раздел Artifacts → скачать `LocalWallet-apk.zip` (можно с телефона)
4. Распаковать, установить APK (разрешить установку из неизвестных источников)
5. При первом запуске — настроить биометрию (если включена) и базовую валюту в Settings

**Smoke-чеклист после установки (одиночное устройство):**
- [ ] Запуск без крашей, дашборд показывает 0.00 PLN
- [ ] Создать счёт в PLN и счёт в EUR
- [ ] Создать категории «Еда», «Транспорт», «Зарплата»
- [ ] Добавить доход и расход, проверить что баланс обновился
- [ ] Открыть Multi-currency — баланс отображается в выбранных валютах
- [ ] Включить биометрию → перезапуск → LockPage работает
- [ ] Удалить транзакции за период → проверить что удалились только в диапазоне
- [ ] Экспорт в CSV → файл шарится через системный Share
- [ ] Выключить интернет → добавить транзакцию → курс берётся из кэша

**Smoke-чеклист семейной синхронизации (нужно 2+ устройства в одной Wi-Fi):**
- [ ] A: «Создать семью Home» → семья появилась в FamilyList
- [ ] A: «Пригласить» → виден QR + SAS
- [ ] B: «Присоединиться» → скан QR → SAS совпадает → принять
- [ ] Оба: FamilyDetails показывает двух участников со статусом online
- [ ] A добавил семейную транзакцию → в течение 2-5 сек появилась у B
- [ ] B удалил транзакцию → у A исчезла (tombstone)
- [ ] Отключить Wi-Fi у B → A делает 3 транзакции → включить Wi-Fi → все 3 синхронизировались
- [ ] Личная транзакция у A не появляется у B (проверка изоляции)
- [ ] Owner удаляет участника → его новые события игнорируются
- [ ] Попытка пейринга с **намеренно изменённым** SAS → отказ: данные не должны передаться

---

## Что потребуется от пользователя

1. Создать новый пустой репозиторий на GitHub (например `finance-tracker`)
2. Либо дать доступ Claude к новому репо, либо скопировать сгенерированные файлы к себе и запушить самостоятельно
3. После первой зелёной сборки — скачать APK из Actions и установить на телефон
