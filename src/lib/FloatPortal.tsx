import * as React from "react";
import { createPortal } from "react-dom";

/** Renders children into document.body so overflow:hidden ancestors cannot clip them. */
export function FloatPortal({
  open,
  mounted,
  style,
  theme,
  panelRef,
  className,
  children,
  ...rest
}: {
  open: boolean;
  mounted: boolean;
  style: React.CSSProperties;
  theme?: string;
  panelRef?: React.Ref<HTMLDivElement>;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  if (!mounted || !open) return null;
  return createPortal(
    <div ref={panelRef} data-theme={theme} style={style} className={className} {...rest}>
      {children}
    </div>,
    document.body,
  );
}
