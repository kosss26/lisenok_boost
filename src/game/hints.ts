import type { Task } from "./tasks.ts";
export function methodHint(task: Task): string {
  if (task.kind === "build")
    return task.unit === "syllable"
      ? "Произнеси слово по слогам. Выбирай слоги слева направо."
      : "Назови предмет. Собирай слово слева направо, по одной букве.";
  switch (task.skill) {
    case "letters":
      return task.visual.type === "listen"
        ? "Послушай задание ещё раз и сравни все буквы."
        : "Назови предмет и внимательно посмотри, какую букву нужно найти.";
    case "count":
      return "Касайся предметов по очереди и считай. Не пропускай предметы и не считай один дважды.";
    case "read":
      return "Прочитай слово по частям. Потом сравни его с картинками.";
    case "syllables":
      return "Произнеси слово по слогам и сравни варианты.";
    case "add":
      return "Начни с первого числа. Прибавляй предметы по одному; в длинном примере выполняй действия слева направо.";
    case "sub":
      return "Начни с первого числа. Убирай предметы по одному и считай, сколько осталось.";
    case "compare":
      return task.layout === "groups"
        ? "Сосчитай предметы в каждой группе по отдельности, затем сравни."
        : "Сравни числа. У двузначных сначала сравни десятки, потом единицы.";
    case "sentence":
      return "Послушай задание ещё раз. Прочитай варианты по порядку и выбери подходящий.";
    default:
      return "Посмотри на задание ещё раз и сравни варианты.";
  }
}

/** Existing recordings that explain the method without reading out the answer. */
export function methodVoice(task: Task): string[] {
  if (task.kind === "build") return [task.unit === "syllable" ? "h-syl" : "q-build"];
  if (task.skill === "read") return ["q-read"];
  if (task.skill === "letters")
    return [
      task.visual.type === "listen"
        ? task.prompt[0]
        : task.visual.type === "picture" && task.visual.text
          ? "h-letter-gap"
          : "h-letter-first",
    ];
  if (task.skill === "syllables") return ["h-syl"];
  if (task.skill === "sentence")
    return [task.prompt[0] === "q-word-find" ? "h-word-find" : task.prompt[0]];
  return task.hint;
}
