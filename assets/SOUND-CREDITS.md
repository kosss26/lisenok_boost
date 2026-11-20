# Звуки, голос и музыка

## Музыка

Три трека, каждый для своего экрана (`tools/make-music.py`: моно 64 кбит/с, плавное начало и конец,
выравнивание громкости; исходники кладутся в `assets/music-src/`, в репозиторий не входят):

- `public/music/map.mp3` — карта и лесная тропинка: "Carefree" Kevin MacLeod (incompetech.com),
  первые 100 с — https://incompetech.com/music/royalty-free/mp3-royaltyfree/Carefree.mp3
- `public/music/tasks.mp3` — задания: "Easy Lemon" Kevin MacLeod (incompetech.com), первые 120 с —
  https://incompetech.com/music/royalty-free/mp3-royaltyfree/Easy%20Lemon.mp3
- `public/music/celebrate.mp3` — награды: "Fluffing a Duck" Kevin MacLeod (incompetech.com),
  первые 45 с — https://incompetech.com/music/royalty-free/mp3-royaltyfree/Fluffing%20a%20Duck.mp3

Licensed under Creative Commons: By Attribution 4.0 License
http://creativecommons.org/licenses/by/4.0/

## Звуковые эффекты

Все эффекты (`public/sfx/*.mp3`: тап, выбор, «правильно», «попробуй ещё», звёздочка, фанфары, шаг)
синтезированы скриптом `tools/make-sfx.py` — собственная работа, без чужих записей.

## Голос

Все фразы синтезированы **Yandex SpeechKit** (Yandex Cloud, API v3) скриптом `tools/make-voice.py`
на платном аккаунте владельца игры: рассказчик — голос **marina** (роль friendly), лисёнок — **masha** (good),
жители леса — **alena** (good), **lera** (friendly) и **zahar** (good) с небольшим сдвигом высоты тона
(`src/content/forest.ts`, `assets/voice-cast.json`). Яндекс не налагает ограничений на использование результатов
SpeechKit (FAQ SpeechKit; Условия использования, п. 5.1) — их можно использовать и в коммерческом продукте.
Ударения расставлены на каждом слове из двух и более слогов по проверенному вручную словарю
`assets/voice-stress.json` (как он собран и что исправлено — `assets/VOICE-STRESS.md`).
Обработка: обрезка тишины, короткие фейды, громкость −16 LUFS, MP3 24 кГц и Opus.

Исключение — клип буквы «Ы» (`public/voice/letter-y.mp3`): синтезатор Яндекса произносит отдельную «ы»
как «и», поэтому оставлена прежняя запись Silero TTS v5 (голос xenia; модели Silero — лицензия
CC BY-NC 4.0, некоммерческое использование). Для коммерческой версии этот один клип нужно заменить
(например, записать живым голосом).

## Картинки

Иллюстрации сгенерированы нейросетью для этого проекта (листы в `assets/sheets`,
нарезка `tools/cut-sheet.py`; листы слов `w01–w25.jpg`, имена картинок — `assets/word-sheets.json`).
