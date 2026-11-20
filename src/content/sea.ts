/** World 2 — the sea: a sandy shore with tide pools, then the rocky coast up to the lighthouse. */
import type { Line, Stop, Voice } from "./forest.ts";

// female characters get alena or lera, the male ones (crab, octopus, dolphin, seal) zahar;
// pitch shifts keep the voices apart (and apart from the forest residents)
const VOICES: Record<string, Voice> = {
  crab: { voice: "zahar", role: "good", pitch: 35 },
  turtle: { voice: "alena", role: "good", pitch: -20 },
  gull: { voice: "lera", role: "friendly", pitch: 20 },
  seastar: { voice: "alena", role: "good", pitch: 40 },
  fish: { voice: "lera", role: "friendly", pitch: 60 },
  octopus: { voice: "zahar", role: "good", pitch: -10 },
  dolphin: { voice: "zahar", role: "good", pitch: 55 },
  jelly: { voice: "alena", role: "good", pitch: 0 },
  seal: { voice: "zahar", role: "good", pitch: -30 },
};

type StopDef = Omit<Stop, "x" | "y" | "part">;
const res = (pose: "" | "sad" | "happy", text: string): Line => ({ who: "res", pose, text });
const fox = (pose: "wave" | "point" | "think" | "read" | "cheer" | "jump", text: string): Line => ({
  who: "fox",
  pose,
  text,
});
const who = (r: string) => ({ resident: `res-${r}`, voice: VOICES[r] });

/** in path order; arithmetic stops have a `young` version (another skill) for 5–6-year-olds */
const DEFS: StopDef[] = [
  {
    id: "sea-crab",
    ...who("crab"),
    name: "Крабик",
    skill: "letters",
    gift: "s-pearl",
    giftName: "Жемчужина",
    intro: [
      res("sad", "Привет! Я крабик. Волна смыла все буквы с моих ракушек!"),
      fox("wave", "Не грусти, крабик! Мой друг знает все буквы."),
      res("", "Помоги мне найти нужные буквы!"),
    ],
    outro: [
      res("happy", "Спасибо! Вот тебе звёздочка и настоящая жемчужина!"),
      fox("cheer", "Ура! Буквы снова на ракушках!"),
    ],
  },
  {
    id: "sea-turtle",
    ...who("turtle"),
    name: "Черепаха",
    skill: "count",
    gift: "s-shell",
    giftName: "Розовая ракушка",
    intro: [
      res("sad", "Здравствуй! Я черепаха. Я собирала ракушки и сбилась со счёта."),
      fox("point", "Давай считать вместе! Мой друг отлично считает."),
      res("", "Помоги мне всё пересчитать!"),
    ],
    outro: [
      res("happy", "Спасибо, дружок! Держи звёздочку и розовую ракушку."),
      fox("cheer", "Теперь черепаха ничего не перепутает!"),
    ],
  },
  {
    id: "sea-gull",
    ...who("gull"),
    name: "Чайка",
    skill: "syllables",
    gift: "s-seahorse",
    giftName: "Морской конёк",
    intro: [
      res("sad", "Привет! Я чайка. Ветер разорвал мои слова на кусочки!"),
      fox("think", "Это слоги! Соберём их вместе."),
      res("", "Найди нужный слог, пожалуйста!"),
    ],
    outro: [
      res("happy", "Спасибо! Вот тебе звёздочка и морской конёк."),
      fox("cheer", "Слова снова целые. Идём дальше!"),
    ],
  },
  {
    id: "sea-seastar",
    ...who("seastar"),
    name: "Морская звезда",
    skill: "read",
    gift: "s-anchor",
    giftName: "Золотой якорь",
    intro: [
      res("sad", "Ой, привет! Я морская звезда. Мне принесли записки, а я не умею читать."),
      fox("read", "Мой друг прочитает! Он уже много слов знает."),
      res("", "Прочитай слово и найди картинку!"),
    ],
    outro: [
      res("happy", "Как здорово! Держи звёздочку и золотой якорь."),
      fox("cheer", "Ты читаешь всё лучше и лучше!"),
    ],
  },
  {
    id: "sea-fish",
    ...who("fish"),
    name: "Рыбка",
    skill: "compare",
    gift: "s-compass",
    giftName: "Компас",
    intro: [
      res("sad", "Буль-буль! Привет! Я рыбка. Никак не пойму, где больше, а где меньше."),
      fox("think", "Давай сравним! Это совсем не трудно."),
      res("", "Покажи мне, где больше, а где меньше!"),
    ],
    outro: [
      res("happy", "Буль-буль, спасибо! Вот звёздочка и компас."),
      fox("cheer", "Теперь рыбка никогда не заблудится!"),
    ],
  },
  {
    id: "sea-octopus",
    ...who("octopus"),
    name: "Осьминог",
    skill: "build",
    gift: "s-bottle",
    giftName: "Бутылка с письмом",
    intro: [
      res("sad", "Привет! Я осьминог. Я так спешил, что перепутал все буквы в письме!"),
      fox("think", "Ничего, соберём слова по буквам."),
      res("", "Нажимай на буквы по порядку!"),
    ],
    outro: [
      res("happy", "Ура! Возьми звёздочку и бутылку с письмом."),
      fox("cheer", "Все слова на месте. Здорово получилось!"),
    ],
  },
  {
    id: "sea-dolphin",
    ...who("dolphin"),
    name: "Дельфинёнок",
    skill: "add",
    gift: "s-coral",
    giftName: "Красный коралл",
    intro: [
      res("sad", "Привет! Я дельфинёнок. Ко мне приплывают друзья, и я не знаю, сколько их стало."),
      fox("point", "Это легко! Надо просто сложить."),
      res("", "Помоги мне сложить!"),
    ],
    young: {
      skill: "count",
      intro: [
        res("sad", "Привет! Я дельфинёнок. Ко мне приплыли друзья, а сколько их, я не знаю."),
        fox("point", "Посчитаем вместе, по одному!"),
        res("", "Помоги мне посчитать!"),
      ],
    },
    outro: [
      res("happy", "Вот это да! Держи звёздочку и красный коралл."),
      fox("cheer", "Все друзья дельфинёнка в сборе!"),
    ],
  },
  {
    id: "sea-jelly",
    ...who("jelly"),
    name: "Медуза",
    skill: "sentence",
    gift: "s-wheel",
    giftName: "Штурвал",
    intro: [
      res("sad", "Привет! Я медуза. Волны принесли мне длинные записки."),
      fox("read", "Мой друг прочитает их тебе!"),
      res("", "Прочитай записку и найди ответ!"),
    ],
    outro: [
      res("happy", "Спасибо! Вот звёздочка и штурвал от старого корабля."),
      fox("cheer", "Все записки прочитаны!"),
    ],
  },
  {
    id: "sea-seal",
    ...who("seal"),
    name: "Тюлень",
    skill: "sub",
    gift: "s-spyglass",
    giftName: "Подзорная труба",
    intro: [
      res("sad", "Привет! Я тюлень. Я раздал друзьям рыбок и не знаю, сколько осталось."),
      fox("point", "Чтобы узнать, сколько осталось, надо вычесть!"),
      res("", "Помоги мне узнать, сколько осталось!"),
    ],
    young: {
      skill: "compare",
      intro: [
        res("sad", "Привет! Я тюлень. Я раскладываю рыбок, где же их больше?"),
        fox("think", "Давай сравним! Это совсем не трудно."),
        res("", "Покажи, где больше, а где меньше!"),
      ],
    },
    outro: [
      res("happy", "Спасибо! Возьми звёздочку и подзорную трубу."),
      fox("cheer", "В неё видно далёкий маяк!"),
    ],
  },
  {
    id: "sea-crab-2",
    ...who("crab"),
    name: "Крабик",
    skill: "letters",
    gift: "s-boat",
    giftName: "Кораблик",
    intro: [
      res("sad", "Это снова я, крабик! Теперь буквы спрятались в песке."),
      fox("wave", "Мы их найдём! Правда, друг?"),
      res("", "Помоги мне найти буквы!"),
    ],
    outro: [
      res("happy", "Спасибо! Вот звёздочка и кораблик."),
      fox("cheer", "Пусть кораблик плывёт по волнам!"),
    ],
  },
  {
    id: "sea-turtle-2",
    ...who("turtle"),
    name: "Черепаха",
    skill: "count",
    gift: "s-amber",
    giftName: "Янтарь",
    intro: [
      res("sad", "Здравствуй ещё раз! Теперь у меня столько всего, что не сосчитать!"),
      fox("point", "Мы сосчитаем! Будем считать вместе."),
      res("", "Посчитай, пожалуйста!"),
    ],
    outro: [
      res("happy", "Спасибо! Держи звёздочку и кусочек янтаря."),
      fox("cheer", "Янтарь светится, как маленькое солнышко!"),
    ],
  },
  {
    id: "sea-seastar-2",
    ...who("seastar"),
    name: "Морская звезда",
    skill: "read",
    gift: "s-glass",
    giftName: "Морское стёклышко",
    intro: [
      res("sad", "Привет! Мне принесли новые слова, и они ещё длиннее!"),
      fox("read", "Ничего! Мы будем читать по слогам."),
      res("", "Прочитай слово и найди картинку!"),
    ],
    outro: [
      res("happy", "Ура! Вот звёздочка и морское стёклышко."),
      fox("cheer", "Как красиво оно блестит!"),
    ],
  },
  {
    id: "sea-octopus-2",
    ...who("octopus"),
    name: "Осьминог",
    skill: "build",
    gift: "s-key",
    giftName: "Золотой ключик",
    intro: [
      res("sad", "Это снова я, осьминог! Я писал письмо всеми щупальцами, и буквы перепутались."),
      fox("think", "Соберём слова по буквам, не торопясь."),
      res("", "Нажимай на буквы по порядку!"),
    ],
    outro: [
      res("happy", "Спасибо! Возьми звёздочку и золотой ключик."),
      fox("cheer", "Интересно, какой сундучок он открывает?"),
    ],
  },
  {
    id: "sea-dolphin-2",
    ...who("dolphin"),
    name: "Дельфинёнок",
    skill: "add",
    gift: "s-bell",
    giftName: "Корабельный колокол",
    intro: [
      res("sad", "Привет! Я снова собираю друзей, только их стало ещё больше!"),
      fox("point", "Будем складывать! Это мы уже умеем."),
      res("", "Помоги мне сложить!"),
    ],
    young: {
      skill: "syllables",
      intro: [
        res("sad", "Привет! Я дельфинёнок. Волны разбили мои слова на слоги!"),
        fox("think", "Соберём их снова, слог за слогом."),
        res("", "Найди нужный слог, пожалуйста!"),
      ],
    },
    outro: [
      res("happy", "Вот спасибо! Держи звёздочку и корабельный колокол."),
      fox("cheer", "Динь-динь! Его слышно на всё море!"),
    ],
  },
  {
    id: "sea-gull-2",
    ...who("gull"),
    name: "Чайка",
    skill: "syllables",
    gift: "s-feather",
    giftName: "Перо чайки",
    intro: [
      res("sad", "Привет! Это снова я, чайка. Ветер опять разорвал слова на слоги!"),
      fox("think", "Не беда! Мы их снова соберём."),
      res("", "Найди нужный слог!"),
    ],
    outro: [
      res("happy", "Спасибо! Возьми звёздочку и моё пёрышко."),
      fox("cheer", "Лёгкое, как морской ветер!"),
    ],
  },
  {
    id: "sea-seal-2",
    ...who("seal"),
    name: "Тюлень",
    skill: "sub",
    gift: "s-hourglass",
    giftName: "Песочные часы",
    intro: [
      res("sad", "Привет! Я снова раздаю рыбок. Сколько же у меня осталось?"),
      fox("point", "Будем вычитать, это мы умеем!"),
      res("", "Помоги мне узнать, сколько осталось!"),
    ],
    young: {
      skill: "build",
      intro: [
        res("sad", "Привет! Я тюлень. Я хотел написать слова, но буквы перепутались."),
        fox("think", "Соберём слова по буквам."),
        res("", "Нажимай на буквы по порядку!"),
      ],
    },
    outro: [
      res("happy", "Спасибо! Вот звёздочка и песочные часы."),
      fox("cheer", "Песок бежит, а мы идём дальше!"),
    ],
  },
  {
    id: "sea-fish-2",
    ...who("fish"),
    name: "Рыбка",
    skill: "compare",
    gift: "s-lighthouse",
    giftName: "Маленький маяк",
    intro: [
      res("sad", "Буль-буль! Это снова я, рыбка. Теперь числа большие-пребольшие!"),
      fox("think", "Сравним их по порядку. Это не трудно!"),
      res("", "Покажи, где больше, а где меньше!"),
    ],
    outro: [
      res("happy", "Буль-буль, ура! Держи звёздочку и маленький маяк."),
      fox("cheer", "Он будет светить нам в пути!"),
    ],
  },
  {
    id: "sea-jelly-2",
    ...who("jelly"),
    name: "Медуза",
    skill: "sentence",
    gift: "s-crown",
    giftName: "Корона морского царя",
    intro: [
      res("sad", "Привет! Это снова я, медуза. Мне прислали самые длинные записки во всём море!"),
      fox("read", "Мой друг справится. Он уже так много прочитал!"),
      res("", "Прочитай записку и найди ответ!"),
    ],
    outro: [
      res("happy", "Ура! Это последняя звёздочка моря! И корона морского царя для тебя."),
      fox("cheer", "Последняя звёздочка! Море снова сияет!"),
    ],
  },
];

/** what a sea resident says when the child tickles it (in its own voice), by picture name */
export const SEA_TICKLE: Record<string, string> = {
  "res-crab": "Хи-хи! Щекотно! Сейчас убегу боком!",
  "res-turtle": "Ой, щекотно! Я спрячусь в панцирь!",
  "res-gull": "Ой-ой! Щекотно! Хи-хи!",
  "res-seastar": "Хи-хи! У меня пять лучиков, и всем щекотно!",
  "res-fish": "Буль-буль! Хи-хи!",
  "res-octopus": "Хо-хо! Щекотно всем щупальцам!",
  "res-dolphin": "Хи-хи-хи! Щекотно!",
  "res-jelly": "Ой, щекотно! Хи-хи!",
  "res-seal": "Хо-хо! Щекотно! Ар-ар!",
};

/** clearings on the two sea pictures, in path order (% of the picture) */
const PATH: { part: 1 | 2; x: number; y: number }[] = [
  { part: 1, x: 61.8, y: 84.2 },
  { part: 1, x: 40.6, y: 71.4 },
  { part: 1, x: 61.2, y: 58.9 },
  { part: 1, x: 37.3, y: 47.4 },
  { part: 1, x: 57.5, y: 36.4 },
  { part: 1, x: 34.7, y: 28.1 },
  { part: 1, x: 52.1, y: 19.9 },
  { part: 1, x: 36.4, y: 12.2 },
  { part: 1, x: 47.1, y: 4.8 },
  { part: 2, x: 59.9, y: 86.4 },
  { part: 2, x: 38.8, y: 74.5 },
  { part: 2, x: 56.6, y: 63.2 },
  { part: 2, x: 36, y: 52.7 },
  { part: 2, x: 52.9, y: 44.2 },
  { part: 2, x: 35.1, y: 36.6 },
  { part: 2, x: 48.6, y: 29.7 },
  { part: 2, x: 33.8, y: 23.6 },
  { part: 2, x: 45.3, y: 18.1 },
];
export const SEA: Stop[] = DEFS.map((def, i) => ({ ...def, ...PATH[i] }));
