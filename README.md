# Suno AI Landing + Backend + Telegram Bot

Полноценный mini-product для сбора заявок на AI-генерацию музыки:
- адаптивный premium-лендинг в стилистике luxury automotive (по мотивам Mercedes-like визуала) с обязательными блоками;
- backend API на **FastAPI** с серверной валидацией и сохранением в PostgreSQL;
- Telegram-бот с командами `/all` и `/today`;
- docker-compose для быстрого запуска всего стека.

## Стек
- **Frontend:** HTML/CSS/JS + Nginx
- **Backend:** Python + FastAPI + Pydantic + psycopg2
- **Bot:** Node.js + Telegraf + Express + pg
- **DB:** PostgreSQL 16
- **Оркестрация:** Docker Compose

## Архитектура и поток данных
1. Пользователь отправляет форму на лендинге (`/api/applications`).
2. Backend (FastAPI) валидирует данные (имя, телефон, музыкальный стиль, комментарий).
3. Backend сохраняет заявку в таблицу `applications` PostgreSQL.
4. Backend вызывает внутренний endpoint бота `/internal/new-application`.
5. Бот отправляет уведомление в Telegram чат команды.
6. Команды бота `/all` и `/today` читают данные из той же БД.

## Обязательные блоки интерфейса
- Hero-блок с оффером и CTA.
- Секция преимуществ.
- Пошаговое описание (3 шага).
- Блок отзывов.
- Форма заявки с валидацией и UX-уведомлениями.

## Переменные окружения
Скопируйте пример и заполните:
```bash
cp .env.example .env
```

Критичные секреты:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_TEAM_CHAT_ID`
- `BOT_INTERNAL_TOKEN`

## Запуск через Docker Compose
```bash
docker compose up --build
```

После запуска:
- Лендинг: http://localhost:3000
- Backend health: http://localhost:8080/api/health
- Bot internal API: http://localhost:8090/internal/new-application

## Локальный запуск без Docker
Нужен локальный PostgreSQL и заполненный `.env`.

### Backend (FastAPI)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn src.main:app --reload --host 0.0.0.0 --port 8080
```

### Bot
```bash
cd bot
npm install
npm start
```

### Frontend
Открыть `frontend/index.html` через static-server или поднять Nginx-контейнер frontend.
Для корректного proxy на API рекомендуется Docker-вариант.

## Telegram-бот: команды
- `/start` — справка по доступным командам.
- `/all` — последние заявки (до 10 записей).
- `/today` — заявки за текущий день (до 10 записей).

## Известные ограничения
- Команды бота сейчас ограничены выводом 10 последних записей (без пагинации).
- Нет аутентификации пользователей Telegram-команд (подходит для внутренних чатов).
- Нет очереди ретраев между backend и bot при недоступности Telegram API.

## Возможные улучшения
- Добавить JWT/ACL для Telegram-команд (список разрешенных user id).
- Добавить admin dashboard для менеджеров.
- Реализовать retry + DLQ для уведомлений в Telegram.
- Покрыть backend/bot автотестами и линтерами.

## Визуальные материалы
- Скриншот лендинга: `docs/landing.png`.
