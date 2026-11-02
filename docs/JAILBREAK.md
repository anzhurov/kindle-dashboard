# Підготовка Kindle Paperwhite 3

Пристрій: PW3 (7 gen), серійник `G090G1…`.

## 1. Прошивка

Для PW3 остання прошивка **5.16.2.1.1**, і її підтримує WinterBreak2 (на 5.9.2 він не запускався,
а реєстрація не проходила). Оновлення вручну:

1. Зарядіть Kindle щонайменше до 50%, видаліть з нього зайві файли.
2. На сторінці Amazon «Kindle E-Reader Software Updates» завантажте `.bin` для
   **Kindle Paperwhite (7th Generation)**.
3. Скопіюйте `.bin` у корінь Kindle (поруч із `documents`), виконайте Eject.
4. Settings → Menu → **Update Your Kindle**. Якщо пункт сірий, затисніть кнопку живлення на ~40 с.
5. Перевірте версію: Settings → Menu → Device Info.

## 2. Джейлбрейк

**WinterBreak2**: https://kindlemodding.org/jailbreaking/WinterBreak2/
Ознака успіху: `documents/JAILBROKEN.txt`.

## 3. Після джейлбрейку

WinterBreak2 уже містить hotfix, підтримку scriptlet-ів і блокування оновлень, тому окремо
нічого ставити не треба (KUAL/MRPI на сайті позначені як застарілі). Залишилось:

1. Видалити `fill_disk/`, `Filler.sh` і будь-які `update*.bin` / `update.bin.tmp.partial` з кореня.
2. Перезавантажити Kindle.

Далі переходьте до розділу «Kindle» в [README](../README.md).
