---
layout: default
lang: ru
title: "Git: шпаргалка"
permalink: /cheats/git/
description: "Ежедневные команды, ветки, отмена изменений, rebase, stash, reflog и алиасы — git одной страницей. Готовая закладка."
keywords: "git шпаргалка, git cheat sheet, git команды, git rebase, git reset, git stash, reflog"
og_image: /assets/og-git.png
translation_of: /en/cheats/git/
---

<article class="article-body" markdown="1" style="max-width:820px; margin:calc(var(--nav-height) + 56px) auto 100px; padding:0 24px;">

# Git: шпаргалка

Команды, которые покрывают 95% ежедневной работы. Сделай закладку. Подробные разборы — в статьях про [Git flow](/git/git-flow/), [rebase vs merge](/git/git-rebase-vs-merge/) и [.gitignore](/git/gitignore/).

## Настройка (один раз)

```bash
git config --global user.name "Имя Фамилия"
git config --global user.email "you@example.com"
git config --global init.defaultBranch main
git config --global pull.rebase true          # pull через rebase, без мусорных merge-коммитов
git config --global core.excludesfile ~/.gitignore_global
```

## Ежедневное

| Команда | Что делает |
|---|---|
| `git status -sb` | Короткий статус + ветка |
| `git add -p` | Добавить изменения по кускам (выборочно) |
| `git commit -m "msg"` | Коммит |
| `git commit --amend --no-edit` | Дописать в последний коммит |
| `git pull origin main` | Подтянуть изменения |
| `git push -u origin <ветка>` | Запушить и связать ветку |
| `git fetch --all --prune` | Обновить ссылки, удалить мёртвые |

## Ветки

```bash
git switch -c feature/login     # создать и перейти
git switch -                    # вернуться на предыдущую ветку
git branch -d feature/login     # удалить слитую ветку
git push origin --delete feature/login   # удалить на сервере
git branch --sort=-committerdate # ветки по свежести
```

## Отмена изменений

| Ситуация | Команда |
|---|---|
| Отменить незакоммиченные правки файла | `git restore <файл>` |
| Убрать файл из индекса (после `add`) | `git restore --staged <файл>` |
| Откатить последний коммит, оставив правки | `git reset --soft HEAD~1` |
| Откатить коммит и правки (необратимо!) | `git reset --hard HEAD~1` |
| Отменить коммит новым коммитом (для общих веток) | `git revert <sha>` |
| Перестал отслеживать файл, оставив на диске | `git rm --cached <файл>` |

## Rebase

```bash
git rebase main                  # перенести свою ветку на свежий main
git rebase -i HEAD~5             # интерактивно: squash / fixup / reword / drop
git rebase --abort               # передумал
git push --force-with-lease      # безопасный force push (никогда не --force)
```

> Правило: rebase — только свои ветки. Общие — merge. Подробно: [rebase vs merge](/git/git-rebase-vs-merge/).

## Stash

```bash
git stash push -m "wip: форма логина"
git stash list
git stash pop                    # применить и удалить
git stash apply stash@{1}        # применить конкретный, не удаляя
git stash push -p                # спрятать выборочно
```

## История и поиск

```bash
git log --oneline --graph -15
git log -p <файл>                # история изменений файла с диффами
git log -S "функция"             # коммиты, где строка появилась/исчезла
git blame -L 10,20 <файл>        # кто менял строки 10–20
git diff main...feature          # что добавит ветка
git show <sha>:<путь>            # файл из любого коммита
```

## Спасение — reflog

```bash
git reflog                       # все движения HEAD за 90 дней
git reset --hard HEAD@{2}        # вернуться в состояние до катастрофы
git checkout -b rescue <sha>     # достать «потерянный» коммит в ветку
```

## Алиасы

```bash
git config --global alias.st "status -sb"
git config --global alias.lg "log --oneline --graph -15"
git config --global alias.amend "commit --amend --no-edit"
git config --global alias.undo "reset --soft HEAD~1"
```

## .gitignore за 10 секунд

```gitignore
node_modules/
.env
.env.*.local
dist/
build/
*.log
.DS_Store
.idea/
```

Уже закоммитил лишнее? `git rm -r --cached <путь>` + коммит. Секреты — ротировать. Подробно: [.gitignore](/git/gitignore/).

</article>
