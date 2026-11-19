import { useNavigate } from "@tanstack/react-router";
import {
  useImageFailures,
  useSlowImages,
  useAudioIssue,
  retryImages,
  clearAudioIssue,
} from "../game/media";
export function MediaNotice() {
  const failed = useImageFailures(),
    slow = useSlowImages(),
    audio = useAudioIssue(),
    navigate = useNavigate();
  if (!failed && !slow && !audio) return null;
  return (
    <aside className="media-notice" role="status">
      <p>
        {failed
          ? "Картинка не загрузилась. Попробуем ещё раз?"
          : slow
            ? "Загружаем картинки. Ещё немного подождём…"
            : audio}
      </p>
      {(failed > 0 || slow > 0) && (
        <>
          <button type="button" className="text-action" onClick={retryImages}>
            Загрузить ещё раз
          </button>
          <button
            type="button"
            className="text-action"
            onClick={() => void navigate({ to: "/map" })}
          >
            На карту
          </button>
        </>
      )}
      {!failed && !slow && (
        <button type="button" className="text-action" onClick={clearAudioIssue}>
          Понятно
        </button>
      )}
    </aside>
  );
}
