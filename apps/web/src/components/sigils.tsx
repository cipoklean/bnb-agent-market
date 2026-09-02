// Sigils — the grimoire mark system. Hand-drawn geometry (inline SVG, stroke
// via currentColor, one shared 24-grid) so every mark reads as one alphabet.
// Scope discipline: status, categories, brand, and separators ONLY — buttons,
// inputs, and nav stay geometrically plain.
import type { ReactNode } from "react";
import type { SVGProps } from "react";

type SigilProps = SVGProps<SVGSVGElement> & { size?: number };

function SigilSvg({ size = 16, children, ...rest }: SigilProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Verified — a stamped wax seal: ring, pip, radiating ticks. */
export function SigilSeal({ size, ...rest }: SigilProps) {
  return (
    <SigilSvg size={size} {...rest}>
      <circle cx="12" cy="12" r="9.2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7" />
    </SigilSvg>
  );
}

/** Brand mark — a sealed ring with a diamond at its heart. */
export function SigilMark({ size, ...rest }: SigilProps) {
  return (
    <SigilSvg size={size} {...rest}>
      <circle cx="12" cy="12" r="9.4" />
      <path d="M12 7.2L16.8 12 12 16.8 7.2 12z" />
    </SigilSvg>
  );
}

/** Rebalancing — the balance scale. */
export function SigilRebalance({ size, ...rest }: SigilProps) {
  return (
    <SigilSvg size={size} {...rest}>
      <path d="M12 4.5v14.5M8.6 19h6.8M5.2 7h13.6" />
      <path d="M5.2 7l-2.4 5.2M5.2 7l2.4 5.2M18.8 7l-2.4 5.2M18.8 7l2.4 5.2" />
      <path d="M2.2 12.6a3 3 0 0 0 6 0M15.8 12.6a3 3 0 0 0 6 0" />
    </SigilSvg>
  );
}

/** Grid trading — the warded circle: cross over diagonal cross. */
export function SigilGrid({ size, ...rest }: SigilProps) {
  return (
    <SigilSvg size={size} {...rest}>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 3.6v16.8M3.6 12h16.8M6.3 6.3l11.4 11.4M17.7 6.3L6.3 17.7" />
    </SigilSvg>
  );
}

/** Yield — an ascending stroke held inside a ring. */
export function SigilYield({ size, ...rest }: SigilProps) {
  return (
    <SigilSvg size={size} {...rest}>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M7.8 14.8l6.4-6.4M11 8.4h3.2v3.2" />
    </SigilSvg>
  );
}

/** Health factor — a shield bearing a rune. */
export function SigilHealth({ size, ...rest }: SigilProps) {
  return (
    <SigilSvg size={size} {...rest}>
      <path d="M12 3.4l6.8 2.6v5.2c0 4.5-2.9 7.6-6.8 9.4-3.9-1.8-6.8-4.9-6.8-9.4V6z" />
      <path d="M12 8.2v7.6M9.6 10.6h4.8" />
    </SigilSvg>
  );
}

/** Live — the glowing rune-dot; the only looping motion in the product. */
export function SigilLive({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="rune-dot" />
      {label && <span>{label}</span>}
    </span>
  );
}

/** Metadata separator — a small gold diamond replacing dot-joined strings. */
export function SigilSep() {
  return (
    <span aria-hidden className="mx-1.5 inline-block h-[3px] w-[3px] rotate-45 bg-gold/70" />
  );
}

/** Section divider — bronze hairlines meeting at a gold diamond. */
export function SigilDivider({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`flex items-center gap-2.5 ${className}`}>
      <span className="h-px flex-1 bg-bronze/45" />
      <span className="inline-block h-[5px] w-[5px] rotate-45 bg-gold/80" />
      <span className="h-px flex-1 bg-bronze/45" />
    </div>
  );
}
