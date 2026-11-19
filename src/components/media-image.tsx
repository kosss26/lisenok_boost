import { useEffect, useRef, useCallback, type ImgHTMLAttributes, type Ref } from "react";
const fallback =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240"><rect x="5" y="5" width="310" height="230" rx="30" fill="#eee8d5"/><path d="M70 165l55-55 35 35 35-48 60 68" fill="none" stroke="#a9ae91" stroke-width="12" stroke-linecap="round"/><circle cx="110" cy="75" r="16" fill="#a9ae91"/></svg>',
  );
export function MediaImage({
  src,
  ref,
  onLoad,
  onError,
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & { ref?: Ref<HTMLImageElement> }) {
  const local = useRef<HTMLImageElement | null>(null);
  const attach = useCallback(
    (node: HTMLImageElement | null) => {
      local.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );
  useEffect(() => {
    const img = local.current;
    if (!img) return;
    if (img.dataset.mediaError && img.dataset.retrySrc === src) return;
    delete img.dataset.mediaError;
    delete img.dataset.retrySrc;
    delete img.dataset.mediaSlow;
    if (img.complete && img.naturalWidth > 0) {
      delete img.dataset.mediaLoading;
      return;
    }
    img.dataset.mediaLoading = "1";
    const timer = window.setTimeout(() => {
      if (!img.complete) img.dataset.mediaSlow = "1";
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [src]);
  return (
    <img
      {...props}
      ref={attach}
      src={src}
      onLoad={(e) => {
        const img = e.currentTarget;
        delete img.dataset.mediaLoading;
        delete img.dataset.mediaSlow;
        if (img.getAttribute("src") !== fallback) {
          delete img.dataset.mediaError;
          delete img.dataset.retrySrc;
        }
        onLoad?.(e);
      }}
      onError={(e) => {
        const img = e.currentTarget;
        if (img.getAttribute("src") === fallback) return;
        img.dataset.retrySrc = src ?? "";
        img.dataset.mediaError = "1";
        delete img.dataset.mediaLoading;
        delete img.dataset.mediaSlow;
        img.src = fallback;
        onError?.(e);
      }}
    />
  );
}
