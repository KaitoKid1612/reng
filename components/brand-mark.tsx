interface BrandMarkProps {
  className?: string;
}

// The Reng mark: a school hand bell ringing on a classroom board. Colours come from CSS
// tokens; app/icon.svg and the generated share images repeat the same drawing in hex.
export function BrandMark({ className }: BrandMarkProps) {
  return (
    <svg
      className={className ? `brand-mark ${className}` : "brand-mark"}
      viewBox="0 0 64 64"
      width="40"
      height="40"
      aria-hidden="true"
      focusable="false"
    >
      <rect className="brand-mark-board" x="2" y="2" width="60" height="60" rx="15" />
      <g transform="rotate(-11 32 29)">
        <g className="brand-mark-handle">
          <rect x="28.4" y="8.5" width="7.2" height="11.5" rx="3.6" />
          <rect x="26.6" y="18.6" width="10.8" height="3.8" rx="1.6" />
        </g>
        <g className="brand-mark-bell">
          <path d="M26 22h12c0 5 1.2 9.8 3.7 13.6 1.6 2.5 3.6 4.5 6 6.2h-31.4c2.4-1.7 4.4-3.7 6-6.2 2.5-3.8 3.7-8.6 3.7-13.6z" />
          <rect x="13.4" y="40.8" width="37.2" height="4.8" rx="2.4" />
        </g>
      </g>
      {/* The clapper swings away from the tilted bell: the bell is ringing. */}
      <circle className="brand-mark-bell" cx="37" cy="50" r="3.5" />
    </svg>
  );
}
