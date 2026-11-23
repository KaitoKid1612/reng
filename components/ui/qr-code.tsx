import { encode } from "uqr";

interface QrCodeProps {
  text: string;
  label: string;
  className?: string;
}

// One path of unit squares: a crisp code at any size, black on white whatever the theme, since
// phone cameras read dark modules on a light ground best. Low error correction keeps the modules
// large: a code on a shared screen is blurred by the video call, never scratched. No hooks, so a
// server page (the printed exam) draws it too.
export function QrCode({ text, label, className = "slide-qr-code" }: QrCodeProps) {
  const { data, size } = encode(text, { ecc: "L", border: 2 });
  const parts: string[] = [];
  data.forEach((row, y) =>
    row.forEach((isDark, x) => {
      if (isDark) {
        parts.push(`M${x} ${y}h1v1h-1z`);
      }
    }),
  );
  return (
    <svg
      className={className}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <rect width={size} height={size} fill="#fff" />
      <path d={parts.join("")} fill="#000" />
    </svg>
  );
}
