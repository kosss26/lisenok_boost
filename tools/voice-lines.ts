// Writes assets/voice-lines.json (key -> text) and assets/voice-cast.json (key -> voice; missing = narrator)
// for tools/make-voice.py.
import { writeFileSync } from "node:fs";
import { voiceCast, voiceLines } from "../src/content/voice.ts";

const lines = voiceLines();
writeFileSync("assets/voice-lines.json", JSON.stringify(lines, null, 1) + "\n");
console.log(Object.keys(lines).length, "lines");
writeFileSync("assets/voice-cast.json", JSON.stringify(voiceCast(), null, 1) + "\n");
