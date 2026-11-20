/**
 * Every spoken line of the game: key -> text for the synthesizer (Yandex SpeechKit, tools/make-voice.py).
 * The clips live in public/voice/<key>.mp3. After changing this file:
 *   npm run voice:list && python3 tools/make-voice.py missing
 * ("+" before a vowel marks stress for the synthesizer.)
 */
import { type Line, type Voice } from "./forest.ts";
import { SEA_TICKLE } from "./sea.ts";
import { ALL_STOPS } from "./worlds.ts";
import { stressed } from "./stress.ts";
import { NAMES } from "./names.ts";
import { LETTER_NAMES, SENTENCES, STORIES, SYLLABLES, WORDS } from "./words.ts";

const TR: Record<string, string> = {
  А: "a",
  Б: "b",
  В: "v",
  Г: "g",
  Д: "d",
  Е: "e",
  Ё: "yo",
  Ж: "zh",
  З: "z",
  И: "i",
  Й: "j",
  К: "k",
  Л: "l",
  М: "m",
  Н: "n",
  О: "o",
  П: "p",
  Р: "r",
  С: "s",
  Т: "t",
  У: "u",
  Ф: "f",
  Х: "h",
  Ц: "c",
  Ч: "ch",
  Ш: "sh",
  Щ: "sch",
  Ъ: "qq",
  Ы: "y",
  Ь: "q",
  Э: "eh",
  Ю: "yu",
  Я: "ya",
};
/** Latin file-safe id for Cyrillic text: "ЛИ" -> "li". */
export const translit = (s: string) =>
  [...s.toUpperCase()].map((c) => TR[c] ?? c.toLowerCase()).join("");

export const letterKey = (l: string) => `letter-${translit(l)}`;
export const sylKey = (s: string) => `syl-${translit(s)}`;
export const numKey = (n: number) => `n-${n}`;
export const wordKey = (id: string) => `w-${id}`;
export const introKey = (stop: string, i: number) => `dlg-${stop}-${i}`;
export const outroKey = (stop: string, i: number) => `bye-${stop}-${i}`;
/** the dialogue a stop uses for 5–6-year-olds (when it has one) */
export const youngId = (stop: string) => `${stop}-young`;

/** what a resident says when the child tickles it (in its own voice), by picture name */
export const TICKLE: Record<string, string> = {
  ...SEA_TICKLE,
  hedgehog: "Хи-хи! Щекотно! Я сейчас свернусь клубочком!",
  squirrel: "Ой, щекотно! Хи-хи!",
  hare: "Хи-хи! Сейчас как прыгну!",
  owl: "Угу-угу! Щекотно!",
  bear: "Хо-хо-хо! Щекотно!",
  beaver: "Хи-хи! Ой, мой хвостик!",
  badger: "Ой-ой, щекотно!",
  mouse: "Пи-пи! Хи-хи!",
  frog: "Ква-ква! Хи-хи!",
};
export const tickleKey = (who: string) => `touch-${who}`;

/** Who says each line: the fox (masha), a resident (its own voice); every other line is the narrator (marina). */
export function voiceCast(): Record<string, Voice | "fox"> {
  const out: Record<string, Voice | "fox"> = { hi: "fox", [tickleKey("fox")]: "fox" };
  for (const { id } of NAMES) out[`name-${id}-hi`] = "fox";
  const add = (key: string, l: Line, v: Voice) => (out[key] = l.who === "res" ? v : "fox");
  for (const stop of ALL_STOPS) {
    out[tickleKey(stop.resident)] = stop.voice;
    stop.intro.forEach((l, i) => add(introKey(stop.id, i), l, stop.voice));
    stop.outro.forEach((l, i) => add(outroKey(stop.id, i), l, stop.voice));
    stop.young?.intro.forEach((l, i) => add(introKey(youngId(stop.id), i), l, stop.voice));
  }
  return out;
}

const ONES = ["ноль", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
const TEENS = [
  "десять",
  "одиннадцать",
  "двенадцать",
  "тринадцать",
  "четырнадцать",
  "пятнадцать",
  "шестнадцать",
  "семнадцать",
  "восемнадцать",
  "девятнадцать",
];
const TENS = [
  "",
  "",
  "двадцать",
  "тридцать",
  "сорок",
  "пятьдесят",
  "шестьдесят",
  "семьдесят",
  "восемьдесят",
  "девяносто",
];
export function numberWords(n: number): string {
  if (n === 100) return "сто";
  if (n < 10) return ONES[n];
  if (n < 20) return TEENS[n - 10];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o ? `${TENS[t]} ${ONES[o]}` : TENS[t];
}

export const PRAISE = 8;
export const AGAIN = 4;

const FIXED: Record<string, string> = {
  intro:
    "Однажды ночью с неба упали звёзды и рассыпались по всему свету. Лисёнок хочет вернуть их домой, на небо. Поможешь ему?",
  hi: "Привет! Я лисёнок. Отправимся в путь?",
  "map-pick": "Куда отправимся? Нажми на лес!",
  "map-forest": "Идём в лес! Лесные жители нашли звёздочки. Помоги им, и они отдадут звёзды.",
  locked: "Этот мир пока спит. Сначала собери все звёзды в лесу!",
  "locked-soon": "Этот мир скоро откроется. Лисёнок уже собирает рюкзак!",
  "forest-next": "Кому поможем? Нажми на жителя леса.",
  "map-pick-sea": "Куда отправимся? Нажми на море!",
  "sea-next": "Кому поможем? Нажми на жителя моря.",
  "sea-done": "Ура! Все звёзды моря собраны! Они снова сияют на небе. Скоро мы отправимся в горы!",
  "stop-locked": "Сначала помоги тем, кто ближе к началу тропинки.",
  "forest-done":
    "Ура! Все звёзды леса собраны! Они снова сияют на небе. Теперь можно отправиться к морю!",
  album: "Это твой альбом сокровищ. Каждый житель леса дарит подарок.",
  "diff-pick": "Как будем играть? Легко, средне или трудно?",
  "diff-easy": "Хорошо! Будем играть легко.",
  "diff-medium": "Хорошо! Будем играть средне.",
  "diff-hard": "Ого! Будем играть трудно!",
  "q-solve": "Реши пример.",
  "touch-fox": "Хи-хи! Щекотно!",
  "glade-hello":
    "Это лесная полянка! Здесь можно играть сколько захочешь. А после каждых пяти заданий нас ждёт находка.",
  "glade-find": "Смотри, что мы нашли на полянке!",
  "glade-more": "Поиграем ещё?",
  "glade-all": "Ура! Все находки полянки собраны! Теперь будем искать их снова.",
  "glade-open": "В лесу открылась полянка! Там можно играть сколько захочешь.",
  "album-finds": "А это находки с лесной полянки.",
  "album-open": "Нажми на коробочку, и подарок откроется!",
  "sky-place": "Повесь звёздочку на небо! Нажми, где она будет сиять.",
  "sky-done": "Как красиво сияет!",
  rest: "Лисёнок устал и хочет отдохнуть. Поиграем потом!",
  "level-up": "Ты так здорово справляешься! Задания станут чуть интереснее.",
  "show-answer": "Смотри, вот правильный ответ.",
  "star-get": "Звёздочка твоя!",
  "praise-1": "Правильно!",
  "praise-2": "Молодец!",
  "praise-3": "Верно!",
  "praise-4": "Отлично!",
  "praise-5": "Здорово!",
  "praise-6": "Умница!",
  "praise-7": "Так держать!",
  "praise-8": "Ура, получилось!",
  "again-1": "Попробуй ещё!",
  "again-2": "Почти! Попробуй ещё раз.",
  "again-3": "Не спеши, подумай ещё.",
  "again-4": "Ничего страшного, давай ещё раз!",
  plus: "плюс",
  minus: "минус",
  more: "больше",
  less: "меньше",
  equal: "равно",
  // letters
  "q-letter-find": "Найди букву",
  "q-letter-first": "С какой буквы начинается слово",
  "q-letter-gap": "Какой буквы не хватает в слове",
  "h-letter": "Послушай ещё раз и найди эту букву:",
  "h-letter-first": "Скажи слово медленно. Какой звук ты слышишь первым?",
  "h-letter-gap": "Скажи слово медленно, по звукам. Какого звука не хватает?",
  // counting
  "q-count-1": "Сколько здесь? Нажимай на каждую картинку и считай!",
  "q-count-2": "Посчитай, сколько здесь. В каждом ряду по пять.",
  "q-count-3": "Сколько всего? В каждой полоске по десять. А потом досчитай по одной.",
  "h-count": "Нажимай на картинки по очереди, я буду считать вместе с тобой.",
  "h-count-3": "Считай полоски десятками: десять, двадцать, тридцать. А потом добавь остальные.",
  // build a word
  "q-build": "Собери слово. Нажимай на буквы по порядку.",
  "h-build": "Скажи слово медленно. Светится буква, которая идёт дальше.",
  // read
  "q-read": "Прочитай слово и найди картинку.",
  "h-read": "Здесь написано:",
  // add / subtract
  "h-add": "Посчитай все картинки вместе.",
  "h-add-3": "Сначала сложи десятки, а потом единицы.",
  "h-sub": "Посчитай картинки, которые остались.",
  "h-sub-3": "Сначала вычти десятки, а потом единицы.",
  // syllables
  "q-syl-find": "Найди слог",
  "q-syl-build": "Собери слово из слогов.",
  "h-syl": "Скажи слово медленно, по слогам, и хлопни в ладоши на каждый слог.",
  // compare
  "q-cmp-more": "Где больше? Нажми на эту корзинку.",
  "q-cmp-less": "Где меньше? Нажми на эту корзинку.",
  "h-cmp": "Посчитай, сколько в каждой корзинке.",
  "q-cmp-sign": "Какой знак поставить? Больше, меньше или равно?",
  "h-cmp-sign": "Открытый клювик знака всегда смотрит на большее число.",
  // sentences
  "q-word-find": "Найди слово",
  "q-sentence": "Прочитай и найди картинку.",
  "q-sentence-3": "Прочитай и ответь на вопрос.",
  "h-sentence": "Послушай:",
  "h-word-find": "Посмотри на первую букву.",
};

/** text for the screen: the same line without the stress marks */
export const shown = (line: string | undefined) => (line ?? "").replaceAll("+", "");

/** the gift's name, said when it is opened or tapped in the album */
export const giftKey = (stopId: string) => `gift-${stopId}`;

export function voiceLines(): Record<string, string> {
  const lines: Record<string, string> = { ...FIXED };
  // the synthesizer cannot say a lone "ё"
  const solo = (t: string) => (t === "ё" ? "йо" : t);
  for (const [letter, name] of Object.entries(LETTER_NAMES)) lines[letterKey(letter)] = solo(name);
  for (let n = 0; n <= 100; n++) lines[numKey(n)] = numberWords(n);
  for (const w of WORDS) lines[wordKey(w.id)] = w.say ?? w.word.toLowerCase();
  const syl = new Set<string>(SYLLABLES);
  for (const w of WORDS) for (const s of w.syl.split("-")) syl.add(s);
  for (const s of syl) lines[sylKey(s)] = solo(s.toLowerCase());
  for (const s of SENTENCES) lines[`sen-${s.id}`] = s.text;
  for (const s of STORIES) lines[`st-${s.id}`] = s.text;
  for (const stop of ALL_STOPS) {
    stop.intro.forEach((l, i) => (lines[introKey(stop.id, i)] = l.text));
    stop.outro.forEach((l, i) => (lines[outroKey(stop.id, i)] = l.text));
    stop.young?.intro.forEach((l, i) => (lines[introKey(youngId(stop.id), i)] = l.text));
  }
  for (const [who, text] of Object.entries(TICKLE)) lines[tickleKey(who)] = text;
  for (const stop of ALL_STOPS) lines[giftKey(stop.id)] = `${stop.giftName}!`;
  for (const { id, name } of NAMES) {
    lines[`name-${id}-hi`] = `Привет, ${name}! Отправимся в путь?`;
    lines[`name-${id}-bravo`] = `Молодец, ${name}!`;
  }
  // stress marks for phrases (letters, syllables, numbers and words are spoken as they are)
  for (const [k, v] of Object.entries(lines))
    if (!/^(letter|syl|n|w)-/.test(k) && !v.includes("+")) lines[k] = stressed(v);
  return lines;
}
