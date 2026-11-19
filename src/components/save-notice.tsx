import { useSaveWarning } from "../game/progress";
import { HoldButton } from "./kit";
import { openParents } from "./parents-state";
export function SaveNotice() {
  const warning = useSaveWarning();
  if (!warning) return null;
  return (
    <aside className="save-notice" role="status">
      <p>Сохранению нужна помощь взрослого.</p>
      <HoldButton
        label="Открыть восстановление (удерживайте)"
        className="text-action"
        onDone={openParents}
      >
        Для взрослых: удерживайте
      </HoldButton>
    </aside>
  );
}
