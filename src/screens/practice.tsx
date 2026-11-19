import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { SKILL_NAMES, FOREST, type Skill } from "../content/forest";
import { SKILLS_BY_LEVEL } from "../game/tasks";
import { useProgress } from "../game/progress";
import { BackButton, Pic } from "../components/kit";
import { useLessonStart } from "../components/lesson-start";
import { GladeGame } from "./glade";
import { NotFound } from "./recovery";
export function Practice() {
  const p = useProgress(),
    navigate = useNavigate();
  const { request, dialog } = useLessonStart((s) => void navigate({ to: `/practice/${s.target}` }));
  return (
    <div className="practice-screen">
      <div className="top-bar">
        <BackButton to="/map" />
        <h1>Выбери занятие</h1>
      </div>
      <p>Пять заданий — и маленькая находка. Можно выбрать любой навык.</p>
      <div className="practice-grid">
        {SKILLS_BY_LEVEL[p.settings.level].map((skill) => (
          <button
            type="button"
            key={skill}
            className="practice-card"
            data-skill={skill}
            onClick={() => request("practice", skill)}
          >
            <Pic name={FOREST.find((s) => s.skill === skill)?.resident ?? "frog"} />
            <span>
              {skill === "sentence" && p.settings.level === 1 ? "Найди слово" : SKILL_NAMES[skill]}
            </span>
          </button>
        ))}
      </div>
      {dialog}
    </div>
  );
}
export function PracticeLesson() {
  const { skill = "" } = useParams({ strict: false }) as { skill?: string };
  const p = useProgress(),
    navigate = useNavigate();
  const valid = SKILLS_BY_LEVEL[p.settings.level].includes(skill as Skill);
  const { request, dialog } = useLessonStart();
  const matches = p.session?.mode === "practice" && p.session.target === skill;
  const attempted = useRef(false);
  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    if (valid && !matches && !p.session) request("practice", skill);
  }, [valid, matches, skill, p.session, request]);
  if (!valid) return <NotFound />;
  if (!matches)
    return (
      <div className="practice-screen">
        <h1>{SKILL_NAMES[skill as Skill]}</h1>
        <button className="big-btn" onClick={() => request("practice", skill)}>
          Начать
        </button>
        <button className="text-action" onClick={() => void navigate({ to: "/practice" })}>
          Выбрать другое занятие
        </button>
        {dialog}
      </div>
    );
  return <GladeGame mode="practice" skill={skill as Skill} />;
}
