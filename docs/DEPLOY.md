# Деплой Treker на Render + Supabase

## 1. Supabase — база данных

1. Открой [supabase.com](https://supabase.com) → создай новый проект (Free tier).
2. Перейди: **Project Settings → Database → Connection string**.
3. Скопируй две строки:
   - **URI** (Transaction Pooler) → это `DATABASE_URL`
   - **Direct connection** → это `DIRECT_URL`
4. Оба URL выглядят так: `postgresql://postgres.xxxxx:password@host:port/postgres`

### Применить схему

После получения URL выполни локально:

```bash
DATABASE_URL="postgresql://..." DIRECT_URL="postgresql://..." npx prisma db push
```

Это создаст все таблицы в Supabase.

---

## 2. Render — хостинг

1. Открой [render.com](https://render.com) → **New → Web Service**.
2. Подключи GitHub репозиторий.
3. Render автоматически обнаружит `render.yaml` и предложит настройки.
4. Установи переменные окружения (вкладка **Environment**):

| Переменная       | Значение                                        |
|------------------|-------------------------------------------------|
| `DATABASE_URL`   | Transaction Pooler URL из Supabase              |
| `DIRECT_URL`     | Direct connection URL из Supabase               |
| `ALLOWED_EMAIL`  | Твой email (например: user@example.com)         |
| `OWNER_USER_ID`  | `owner`                                         |
| `SESSION_SECRET` | Случайная строка 32+ символов                   |

Сгенерировать SESSION_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

5. Нажми **Deploy**.

### Build & Start команды (уже в render.yaml)

```
Build:  npm ci && npx prisma generate && npm run build
Start:  npm start
```

---

## 3. Первый запуск

После деплоя открой: `https://your-app.onrender.com/api/health`

Это запустит сидирование начальных данных (категории финансов + 5 привычек).

---

## 4. Keep-alive (Render Free tier)

Free tier засыпает после 15 мин неактивности. Настрой внешний пинг:

- [cron-job.org](https://cron-job.org) — бесплатно
- URL: `https://your-app.onrender.com/api/health`
- Интервал: каждые 14 минут

---

## 5. Обновления

Каждый `git push` в `main` автоматически запускает ре-деплой на Render.

---

## Локальная разработка

```bash
# 1. Создай .env.local с DATABASE_URL и другими переменными
# 2. Запусти
npm run dev
# → http://localhost:3000
```
