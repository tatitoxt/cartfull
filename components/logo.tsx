export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true">
      <rect width="512" height="512" rx="132" fill="#A8E24B" />
      <path
        d="M112 146h42l38 171a26 26 0 0 0 25 19.5h129a26 26 0 0 0 25-19.5l28.5-113.5H186"
        fill="none"
        stroke="#141A06"
        strokeWidth="34"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="231" cy="392" r="26" fill="#141A06" />
      <circle cx="340" cy="392" r="26" fill="#141A06" />
      <path d="M292 156c0-38 28-65 67-65 0 39-28 65-67 65Z" fill="#2E4A06" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark />
      <span className="font-display text-[1.35rem] font-semibold tracking-tight text-fg">Cartfull</span>
    </span>
  );
}
