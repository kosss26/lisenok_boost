import { useRouterState } from "@tanstack/react-router";
import { applyUpdate, useUpdateReady } from "../game/offline";
export function UpdateNotice() {
  const ready = useUpdateReady();
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (!ready || !["/", "/map", "/forest", "/practice", "/album"].includes(path)) return null;
  return (
    <aside className="update-notice" role="status">
      <span>Готова новая версия. Прогресс сохранён.</span>
      <button type="button" onClick={applyUpdate}>
        Обновить игру
      </button>
    </aside>
  );
}
