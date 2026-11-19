/** The world map and world 1 — the forest. */
export type Skill =
  "letters" | "count" | "build" | "read" | "add" | "syllables" | "sub" | "compare" | "sentence";

export const SKILL_NAMES: Record<Skill, string> = {
  letters: "Буквы и звуки",
  count: "Счёт",
  build: "Собрать слово",
  read: "Чтение слов",
  add: "Сложение",
  syllables: "Слоги",
  sub: "Вычитание",
  compare: "Больше и меньше",
  sentence: "Чтение предложений",
};

/** One spoken line of a dialogue. The pose picks the picture: resident "" | "sad" | "happy", fox pose name. */
export type Line =
  | { who: "res"; pose: "" | "sad" | "happy"; text: string }
  | { who: "fox"; pose: "wave" | "point" | "think" | "read" | "cheer" | "jump"; text: string };

export type Stop = {
  id: string;
  resident: string; // picture in public/art
  name: string; // «Ёжик»
  skill: Skill;
  gift: string; // treasure picture
  giftName: string;
  /** the resident's own voice: Silero speaker and pitch shift */
  voice: { speaker: "aidar" | "baya" | "kseniya" | "eugene"; pitch: number };
  /** voiced dialogue before the tasks and after the star */
  intro: Line[];
  outro: Line[];
  /** position of the clearing on its forest picture, % (set from PATH by the order on the path) */
  x: number;
  y: number;
  /** 1 = the first forest picture (entrance), 2 = the deep forest above it */
  part: 1 | 2;
  /** for 5–6-year-olds (no arithmetic): another skill and the words that go with it */
  young?: { skill: Skill; intro: Line[] };
};

type StopDef = Omit<Stop, "x" | "y" | "part">;

const DEFS: StopDef[] = [
  {
    id: "hedgehog",
    resident: "hedgehog",
    name: "Ёжик",
    skill: "letters",
    gift: "t-acorn",
    giftName: "Золотой жёлудь",
    voice: { speaker: "baya", pitch: 1.08 },
    intro: [
      { who: "res", pose: "sad", text: "Ой-ой! Привет! Я ёжик. Ветер перепутал все мои буквы!" },
      { who: "fox", pose: "wave", text: "Не грусти, ёжик! Мы с другом тебе поможем." },
      { who: "res", pose: "", text: "Правда? Тогда найди букву, которую я назову!" },
    ],
    outro: [
      { who: "res", pose: "happy", text: "Спасибо, дружок! Держи звёздочку и золотой жёлудь!" },
      { who: "fox", pose: "cheer", text: "Ура! Идём дальше по тропинке!" },
    ],
  },
  {
    id: "squirrel",
    resident: "squirrel",
    name: "Белка",
    skill: "count",
    gift: "t-feather",
    giftName: "Синее пёрышко",
    voice: { speaker: "kseniya", pitch: 1.1 },
    intro: [
      { who: "res", pose: "sad", text: "Ах, привет! Я белка. Зима скоро, а я сбилась со счёта!" },
      { who: "fox", pose: "point", text: "Давай считать вместе! Мой друг отлично считает." },
      { who: "res", pose: "", text: "Сколько у меня запасов? Посчитай, пожалуйста!" },
    ],
    outro: [
      {
        who: "res",
        pose: "happy",
        text: "Ура, всё посчитали! Вот тебе звёздочка и синее пёрышко!",
      },
      { who: "fox", pose: "cheer", text: "Теперь белочке хватит запасов на всю зиму!" },
    ],
  },
  {
    id: "hare",
    resident: "hare",
    name: "Зайчик",
    skill: "build",
    gift: "t-clover",
    giftName: "Клевер на удачу",
    voice: { speaker: "baya", pitch: 1.16 },
    intro: [
      {
        who: "res",
        pose: "sad",
        text: "Привет! Я зайчик. Буквы из моих слов разбежались по полянке!",
      },
      { who: "fox", pose: "think", text: "Ничего, мы их поймаем и поставим по порядку." },
      { who: "res", pose: "", text: "Нажимай на буквы, чтобы собрать слово!" },
    ],
    outro: [
      { who: "res", pose: "happy", text: "Как здорово! Возьми звёздочку и клевер на удачу!" },
      { who: "fox", pose: "cheer", text: "Все буквы на месте. Здорово получилось!" },
    ],
  },
  {
    id: "owl",
    resident: "owl",
    name: "Сова",
    skill: "read",
    gift: "t-firefly",
    giftName: "Светлячок в баночке",
    voice: { speaker: "kseniya", pitch: 0.94 },
    intro: [
      {
        who: "res",
        pose: "sad",
        text: "Здравствуй! Я сова. Мои слова и картинки потеряли друг друга.",
      },
      {
        who: "fox",
        pose: "read",
        text: "Мой друг умеет читать. Он найдёт каждому слову картинку!",
      },
      { who: "res", pose: "", text: "Прочитай слово и выбери подходящую картинку." },
    ],
    outro: [
      {
        who: "res",
        pose: "happy",
        text: "Ты прекрасно читаешь! Вот звёздочка и светлячок в баночке.",
      },
      { who: "fox", pose: "cheer", text: "Сова говорит, что ты настоящий читатель!" },
    ],
  },
  {
    id: "bear",
    resident: "bear",
    name: "Медвежонок",
    skill: "add",
    gift: "t-rowan",
    giftName: "Гроздь рябины",
    voice: { speaker: "aidar", pitch: 1.0 },
    intro: [
      {
        who: "res",
        pose: "sad",
        text: "Привет! Я медвежонок. Мне принесли ещё мёда, а сколько стало горшочков?",
      },
      { who: "fox", pose: "point", text: "Это легко! Надо просто сложить." },
      { who: "res", pose: "", text: "Помоги мне сложить горшочки!" },
    ],
    young: {
      skill: "count",
      intro: [
        {
          who: "res",
          pose: "sad",
          text: "Привет! Я медвежонок. Мне принесли мёд, а сколько горшочков?",
        },
        { who: "fox", pose: "point", text: "Посчитаем вместе, по одному!" },
        { who: "res", pose: "", text: "Помоги мне посчитать горшочки!" },
      ],
    },
    outro: [
      { who: "res", pose: "happy", text: "Вот это да! Держи звёздочку и гроздь рябины!" },
      { who: "fox", pose: "cheer", text: "Мишка будет пить чай с мёдом. Идём дальше!" },
    ],
  },
  {
    id: "beaver",
    resident: "beaver",
    name: "Бобр",
    skill: "syllables",
    gift: "t-whistle",
    giftName: "Деревянная свистулька",
    voice: { speaker: "eugene", pitch: 1.03 },
    intro: [
      { who: "res", pose: "sad", text: "Привет! Я бобр. Моя плотина из слогов развалилась!" },
      { who: "fox", pose: "think", text: "Соберём её снова, слог за слогом." },
      { who: "res", pose: "", text: "Найди нужный слог, и плотина станет крепкой!" },
    ],
    outro: [
      {
        who: "res",
        pose: "happy",
        text: "Отличная работа! Вот звёздочка и деревянная свистулька.",
      },
      { who: "fox", pose: "cheer", text: "Какая крепкая плотина получилась!" },
    ],
  },
  {
    id: "badger",
    resident: "badger",
    name: "Барсук",
    skill: "sub",
    gift: "t-snail",
    giftName: "Ракушка улитки",
    voice: { speaker: "aidar", pitch: 0.94 },
    intro: [
      {
        who: "res",
        pose: "sad",
        text: "Привет! Я барсук. Я раздал друзьям яблоки и не знаю, сколько осталось.",
      },
      { who: "fox", pose: "point", text: "Чтобы узнать, сколько осталось, надо вычесть!" },
      { who: "res", pose: "", text: "Помоги мне посчитать, сколько яблок осталось!" },
    ],
    young: {
      skill: "compare",
      intro: [
        {
          who: "res",
          pose: "sad",
          text: "Привет! Я барсук. Я раскладываю яблоки, где же их больше?",
        },
        { who: "fox", pose: "think", text: "Давай сравним! Это совсем не трудно." },
        { who: "res", pose: "", text: "Покажи, где больше, а где меньше!" },
      ],
    },
    outro: [
      { who: "res", pose: "happy", text: "Спасибо! Возьми звёздочку и ракушку улитки." },
      { who: "fox", pose: "cheer", text: "Теперь барсук знает, сколько у него яблок." },
    ],
  },
  {
    id: "mouse",
    resident: "mouse",
    name: "Мышка",
    skill: "compare",
    gift: "t-pebble",
    giftName: "Полосатый камешек",
    voice: { speaker: "kseniya", pitch: 1.24 },
    intro: [
      {
        who: "res",
        pose: "sad",
        text: "Пи-пи! Привет! Я мышка. Никак не пойму, где больше, а где меньше.",
      },
      { who: "fox", pose: "think", text: "Давай сравним! Это совсем не трудно." },
      { who: "res", pose: "", text: "Покажи мне, где больше, а где меньше!" },
    ],
    outro: [
      { who: "res", pose: "happy", text: "Пи-пи, спасибо! Вот звёздочка и полосатый камешек." },
      { who: "fox", pose: "cheer", text: "Слышишь? Мышка пищит от радости!" },
    ],
  },
  {
    id: "frog",
    resident: "frog",
    name: "Лягушонок",
    skill: "sentence",
    gift: "t-maple",
    giftName: "Кленовый листок",
    voice: { speaker: "eugene", pitch: 1.1 },
    intro: [
      {
        who: "res",
        pose: "sad",
        text: "Ква! Я лягушонок. Мне прислали записки, а я ещё не умею читать!",
      },
      { who: "fox", pose: "read", text: "Мой друг прочитает тебе каждую записку." },
      { who: "res", pose: "", text: "Прочитай записку и найди ответ. Ква!" },
    ],
    outro: [
      {
        who: "res",
        pose: "happy",
        text: "Ква-ква, ура! Вот тебе звёздочка и кленовый листок на память.",
      },
      { who: "fox", pose: "cheer", text: "Половина леса уже сияет! Идём дальше, в чащу!" },
    ],
  },
  // ---------- second visits: the deep forest ----------
  {
    id: "hedgehog-2",
    resident: "hedgehog",
    name: "Ёжик",
    skill: "letters",
    gift: "apple",
    giftName: "Румяное яблоко",
    voice: { speaker: "baya", pitch: 1.08 },
    intro: [
      {
        who: "res",
        pose: "sad",
        text: "Это снова я, ёжик! Я нёс яблоки, и буквы опять рассыпались!",
      },
      { who: "fox", pose: "wave", text: "Ничего, ёжик, мы уже знаем, как помочь." },
      { who: "res", pose: "", text: "Послушай и найди нужную букву!" },
    ],
    outro: [
      { who: "res", pose: "happy", text: "Ура! Держи звёздочку и румяное яблоко!" },
      { who: "fox", pose: "cheer", text: "Вкусно пахнет! Идём дальше!" },
    ],
  },
  {
    id: "squirrel-2",
    resident: "squirrel",
    name: "Белка",
    skill: "count",
    gift: "raspberry",
    giftName: "Ягодка малины",
    voice: { speaker: "kseniya", pitch: 1.1 },
    intro: [
      {
        who: "res",
        pose: "sad",
        text: "Привет-привет! Я собрала ягоды и шишки, а сколько их, не знаю!",
      },
      { who: "fox", pose: "point", text: "Посчитаем вместе, белочка!" },
      { who: "res", pose: "", text: "Посчитай мои запасы, пожалуйста!" },
    ],
    outro: [
      { who: "res", pose: "happy", text: "Как здорово! Вот звёздочка и ягодка малины!" },
      { who: "fox", pose: "cheer", text: "Белочка теперь всё знает про свои запасы!" },
    ],
  },
  {
    id: "owl-2",
    resident: "owl",
    name: "Сова",
    skill: "read",
    gift: "lantern",
    giftName: "Ночной фонарик",
    voice: { speaker: "kseniya", pitch: 0.94 },
    intro: [
      { who: "res", pose: "sad", text: "Угу! В чаще темно, и я не вижу, где какое слово." },
      { who: "fox", pose: "read", text: "Мой друг прочитает слова даже в темноте!" },
      { who: "res", pose: "", text: "Прочитай слово и найди картинку." },
    ],
    outro: [
      { who: "res", pose: "happy", text: "Угу-угу! Вот звёздочка и ночной фонарик!" },
      { who: "fox", pose: "cheer", text: "С фонариком в чаще совсем не страшно!" },
    ],
  },
  {
    id: "mouse-2",
    resident: "mouse",
    name: "Мышка",
    skill: "compare",
    gift: "cheese",
    giftName: "Кусочек сыра",
    voice: { speaker: "kseniya", pitch: 1.24 },
    intro: [
      { who: "res", pose: "sad", text: "Пи-пи! Мы с братьями делим сыр и спорим, у кого больше!" },
      { who: "fox", pose: "think", text: "Давай сравним, и спор закончится." },
      { who: "res", pose: "", text: "Покажи, где больше, а где меньше!" },
    ],
    outro: [
      { who: "res", pose: "happy", text: "Пи-пи, больше не спорим! Вот звёздочка и кусочек сыра!" },
      { who: "fox", pose: "cheer", text: "Как хорошо, когда всё честно!" },
    ],
  },
  {
    id: "hare-2",
    resident: "hare",
    name: "Зайчик",
    skill: "build",
    gift: "carrot",
    giftName: "Сладкая морковка",
    voice: { speaker: "baya", pitch: 1.16 },
    intro: [
      { who: "res", pose: "sad", text: "Привет! Я прыгал по чаще, и мои слова опять рассыпались!" },
      { who: "fox", pose: "think", text: "Соберём их, буква за буквой." },
      { who: "res", pose: "", text: "Поставь буквы по порядку!" },
    ],
    outro: [
      { who: "res", pose: "happy", text: "Ура! Возьми звёздочку и сладкую морковку!" },
      { who: "fox", pose: "cheer", text: "Зайчик скачет от радости!" },
    ],
  },
  {
    id: "beaver-2",
    resident: "beaver",
    name: "Бобр",
    skill: "syllables",
    gift: "boat",
    giftName: "Деревянная лодочка",
    voice: { speaker: "eugene", pitch: 1.03 },
    intro: [
      { who: "res", pose: "sad", text: "Привет! Я строю мостик через пруд, а слоги перепутались!" },
      { who: "fox", pose: "think", text: "Сложим мостик из слогов вместе!" },
      { who: "res", pose: "", text: "Собери слово из слогов!" },
    ],
    outro: [
      {
        who: "res",
        pose: "happy",
        text: "Какой крепкий мостик! Вот звёздочка и деревянная лодочка!",
      },
      { who: "fox", pose: "cheer", text: "Теперь можно плавать по пруду!" },
    ],
  },
  {
    id: "badger-2",
    resident: "badger",
    name: "Барсук",
    skill: "sub",
    gift: "bell",
    giftName: "Звонкий колокольчик",
    voice: { speaker: "aidar", pitch: 0.94 },
    intro: [
      {
        who: "res",
        pose: "sad",
        text: "Привет! Я угощал гостей грибами. Сколько грибов осталось?",
      },
      { who: "fox", pose: "point", text: "Узнаем! Надо вычесть, сколько съели." },
      { who: "res", pose: "", text: "Помоги мне посчитать, сколько осталось!" },
    ],
    young: {
      skill: "compare",
      intro: [
        { who: "res", pose: "sad", text: "Привет! Я раскладываю грибы и не пойму, где их больше." },
        { who: "fox", pose: "think", text: "Давай посмотрим внимательно и сравним!" },
        { who: "res", pose: "", text: "Покажи, где больше, а где меньше!" },
      ],
    },
    outro: [
      { who: "res", pose: "happy", text: "Спасибо! Вот звёздочка и звонкий колокольчик!" },
      { who: "fox", pose: "cheer", text: "Динь-динь! Идём дальше!" },
    ],
  },
  {
    id: "bear-2",
    resident: "bear",
    name: "Медвежонок",
    skill: "add",
    gift: "honey",
    giftName: "Бочонок мёда",
    voice: { speaker: "aidar", pitch: 1.0 },
    intro: [
      {
        who: "res",
        pose: "sad",
        text: "Привет! Пчёлы принесли мне ещё мёда. Сколько стало всего?",
      },
      { who: "fox", pose: "point", text: "Сложим и узнаем!" },
      { who: "res", pose: "", text: "Помоги мне сложить!" },
    ],
    young: {
      skill: "count",
      intro: [
        { who: "res", pose: "sad", text: "Привет! Пчёлы принесли мне мёд и ягоды. Сколько их?" },
        { who: "fox", pose: "point", text: "Посчитаем вместе, по одному!" },
        { who: "res", pose: "", text: "Помоги мне посчитать!" },
      ],
    },
    outro: [
      { who: "res", pose: "happy", text: "Вот это да! Держи звёздочку и бочонок мёда!" },
      { who: "fox", pose: "cheer", text: "Осталась последняя полянка! Скорее к лягушонку!" },
    ],
  },
  {
    id: "frog-2",
    resident: "frog",
    name: "Лягушонок",
    skill: "sentence",
    gift: "crown",
    giftName: "Лесная корона",
    voice: { speaker: "eugene", pitch: 1.1 },
    intro: [
      { who: "res", pose: "sad", text: "Ква! Мне прислали самые длинные записки во всём лесу!" },
      { who: "fox", pose: "read", text: "Мой друг справится. Он уже так много прочитал!" },
      { who: "res", pose: "", text: "Прочитай записку и найди ответ. Ква!" },
    ],
    outro: [
      {
        who: "res",
        pose: "happy",
        text: "Ква-ква, ура! Это последняя звёздочка леса! И лесная корона для тебя.",
      },
      { who: "fox", pose: "cheer", text: "Это была последняя звёздочка! Лес снова сияет!" },
    ],
  },
];

/**
 * The order on the path. Arithmetic comes only in the deep forest (and never for 5–6-year-olds:
 * those stops use `young`). Difficulty grows slowly from the first stop to the last.
 */
const ORDER = [
  "hedgehog",
  "squirrel",
  "owl",
  "mouse",
  "hare",
  "beaver",
  "hedgehog-2",
  "squirrel-2",
  "frog",
  "owl-2",
  "mouse-2",
  "hare-2",
  "bear",
  "beaver-2",
  "badger",
  "badger-2",
  "bear-2",
  "frog-2",
];
/** clearings on the two forest pictures, in path order (% of the picture) */
const PATH: { part: 1 | 2; x: number; y: number }[] = [
  { part: 1, x: 69.5, y: 80.3 },
  { part: 1, x: 29.5, y: 74 },
  { part: 1, x: 62, y: 61.1 },
  { part: 1, x: 31, y: 55.1 },
  { part: 1, x: 66, y: 36 },
  { part: 1, x: 39, y: 27.6 },
  { part: 1, x: 60, y: 21.1 },
  { part: 1, x: 46, y: 15 },
  { part: 1, x: 57, y: 9 },
  { part: 2, x: 39.5, y: 87.6 },
  { part: 2, x: 58, y: 76.8 },
  { part: 2, x: 36, y: 68.5 },
  { part: 2, x: 55.5, y: 58.5 },
  { part: 2, x: 38, y: 53.5 },
  { part: 2, x: 39.5, y: 44 },
  { part: 2, x: 57, y: 37 },
  { part: 2, x: 39.8, y: 29.8 },
  { part: 2, x: 57, y: 23 },
];
export const FOREST: Stop[] = ORDER.map((id, i) => {
  const def = DEFS.find((d) => d.id === id)!;
  return { ...def, ...PATH[i] };
});

/** Full-map coordinates. Both paintings use 52% height, overlapping from 48% to 52% for a soft seam. */
export const onPath = (s: { part: 1 | 2; x: number; y: number }) => ({
  x: s.x,
  y: s.part === 1 ? 48 + s.y * 0.52 : s.y * 0.52,
});

export const WORLDS = [
  { id: "forest", name: "Лес", x: 50, y: 86.3, open: true },
  { id: "sea", name: "Море", x: 40, y: 60.8, open: false },
  { id: "mountains", name: "Горы", x: 50, y: 46.8, open: false },
  { id: "city", name: "Город", x: 50, y: 31.5, open: false },
  { id: "space", name: "Космос", x: 50, y: 17, open: false },
] as const;

/** Time of day and weather along the path: morning at the entrance, dusk deep in the forest. */
export type TimeOfDay = "morning" | "day" | "evening" | "dusk";
export type Weather = "clear" | "rain" | "fog";
export const timeOf = (i: number): TimeOfDay =>
  i < 5 ? "morning" : i < 10 ? "day" : i < 14 ? "evening" : "dusk";
/** a short shower in the middle of the path (stops 8–9), mist in the evening (13–14) */
export const weatherOf = (i: number): Weather =>
  i === 7 || i === 8 ? "rain" : i === 12 || i === 13 ? "fog" : "clear";
export const TIME_NAMES: Record<TimeOfDay, string> = {
  morning: "утро",
  day: "день",
  evening: "вечер",
  dusk: "сумерки",
};
