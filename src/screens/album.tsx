import { useEffect, useState } from "react";
import { FOREST } from "../content/forest";
import { FINDS } from "../content/glade";
import { BackButton, Pic } from "../components/kit";
import { IconLock } from "../components/icons";
import { Sky } from "../components/sky";
import { giftKey } from "../content/voice";
import { say, sfx } from "../game/audio";
import { vibrate } from "../game/haptics";
import { openGift, useProgress } from "../game/progress";

export function Album() {
  const p = useProgress();
  useEffect(() => {
    const p0 = p;
    const wrapped = p0.gifts.some((g) => !p0.opened.includes(g));
    const t = window.setTimeout(() => void say(wrapped ? ["album", "album-open"] : ["album"]), 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="album-screen">
      <div className="top-bar">
        <BackButton to="/map" label="На карту" />
        <h1 className="album-title">Мои сокровища</h1>
        <span className="top-spacer" />
      </div>
      <p className="album-sub">
        Лес · {p.gifts.length} из {FOREST.length}
      </p>
      {p.gifts.some((g) => !p.opened.includes(g)) && (
        <button
          type="button"
          className="album-new"
          onClick={() =>
            document.querySelector<HTMLButtonElement>(".album-slot.is-wrapped")?.focus()
          }
        >
          Новые подарки: {p.gifts.filter((g) => !p.opened.includes(g)).length} · Открыть ↓
        </button>
      )}
      <div className="album-grid">
        {FOREST.map((s) => (
          <AlbumGift
            key={s.id}
            stopId={s.id}
            gift={s.gift}
            name={s.giftName}
            resident={s.resident}
            residentName={s.name}
            have={p.gifts.includes(s.gift)}
            wrapped={!p.opened.includes(s.gift)}
          />
        ))}
      </div>
      {Object.keys(p.sky).length > 0 && (
        <>
          <p className="album-sub">Моё небо · {Object.keys(p.sky).length} звёзд</p>
          <div className="album-sky">
            <Sky />
          </div>
        </>
      )}
      {Object.keys(p.finds).length > 0 && (
        <>
          <p className="album-sub">
            Находки с полянки · {Object.keys(p.finds).length} из {FINDS.length}
          </p>
          <div className="album-grid album-finds">
            {FINDS.map((f) => {
              const n = p.finds[f.id] ?? 0;
              return (
                <button
                  key={f.id}
                  type="button"
                  className={`album-slot ${n ? "is-have" : "is-empty"}`}
                  aria-label={n ? f.name : "Пока не найдено"}
                  onClick={() => (n ? void say([`w-${f.id}`]) : void sfx("tap"))}
                >
                  <Pic name={f.pic} className="album-pic" />
                  <span className="album-name">{n ? f.name : "?"}</span>
                  {n > 1 && <span className="album-times">×{n}</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
      <div className="album-locked">
        {["Море", "Горы", "Город", "Космос"].map((w) => (
          <span key={w}>
            <IconLock /> {w}
          </span>
        ))}
      </div>
    </div>
  );
}

/** A gift in the album: new ones wait in a little box; a tap opens it, later taps make it spin. */
function AlbumGift({
  stopId,
  gift,
  name,
  resident,
  residentName,
  have,
  wrapped,
}: {
  stopId: string;
  gift: string;
  name: string;
  resident: string;
  residentName: string;
  have: boolean;
  wrapped: boolean;
}) {
  const [anim, setAnim] = useState<"" | "is-opening" | "is-spin">("");
  const [box, setBox] = useState(have && wrapped);
  const tap = () => {
    if (!have) return void sfx("tap");
    void vibrate(15);
    if (box) {
      openGift(gift);
      setAnim("is-opening");
      void sfx("fanfare", 0.7);
      window.setTimeout(() => setBox(false), 600);
    } else {
      setAnim("");
      requestAnimationFrame(() => setAnim("is-spin"));
      void sfx("star", 0.6);
    }
    void say([giftKey(stopId)]);
  };
  return (
    <button
      type="button"
      className={`album-slot ${have ? "is-have" : "is-empty"} ${box ? "is-wrapped" : ""} ${anim}`}
      aria-label={have ? (box ? `Подарок от ${residentName}: открыть` : name) : "Пока не найдено"}
      data-gift={gift}
      data-open-style={FOREST.findIndex((s) => s.id === stopId) % 3}
      onClick={tap}
      onAnimationEnd={(e) => {
        if (anim === "is-spin" && e.animationName === "gift-spin") setAnim("");
      }}
    >
      {box && <span className="album-new-badge">Новый</span>}
      <Pic name={gift} className="album-pic" />
      {box && (
        <span className="gift-box" aria-hidden>
          <Pic name="gift" />
        </span>
      )}
      <span className="album-name">{have ? (box ? "Открой!" : name) : "?"}</span>
      <Pic name={resident} className="album-from" />
    </button>
  );
}
