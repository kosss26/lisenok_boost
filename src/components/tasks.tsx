/** The task views: multiple choice (letters, numbers, pictures, words, signs, groups) and word building. */
import { useEffect, useRef, useState } from "react";
import { numKey, shown, sylKey, voiceLines } from "../content/voice";
import { say, sfx } from "../game/audio";
import { vibrate } from "../game/haptics";
import { useDrag } from "../game/drag";
import type { BuildTask, ChoiceTask, Option, Task, Visual } from "../game/tasks";
import { Pic, SpeakerIcon } from "./kit";
import { IconBulb } from "./icons";

import { useAnswering } from "../game/answering";

import { useTaskDraft } from "../game/lesson-draft";
import { useTaskMediaUnavailable } from "../game/media";
import { methodHint } from "../game/hints";

const LINES = voiceLines();
export type Solved = (mistakes: number, hinted: boolean) => void;
export type Mood = "idle" | "happy" | "oops";
/** the fox helps a hesitating child: 1 = glances toward the answer, 2 = points at it */
export type Guide = { stage: 1 | 2; x: number; y: number } | null;
type OnGuide = (g: Guide) => void;

export function TaskView({
  task,
  onSolved,
  onMood,
  onGuide = () => {},
}: {
  task: Task;
  onSolved: Solved;
  onMood: (m: Mood) => void;
  onGuide?: OnGuide;
}) {
  return task.kind === "choice" ? (
    <Choice task={task} onSolved={onSolved} onMood={onMood} onGuide={onGuide} />
  ) : (
    <Build task={task} onSolved={onSolved} onMood={onMood} onGuide={onGuide} />
  );
}

/** Tells the fox where the answer is while the guide stage is on (and nothing once it is off). */
function useGuideTarget(
  stage: 0 | 1 | 2,
  root: React.RefObject<HTMLElement | null>,
  selector: string,
  onGuide: OnGuide,
) {
  useEffect(() => {
    const el = stage ? root.current?.querySelector<HTMLElement>(selector) : null;
    if (!el) {
      onGuide(null);
      return;
    }
    const r = el.getBoundingClientRect();
    onGuide({ stage: stage as 1 | 2, x: r.left + r.width / 2, y: r.top + r.height / 2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, selector]);
  useEffect(() => () => onGuide(null), [onGuide]);
}

function PromptBar({
  task,
  onRepeat,
  onHint,
}: {
  task: Task;
  onRepeat: () => void;
  onHint: () => void;
}) {
  return (
    <div className="prompt">
      <button
        type="button"
        className="round-btn repeat-btn"
        aria-label="Повторить задание"
        onClick={onRepeat}
      >
        <SpeakerIcon />
      </button>
      <div className="prompt-copy">
        <p className="prompt-text">{shown(LINES[task.prompt[0]])}</p>
        <details className="prompt-transcript">
          <summary>Текст задания</summary>
          <p>{task.prompt.map((k) => shown(LINES[k] ?? "")).join(" ")}</p>
        </details>
      </div>
      <button type="button" className="round-btn hint-btn" aria-label="Подсказка" onClick={onHint}>
        <IconBulb />
      </button>
    </div>
  );
}

// ---------------- choice ----------------
function Choice({
  task,
  onSolved,
  onMood,
  onGuide,
}: {
  task: ChoiceTask;
  onSolved: Solved;
  onMood: (m: Mood) => void;
  onGuide: OnGuide;
}) {
  const a = useAnswering(task, onSolved, onMood);
  const imageBlocked = useTaskMediaUnavailable() > 0;
  const rootRef = useRef<HTMLDivElement | null>(null);
  useGuideTarget(a.guide, rootRef, '.option[data-answer="1"]', onGuide);
  const { initial, save } = useTaskDraft();
  const [off, setOff] = useState<string[]>(initial.current.off);
  const [picked, setPicked] = useState<string | null>(initial.current.picked);
  const pruned =
    a.hintStage === 2 && task.options.filter((o) => !off.includes(o.id)).length > 2
      ? task.options.find((o) => o.id !== task.answer && !off.includes(o.id))?.id
      : undefined;
  const [shaking, setShaking] = useState<string | null>(null);

  // drag an answer onto the card (into the "?" box when there is one); tapping works as well
  const cardRef = useRef<HTMLDivElement | null>(null);
  const drag = useDrag<string>({
    zones: () => [
      {
        area: cardRef.current,
        target: cardRef.current?.querySelector<HTMLElement>(
          ".math-answer, .cmp-box, .gap, .paper-word, .paper-sentence, .card-pic, .listen-btn",
        ),
      },
    ],
    onDrop: (id) => {
      const o = task.options.find((x) => x.id === id);
      if (o) tap(o);
    },
    onNear: () => void sfx("tap", 0.4),
    disabled: a.solved,
  });

  // counting tasks: on the right answer the objects hop one by one while the voice counts them
  const along = useRef<(() => Promise<void>) | null>(null);
  const tap = (o: Option) => {
    if (imageBlocked || a.solved || off.includes(o.id) || o.id === pruned) return;
    if (o.id === task.answer) {
      setPicked(o.id);
      if (along.current) a.right([], along.current, { picked: o.id });
      else a.right(o.say ? [o.say] : [], undefined, { picked: o.id });
    } else {
      setOff((x) => [...x, o.id]);
      save({ off: [...off, o.id] });
      setShaking(o.id);
      window.setTimeout(() => setShaking(null), 500);
      a.wrong(o.say);
    }
  };

  return (
    <div ref={rootRef} className={`task task-${task.skill} layout-${task.layout} guide-${a.guide}`}>
      <PromptBar task={task} onRepeat={a.repeat} onHint={a.hint} />
      <HintExplanation task={task} stage={a.hintStage} pruned={Boolean(pruned)} />
      <div
        ref={cardRef}
        className={`drop-card ${drag.near !== null ? "is-near" : ""} ${a.guide === 2 ? "is-target" : ""}`}
      >
        <VisualCard
          visual={task.visual}
          task={task}
          picked={picked}
          onListen={() => void say(task.prompt)}
          along={along}
        />
      </div>
      <div className={`options options-${task.layout} n${task.options.length}`}>
        {task.options.map((o) => {
          const isAnswer = o.id === task.answer;
          return (
            <button
              key={o.id}
              type="button"
              className={[
                "option drag-item",
                drag.dragging === o.id ? "is-dragging" : "",
                off.includes(o.id) ? "is-off" : "",
                o.id === pruned ? "is-pruned" : "",
                picked === o.id ? "is-right" : "",
                shaking === o.id ? "is-shaking" : "",
                a.guide === 2 && isAnswer ? "is-hint" : "",
                a.guide === 2 && !isAnswer && !off.includes(o.id) ? "is-faded" : "",
                a.reveal && isAnswer && !a.solved ? "is-reveal" : "",
              ].join(" ")}
              data-answer={isAnswer ? "1" : undefined}
              data-option={o.id}
              disabled={imageBlocked || o.id === pruned}
              aria-label={o.label ?? o.id}
              {...(off.includes(o.id) ? {} : drag.bind(o.id))}
              style={drag.style(o.id)}
              onClick={() => tap(o)}
            >
              {task.layout === "groups" && o.pic && o.count ? (
                <span className="group">
                  {Array.from({ length: o.count }, (_, i) => (
                    <Pic key={i} name={o.pic!} className="group-pic" />
                  ))}
                </span>
              ) : o.pic ? (
                <Pic name={o.pic} className="option-pic" />
              ) : (
                <span className="option-label">{o.label}</span>
              )}
              {picked === o.id && <Burst />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function VisualCard({
  visual,
  task,
  picked,
  onListen,
  along,
}: {
  visual: Visual;
  task: ChoiceTask;
  picked: string | null;
  onListen: () => void;
  along: React.RefObject<(() => Promise<void>) | null>;
}) {
  switch (visual.type) {
    case "listen":
      return (
        <div className="card card-listen">
          <button
            type="button"
            className="listen-btn"
            aria-label="Послушать ещё раз"
            onClick={onListen}
          >
            <SpeakerIcon />
          </button>
          <span className="card-caption">Послушай</span>
        </div>
      );
    case "picture":
      return (
        <div className="card card-picture">
          <div className="illustration-stage">
            <Pic name={visual.pic} className="card-pic" />
          </div>
          {visual.text && (
            <div className="gap-word">
              {[...visual.text].map((c, i) =>
                c === "_" ? (
                  <span key={i} className={`gap ${picked ? "is-filled" : ""}`}>
                    {picked ?? ""}
                  </span>
                ) : (
                  <span key={i}>{c}</span>
                ),
              )}
            </div>
          )}
        </div>
      );
    case "word":
      return (
        <div className="card card-word">
          <span className="paper-word">{visual.text}</span>
        </div>
      );
    case "sentence":
      return (
        <div className="card card-sentence">
          <p className="paper-sentence">{visual.text}</p>
        </div>
      );
    case "count":
      return <CountCard visual={visual} along={along} />;
    case "math":
      return <MathCard visual={visual} picked={picked} />;
    case "compare":
      return (
        <div className="card card-compare">
          <span className="cmp-side">{visual.left}</span>
          <span className={`cmp-box ${picked ? "is-filled" : ""}`}>{picked ?? "?"}</span>
          <span className="cmp-side">{visual.right}</span>
        </div>
      );
  }
  void task;
}

/** Objects to count: tap each one — or carry it into the basket — and the voice counts along. */
function CountCard({
  visual,
  along,
}: {
  visual: Extract<Visual, { type: "count" }>;
  along: React.RefObject<(() => Promise<void>) | null>;
}) {
  const [marked, setMarked] = useState<number[]>([]);
  /** counting along after the right answer: objects up to this one have hopped (−1: not counting) */
  const [hop, setHop] = useState(-1);
  const [basket, setBasket] = useState<number[]>([]);
  const basketRef = useRef<HTMLDivElement | null>(null);
  const tens = visual.mode === "tens" ? Math.floor(visual.n / 10) : 0;
  const ones = visual.mode === "tens" ? visual.n % 10 : visual.n;
  const withBasket = visual.mode !== "tens";
  useEffect(() => {
    if (visual.mode === "tens" || ones > 10) return;
    along.current = async () => {
      for (let i = 0; i < ones; i++) {
        setHop(i);
        // each object hops as its number is said
        await Promise.all([say([numKey(i + 1)], 0), new Promise((r) => window.setTimeout(r, 450))]);
      }
    };
    return () => {
      along.current = null;
    };
  }, [along, ones, visual.mode]);
  const mark = (i: number, value: number) => {
    if (marked.includes(i)) return;
    const next = [...marked, i];
    setMarked(next);
    void sfx("pick", 0.6);
    void say([numKey(value)], 0);
  };
  // running total in the order the child taps (tens strips count 10)
  const totalFor = (i: number) => [...marked, i].reduce((s, k) => s + (k < 1000 ? 1 : 10), 0);
  const drag = useDrag<number>({
    zones: () => [{ area: basketRef.current }],
    onDrop: (i) => {
      if (basket.includes(i)) return;
      setBasket((b) => [...b, i]);
      if (!marked.includes(i)) mark(i, totalFor(i));
    },
    onNear: () => void sfx("tap", 0.3),
  });
  return (
    <div className={`card card-count count-${visual.mode}`}>
      {tens > 0 && (
        <div className="tens">
          {Array.from({ length: tens }, (_, t) => {
            const id = 1000 + t;
            return (
              <button
                key={id}
                type="button"
                className={`ten-strip ${marked.includes(id) ? "is-marked" : ""}`}
                aria-label="десяток"
                onClick={() => mark(id, totalFor(id))}
              >
                {Array.from({ length: 10 }, (_, k) => (
                  <Pic key={k} name={visual.pic} className="ten-pic" />
                ))}
              </button>
            );
          })}
        </div>
      )}
      <div className={`ones ones-${visual.mode}`}>
        {Array.from({ length: ones }, (_, i) => (
          <button
            key={i}
            type="button"
            className={[
              "count-item",
              withBasket ? "drag-item" : "",
              drag.dragging === String(i) ? "is-dragging" : "",
              marked.includes(i) ? "is-marked" : "",
              basket.includes(i) ? "is-in-basket" : "",
              hop >= i ? "is-counted" : "",
              hop === i ? "is-hop" : "",
            ].join(" ")}
            aria-label="посчитать"
            {...(withBasket && !basket.includes(i) ? drag.bind(i) : {})}
            style={drag.style(i)}
            onClick={() => mark(i, totalFor(i))}
          >
            <Pic name={visual.pic} className="count-pic" />
            {hop >= 0
              ? hop >= i && <span className="count-badge">{i + 1}</span>
              : marked.includes(i) &&
                visual.mode !== "tens" && (
                  <span className="count-badge">{marked.indexOf(i) + 1}</span>
                )}
          </button>
        ))}
      </div>
      {withBasket && (
        <div
          ref={basketRef}
          className={`count-basket ${drag.near !== null ? "is-near" : ""} ${basket.length ? "has-some" : ""}`}
          aria-hidden
        >
          <span className="basket-load">
            {basket.slice(-5).map((i) => (
              <Pic key={i} name={visual.pic} className="basket-pic" />
            ))}
          </span>
          <Pic name="basket" className="basket-img" />
          {basket.length > 0 && <span className="basket-count">{basket.length}</span>}
        </div>
      )}
    </div>
  );
}

function MathCard({
  visual,
  picked,
}: {
  visual: Extract<Visual, { type: "math" }>;
  picked: string | null;
}) {
  const { a, b, op, pic, c, op2 } = visual;
  return (
    <div className={`card card-math ${pic ? "with-pics" : ""}`}>
      {pic && (
        <div className="math-pics">
          {op === "+" ? (
            <>
              <span className="math-group">
                {Array.from({ length: a }, (_, i) => (
                  <Pic key={i} name={pic} className="math-pic" />
                ))}
              </span>
              <span className="math-group is-new">
                {Array.from({ length: b }, (_, i) => (
                  <Pic key={i} name={pic} className="math-pic" />
                ))}
              </span>
            </>
          ) : (
            // they start in the basket; then b of them hop out one by one
            <span className="math-basket">
              <span className="math-group">
                {Array.from({ length: a }, (_, i) => {
                  const k = i - (a - b);
                  return (
                    <Pic
                      key={i}
                      name={pic}
                      className={`math-pic ${k >= 0 ? "is-leaving" : ""}`}
                      style={k >= 0 ? ({ "--k": k } as React.CSSProperties) : undefined}
                    />
                  );
                })}
              </span>
              <Pic name="basket" className="math-basket-img" />
            </span>
          )}
        </div>
      )}
      <div className="math-line">
        <span>{a}</span>
        <span className="math-op">{op === "+" ? "+" : "−"}</span>
        <span>{b}</span>
        {c !== undefined && (
          <>
            <span className="math-op">{op2 === "+" ? "+" : "−"}</span>
            <span>{c}</span>
          </>
        )}
        <span className="math-op">=</span>
        <span className={`math-answer ${picked ? "is-filled" : ""}`}>{picked ?? "?"}</span>
      </div>
    </div>
  );
}

// ---------------- build a word ----------------
function Build({
  task,
  onSolved,
  onMood,
  onGuide,
}: {
  task: BuildTask;
  onSolved: Solved;
  onMood: (m: Mood) => void;
  onGuide: OnGuide;
}) {
  const a = useAnswering(task, onSolved, onMood);
  const imageBlocked = useTaskMediaUnavailable() > 0;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { initial, save } = useTaskDraft();
  const [used, setUsed] = useState<number[]>(initial.current.used);
  const [shaking, setShaking] = useState<number | null>(null);
  /** slots whose letter has landed (the letter flies there from its tile first) */
  const [landed, setLanded] = useState<number[]>(initial.current.used.map((_, i) => i));
  const [flying, setFlying] = useState<Flight[]>([]);
  const slotRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const pieceRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const placed = used.length;
  const done = placed === task.target.length;
  const pruned =
    a.hintStage === 2
      ? task.pieces.findIndex((p, i) => !used.includes(i) && p !== task.target[placed])
      : -1;
  const nextIdx = task.pieces.findIndex((p, i) => !used.includes(i) && p === task.target[placed]);
  useGuideTarget(a.guide, rootRef, '.piece[data-answer="1"]', onGuide);

  const tap = (i: number, dropped?: DOMRect) => {
    if (imageBlocked || done || used.includes(i) || i === pruned) return;
    if (task.pieces[i] === task.target[placed]) {
      const next = [...used, i];
      const slot = placed;
      const from = dropped ?? pieceRefs.current[i]?.getBoundingClientRect();
      const to = slotRefs.current[slot]?.getBoundingClientRect();
      if (from && to && !reducedMotion()) {
        setFlying((f) => [...f, { id: slot, text: task.pieces[i], from, to }]);
      } else setLanded((l) => [...l, slot]);
      setUsed(next);
      if (next.length === task.target.length) {
        a.right([task.prompt[1]], undefined, { used: next });
      } else {
        save({ used: next });
        void sfx("pick");
        void vibrate(12);
        a.poke();
        if (task.unit === "syllable") void say([sylKey(task.pieces[i])], 0);
      }
    } else {
      setShaking(i);
      window.setTimeout(() => setShaking(null), 500);
      a.wrong();
    }
  };

  // drag a piece into the word: it snaps to the next empty slot
  const slotsRef = useRef<HTMLDivElement | null>(null);
  const drag = useDrag<number>({
    zones: () => [{ area: slotsRef.current, target: slotRefs.current[placed] }],
    onDrop: (i, _zone, rect) => tap(i, rect),
    onNear: () => void sfx("tap", 0.4),
    disabled: done,
  });

  const land = (slot: number) => {
    setFlying((f) => f.filter((x) => x.id !== slot));
    setLanded((l) => [...l, slot]);
  };

  return (
    <div
      ref={rootRef}
      className={`task task-${task.skill} task-build unit-${task.unit} guide-${a.guide}`}
    >
      <PromptBar task={task} onRepeat={a.repeat} onHint={a.hint} />
      <HintExplanation task={task} stage={a.hintStage} pruned={pruned >= 0} />
      <div className="card card-build">
        <div className="illustration-stage">
          <Pic name={task.pic} className="card-pic" />
        </div>
        <div
          ref={slotsRef}
          className={`slots n${task.target.length} ${drag.near !== null || a.guide === 2 ? "is-near" : ""}`}
        >
          {task.target.map((piece, i) => (
            <span
              key={i}
              ref={(el) => {
                slotRefs.current[i] = el;
              }}
              className={`slot ${i < placed ? "is-filled" : ""} ${landed.includes(i) ? "is-landed" : ""} ${i === placed && !done ? "is-current" : ""}`}
            >
              {landed.includes(i) ? (
                piece
              ) : task.ghost ? (
                <span className="ghost">{piece}</span>
              ) : (
                ""
              )}
            </span>
          ))}
          {done && landed.length === task.target.length && <Burst />}
        </div>
      </div>
      {flying.map((f) => (
        <FlyingPiece key={f.id} flight={f} onLanded={() => land(f.id)} />
      ))}
      <div className={`pieces n${task.pieces.length}`}>
        {task.pieces.map((piece, i) => (
          <button
            key={i}
            type="button"
            className={[
              "piece drag-item",
              drag.dragging === String(i) ? "is-dragging" : "",
              used.includes(i) ? "is-used" : "",
              i === pruned ? "is-pruned" : "",
              shaking === i ? "is-shaking" : "",
              a.guide === 2 && i === nextIdx && !done ? "is-hint" : "",
              a.guide === 2 && i !== nextIdx && !used.includes(i) ? "is-faded" : "",
            ].join(" ")}
            data-answer={i === nextIdx ? "1" : undefined}
            disabled={imageBlocked || i === pruned}
            aria-label={piece}
            ref={(el) => {
              pieceRefs.current[i] = el;
            }}
            {...drag.bind(i)}
            style={drag.style(i)}
            onClick={() => tap(i)}
          >
            {piece}
          </button>
        ))}
      </div>
    </div>
  );
}

type Flight = { id: number; text: string; from: DOMRect; to: DOMRect };
const reducedMotion = () =>
  typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A tile that springs from the table into its slot (Web Animations, transform only). */
function FlyingPiece({ flight, onLanded }: { flight: Flight; onLanded: () => void }) {
  const done = useRef(onLanded);
  done.current = onLanded;
  const { from, to } = flight;
  return (
    <span
      className="flying-piece"
      style={{ left: from.left, top: from.top, width: from.width, height: from.height }}
      aria-hidden="true"
      ref={(el) => {
        if (!el || el.dataset.go) return;
        el.dataset.go = "1";
        const dx = to.left + to.width / 2 - (from.left + from.width / 2);
        const dy = to.top + to.height / 2 - (from.top + from.height / 2);
        const s = Math.min(1, to.height / from.height);
        const anim = el.animate(
          [
            { transform: "translate(0, 0) scale(1) rotate(0deg)" },
            {
              transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 20}px) scale(1.06) rotate(-4deg)`,
              offset: 0.45,
            },
            { transform: `translate(${dx}px, ${dy}px) scale(${s}) rotate(0deg)` },
          ],
          { duration: 360, easing: "cubic-bezier(0.34, 1.3, 0.64, 1)", fill: "forwards" },
        );
        anim.onfinish = () => done.current();
      }}
    >
      {flight.text}
    </span>
  );
}

/** Little stars bursting out of a right answer. */
const BURST = Array.from({ length: 6 }, (_, i) => i);
export function Burst() {
  return (
    <span className="burst" aria-hidden>
      {BURST.map((i) => (
        <Pic key={i} name="star" className="burst-star" alt="" />
      ))}
    </span>
  );
}

function HintExplanation({
  task,
  stage,
  pruned = false,
}: {
  task: Task;
  stage: number;
  pruned?: boolean;
}) {
  return (
    <div className="hint-area">
      {stage > 0 && (
        <p className="hint-explanation" data-hint-stage={stage} role="status">
          <b>
            {stage === 1 ? "Попробуем так" : stage === 2 ? "Ещё немного помощи" : "Вот подсказка"}
          </b>{" "}
          {stage === 1
            ? methodHint(task)
            : stage === 2
              ? pruned
                ? "Один неподходящий вариант убран. Сравни оставшиеся."
                : "Сравни варианты ещё раз. Следующая подсказка покажет, что выбрать."
              : "Лисёнок показывает, что выбрать. Попробуй сам!"}
        </p>
      )}
    </div>
  );
}
