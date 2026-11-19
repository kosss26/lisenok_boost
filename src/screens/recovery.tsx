import { Link } from "@tanstack/react-router";
import { Fox } from "../components/kit";
export function NotFound() {
  return (
    <div className="recovery-screen">
      <Fox pose="think" />
      <h1>Здесь тропинка заканчивается</h1>
      <p>Вернёмся на карту и выберем приключение.</p>
      <Link to="/map" className="big-btn">
        На карту
      </Link>
    </div>
  );
}
export function RouteError({ reset }: { reset: () => void }) {
  return (
    <div className="recovery-screen">
      <Fox pose="think" />
      <h1>Не получилось открыть полянку</h1>
      <p>Можно попробовать ещё раз или вернуться на карту.</p>
      <button
        className="big-btn"
        type="button"
        onClick={() => {
          reset();
          window.location.reload();
        }}
      >
        Попробовать снова
      </button>
      <a className="text-action" href="/map">
        На карту
      </a>
    </div>
  );
}
