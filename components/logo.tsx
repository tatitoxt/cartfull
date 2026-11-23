export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#A8E24B" />
      <path
        d="M7 9h2.6l2.3 10.2a1.6 1.6 0 0 0 1.56 1.25h7.9a1.6 1.6 0 0 0 1.55-1.2L24.6 12.5H11"
        fill="none"
        stroke="#141A06"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="14.2" cy="24" r="1.6" fill="#141A06" />
      <circle cx="21" cy="24" r="1.6" fill="#141A06" />
      <path d="M17.6 9.6c0-2.3 1.7-3.9 4.1-3.9 0 2.4-1.7 3.9-4.1 3.9Z" fill="#F3F4F6" />
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
