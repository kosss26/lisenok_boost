import { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { getActiveProfile, getProfiles, switchProfile, useProfileLabel } from "../game/progress";
import { stopVoice } from "../game/audio";
import { Modal } from "./modal";
export function ProfileChip() {
  const label = useProfileLabel(),
    navigate = useNavigate();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="profile-chip"
        aria-label={`Профиль: ${label}. Сменить игрока`}
        onClick={() => setOpen(true)}
      >
        <span aria-hidden>☺</span> {label}
      </button>
      {open &&
        createPortal(
          <Modal className="lesson-switch" label="Кто играет?" onClose={() => setOpen(false)}>
            <div className="lesson-switch-card">
              <h2>Кто играет?</h2>
              <p>У каждого — свои звёзды и своё занятие.</p>
              {getProfiles().map((p) => (
                <button
                  type="button"
                  className="profile-choice"
                  key={p.id}
                  aria-pressed={p.id === getActiveProfile()}
                  onClick={() => {
                    stopVoice();
                    setOpen(false);
                    void navigate({ to: "/" }).then(() => switchProfile(p.id));
                  }}
                >
                  {p.label}
                  {p.id === getActiveProfile() ? " ✓" : ""}
                </button>
              ))}
              <button type="button" className="text-action" onClick={() => setOpen(false)}>
                Назад
              </button>
              <small>Добавить игрока можно в разделе для взрослых.</small>
            </div>
          </Modal>,
          document.querySelector(".app") ?? document.body,
        )}
    </>
  );
}
