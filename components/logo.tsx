export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true">
      <rect width="512" height="512" rx="132" fill="#A8E24B" />
      <path d="M268 212c4-52 44-88 96-88 0 54-40 88-96 88Z" fill="#2E4A06" />
      <path
        d="M96 158h46l40 178a28 28 0 0 0 27 21h122a28 28 0 0 0 27-21l32-124H182"
        fill="none"
        stroke="#141A06"
        strokeWidth="36"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="229" cy="404" r="27" fill="#141A06" />
      <circle cx="331" cy="404" r="27" fill="#141A06" />
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
