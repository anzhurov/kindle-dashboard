# Kindle dashboard

Дашборд для Kindle Paperwhite 3 (1072×1448, 300 ppi).

```
dashboard/*.html,css,js ──push──▶ GitHub Actions (кожні 15 хв + на push)
                                   Chrome → PNG 1072×1448 grayscale
                                          │
                                   GitHub Pages: https://USER.github.io/REPO/dash.png
                                          │
                       Kindle (KUAL-розширення): wifi → curl → eips → сон до наступного оновлення
```

## Структура

| Шлях | Що це |
|---|---|
| `dashboard/` | Сам дашборд: HTML/CSS/JS. **Тут ви редагуєте.** |
| `dashboard/config.js` | Місто й координати для погоди |
| `render/render.mjs` | Робить скріншот сторінки та конвертує в grayscale PNG |
| `.github/workflows/render.yml` | Рендер + публікація на GitHub Pages |
| `kindle/extensions/dashboard/` | Розширення KUAL для Kindle |
| `docs/JAILBREAK.md` | Підготовка Kindle |

## 1. GitHub (один раз)

1. Створіть **публічний** репозиторій (GitHub Pages і Actions безкоштовні для публічних репо).
   ⚠️ Картинка дашборда буде доступна будь-кому, хто знає URL. Не кладіть туди приватних даних.
2. Запуште проєкт:
   ```sh
   git init -b main && git add . && git commit -m "Kindle dashboard"
   git remote add origin git@github.com:USER/REPO.git && git push -u origin main
   ```
3. **Settings → Pages → Source: GitHub Actions.**
4. **Actions → Render dashboard → Run workflow** (або дочекайтеся, поки воркфлоу спрацює після push).
5. Відкрийте `https://USER.github.io/REPO/`: там буде прев'ю картинки.

Часовий пояс задається в **Settings → Secrets and variables → Actions → Variables** змінною `DASH_TZ`
(за замовчуванням `Europe/Kyiv`).

## 2. Kindle (один раз)

1. Джейлбрейк + KUAL: див. [docs/JAILBREAK.md](docs/JAILBREAK.md).
2. У `kindle/extensions/dashboard/dash.conf` вкажіть свій URL:
   `DASH_URL="https://USER.github.io/REPO/dash.png"`.
3. Підключіть Kindle по USB і скопіюйте папку `kindle/extensions/dashboard` в `extensions/` на Kindle
   (має вийти `extensions/dashboard/config.xml`).
4. Від'єднайте USB, відкрийте KUAL → **Dashboard → Start dashboard**.

### Як користуватися

- **Почитати:** натисніть кнопку живлення. Дашборд вийде, і за кілька секунд з'явиться звичайний Kindle
  (іноді треба натиснути ще раз, щоб розблокувати).
- **Повернути дашборд:** просто покладіть Kindle. Коли він засне, дашборд запуститься сам
  (перші 90 секунд після виходу це не спрацьовує). Або вручну: KUAL → Start dashboard.
- **Не хочу авто-повернення зараз:** KUAL → Disable auto-return (діє до наступного виходу з дашборда).
  Вимкнути назавжди: `AUTO_RETURN=0` у `dash.conf`.
- Якщо щось зависло: затисніть кнопку живлення на ~15 с, і Kindle перезавантажиться у звичайний режим.

Налаштування в `dash.conf`:

| Параметр | За замовчуванням | |
|---|---|---|
| `INTERVAL_MIN` | 15 | як часто Kindle оновлює картинку |
| `FULL_REFRESH_EVERY` | 4 | кожне N-те оновлення робить повне перемальовування (прибирає «привидів») |
| `LOW_BATTERY` | 15 | нижче цього % у кутку з'являється `LOW BATTERY` |
| `AUTO_RETURN` | 1 | повертати дашборд, коли Kindle засинає |

Лог пишеться в `extensions/dashboard/dash.log` (його видно по USB).

## 3. Редагування дашборда

Редагуйте `dashboard/index.html`, `style.css`, `dashboard.js`, потім робіть push у `main`.
Через ~1–2 хв новий PNG з'явиться на Pages, а Kindle підхопить його на найближчому оновленні.

Правила для E Ink:
- полотно рівно **1072×1448 px**, без скролу;
- шрифт від ~30px, бо 16px на 300 ppi — це ~1.3 мм;
- лише чорне, біле й кілька сірих; тонкі сірі лінії зникають;
- дані з API підтягуйте в `dashboard.js`. Рендерер чекає на `window.dashReady = true` (до 20 с).

Локальне прев'ю:
```sh
npm install
npm run render      # → out/dash.png
open out/dash.png
```
Потрібен встановлений Google Chrome (у GitHub Actions він уже є).

## Обмеження

- GitHub cron не точний: запуски «кожні 15 хв» можуть затримуватися або пропускатися.
  Для годинника з точністю до хвилини цей підхід не годиться. Тому на дашборді показується «оновлено HH:MM».
- Якщо в репозиторії 60 днів немає комітів, GitHub вимикає scheduled-воркфлоу.
  Увімкнути знову можна однією кнопкою в Actions.
