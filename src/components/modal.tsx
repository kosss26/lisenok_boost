import type { ReactNode } from "react";
import { useModal } from "../game/modal";

export function Modal({
  children,
  className,
  label,
  onClose,
}: {
  children: ReactNode;
  className: string;
  label: string;
  onClose?: () => void;
}) {
  const ref = useModal(onClose);
  return (
    <div
      ref={ref}
      tabIndex={-1}
      className={className}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      {children}
    </div>
  );
}
