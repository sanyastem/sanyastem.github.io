---
layout: post
title: "git rebase vs merge: когда что использовать на реальном проекте"
categories: git
translation_of: "/en/git/git-rebase-vs-merge/"
tldr:
  - "Правило выбора: своя ветка — git rebase main для линейной истории; общая ветка — только merge, иначе force-push сломает коммиты коллег."
  - "После rebase пушь через git push --force-with-lease — он откажется перезаписывать ветку, если кто-то запушил в неё после твоего fetch."
  - "Перед PR чисти историю через git rebase -i: fixup склеивает WIP-коммиты без сообщений, squash — с объединением сообщений, drop удаляет коммит."
  - "Потерянные после rebase коммиты ищи в git reflog (хранит движения HEAD 90 дней): git reset --hard <sha> вернёт всё как было."
date: 2026-05-08
date_ru: "8 мая 2026"
read_time: 8
difficulty: intermediate
series: "Git workflow: профессиональная работа"
part: 3
description: "Когда rebase делает историю чище, а когда ломает чужие ветки: реальные сценарии, force-with-lease, interactive rebase, восстановление через reflog."
excerpt_text: "Чистая история через rebase или безопасный merge — выбор зависит от ветки. Разбираем оба сценария на реальных кейсах"
keywords: "git rebase vs merge, interactive rebase, force-with-lease, git reflog, squash коммитов, чистая git история"
faq:
  - q: "Что делать если после rebase коллеги не могут pull?"
    a: "Если rebase'нул shared-ветку и сделал force-push — коллегам нужно: 1) сохранить локальные коммиты (git stash), 2) git fetch + git reset --hard origin/branch, 3) применить свои коммиты cherry-pick'ом. Урок: rebase shared веток — табу."
  - q: "Squash merge в PR — это rebase или merge?"
    a: "Технически merge с автоматическим squash всех коммитов фичи в один. GitHub/GitLab делают одной кнопкой. История main линейная (как при rebase), но без переписывания feature-ветки. Лучший компромисс для большинства команд."
  - q: "--force-with-lease защищает на 100%?"
    a: "Нет, но почти. Защитит если кто-то запушил после твоего fetch. НЕ защитит: если ты только что fetch'нул и тут же сделал force-with-lease — коллега за эти 2 секунды мог что-то залить. Реально срабатывает в 99% случаев."
  - q: "Где видны потерянные коммиты после rebase?"
    a: "В git reflog — журнале всех движений HEAD за 90 дней. git reflog show HEAD покажет историю, можно git reset --hard <sha> на любой потерянный коммит. Очищается через git gc — но руками его никто не запускает."
---

В каждой команде есть холивар: rebase или merge. Правда такая — у обоих свои сценарии, и выбор зависит не от вкуса, а от **где находится ветка**: личная или общая.

## Короткий ответ — таблица

| Ситуация | Подход | Почему |
|---|---|---|
| Подтянуть свежий main в **свою** feature-ветку | `git rebase main` | Линейная история, нет «merge bubble» |
| Слить готовую feature в main через PR | `merge --no-ff` | Видно границы фичи в `git log --graph` |
| Feature-ветку **разделяют** двое | `git merge main` | Rebase сломает чужие коммиты |
| Подготовить PR — много мелких WIP-коммитов | `rebase -i` (squash) | Читаемая история в main |
| Public-ветка (release, master) отстала от хотфикса | `merge` | Никогда не переписываем published-историю |
| Локальная ветка сломалась после rebase | `git reflog` + reset | Reflog хранит всё на 90 дней |

Всё остальное — детали. Дальше разбираем каждое правило на примере.

## Что вообще происходит под капотом

**Merge** создаёт новый «merge commit» с двумя родителями. История остаётся такой как была + узел сверху:

```
*   abc1234 Merge branch 'feature' into main
|\
| * def5678 Add cart endpoint
| * 9876fed Refactor auth
* | 1111aaa Fix typo on main
|/
* 2222bbb Initial
```

**Rebase** «переносит» твои коммиты на новую базу — переписывает их с новыми хешами. История линейна:

```
* def5678' Add cart endpoint     ← новый хеш!
* 9876fed' Refactor auth         ← новый хеш!
* 1111aaa Fix typo on main
* 2222bbb Initial
```

Ключевое слово — **переписывает**. Старые коммиты `def5678`, `9876fed` исчезают (они ещё в reflog 90 дней, но через `log` уже не видны). Если кто-то делал из них ветки или цитировал в PR — у того теперь dangling references.

## Кейс 1: моя feature-ветка отстала от main

Самый частый случай. Ты неделю работаешь над `feature/cart`, в main за это время прилетело 30 коммитов. Хочешь подтянуть свежее.

**Вариант А — `merge` (безопасно, но грязно):**

```bash
git checkout feature/cart
git merge main
# конфликты разрешил, готово
```

История получает merge-узел и расходящийся граф. После 5 таких подтягиваний история выглядит как лапша.

**Вариант Б — `rebase` (чисто, рекомендую если ветка только твоя):**

```bash
git checkout feature/cart
git fetch origin
git rebase origin/main
# конфликты разрешил → git rebase --continue
git push --force-with-lease
```

Твои коммиты «приклеиваются» поверх свежего main. История линейная, как будто ты только что начал работу.

<div class="warn-block">
<span class="tip-icon">⚠️</span>
<p>После rebase нужен force-push, потому что хеши коммитов поменялись. Используй <code>--force-with-lease</code>, а не <code>--force</code> — он откажется пушить если кто-то залил в твою ветку коммит, пока ты ребейзил.</p>
</div>

## Кейс 2: над веткой работает не один человек

`feature/payments` — общая, ты и коллега коммитите параллельно. Ты делаешь:

```bash
git rebase main
git push --force-with-lease
```

Что произошло у коллеги:
- Утром у него локальные коммиты `A`, `B` в `feature/payments`
- Ты переписал хеши, сделал force-push
- Коллега делает `git pull` → конфликт «refusing to merge unrelated histories»
- Если он сделает `git pull --rebase`, его коммиты `A` и `B` дублируются (теперь и в твоей переписанной истории, и в его локальной)

В итоге: либо коллега вручную чинит дубликаты, либо команда тратит час на «как нам это смержить».

**Правило:** на shared ветках только `merge`. Кто-то один может в конце перед мерджем в main сделать `rebase -i` для squash, но не во время разработки.

## Кейс 3: подготовка PR через interactive rebase

У тебя ветка с 12 коммитами вида `wip`, `fix typo`, `oops`, `actually fix it`. Перед PR-review хочется привести в порядок.

```bash
git rebase -i origin/main
```

Откроется редактор:

```
pick a1b2c3d Add cart route
pick e4f5g6h wip
pick h7i8j9k fix typo
pick l1m2n3o Add cart tests
pick p4q5r6s oops
pick t7u8v9w actually fix tests
```

Заменяешь команды:

```
pick a1b2c3d Add cart route
fixup e4f5g6h wip            # вмёрджит в предыдущий, выбросит сообщение
fixup h7i8j9k fix typo       # тоже
pick l1m2n3o Add cart tests
fixup p4q5r6s oops
fixup t7u8v9w actually fix tests
```

Сохраняешь — Git склеивает. Получаешь 2 чистых коммита: «Add cart route» + «Add cart tests». PR-reviewer счастлив.

**Ключевые команды:**

| Команда | Что делает |
|---|---|
| `pick` | Оставить коммит как есть |
| `reword` | Оставить, но изменить commit message |
| `squash` | Слить с предыдущим, **объединить сообщения** |
| `fixup` | Слить с предыдущим, **выбросить сообщение** |
| `drop` | Удалить коммит совсем |
| `edit` | Остановиться на нём — можно изменить файлы и `git commit --amend` |
| Перетащить строки | Изменить порядок коммитов |

## Кейс 4: запорол rebase, паника

Ты сделал `git rebase -i`, что-то пошло не так — оказалось 3 коммита просто исчезли. Что делать?

```bash
git reflog
```

Вывод:

```
abc1234 (HEAD) HEAD@{0}: rebase finished
def5678 HEAD@{1}: rebase: pick X
9876fed HEAD@{2}: rebase: pick Y
1111aaa HEAD@{3}: checkout: moving from feature to main
2222bbb HEAD@{4}: commit: Add Y
3333ccc HEAD@{5}: commit: Add X     ← вот они, мои потерянные коммиты
4444ddd HEAD@{6}: commit: Add W
```

Откатываешься на момент **до** rebase:

```bash
git reset --hard 4444ddd
```

Всё на месте. Reflog хранит все HEAD-движения 90 дней по дефолту, потерять что-то почти невозможно.

<div class="tip-block">
<span class="tip-icon">💡</span>
<p>Перед сложным rebase делай страховку: <code>git tag backup-$(date +%s)</code>. Если ребейз всё сломает — <code>git reset --hard backup-1715200000</code> вернёт всё ровно как было.</p>
</div>

## --force-with-lease vs --force

`--force` — слепо перезаписывает remote ветку. Если кто-то успел запушить туда — его коммиты пропадают.

`--force-with-lease` — пушит только если remote-ветка указывает на тот коммит, который ты ожидаешь (последний `fetch`). Если кто-то залил коммит после твоего fetch — push откажется. Безопасный force.

Поставь алиас глобально:

```bash
git config --global alias.fpush "push --force-with-lease"
```

Теперь привычка `git fpush` вместо `git push -f` спасает от подстав.

## Git Flow vs trunk-based — где меньше rebase-конфликтов

В **[Git Flow](/git/git-flow/)** (long-lived `develop`/`feature` ветки) feature живёт неделями, отстаёт от main на десятки коммитов. Rebase каждые 3 дня — норма.

В **trunk-based** (короткие feature, мерджишь в main за 1-2 дня) проблема почти не возникает: ветка живёт 1-2 дня, отставание минимальное, можно без rebase.

Если команда страдает от rebase-конфликтов — может, проблема не в Git, а в слишком длинных feature-branches. Сократи цикл — половина боли уйдёт.

## Итого

- **Чужая ветка → только merge.** Rebase только в твоей личной.
- **`--force-with-lease`**, никогда `--force`. Сделай алиас.
- **`rebase -i` перед PR** — ёмкий инструмент: squash WIP-коммитов, fixup опечаток, reorder.
- **`git reflog` спасает почти всегда** — 90 дней истории движений HEAD.
- **Если конфликты постоянные** — ветки слишком долго живут, не Git виноват. Про базовую организацию веток — в статье о [Git flow](/git/git-flow/), а что не должно попадать в коммиты — в гайде по [.gitignore](/git/gitignore/).
