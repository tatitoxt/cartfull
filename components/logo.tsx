export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true">
      <defs>
        <linearGradient id="cf-lime" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#D8FF7A" />
          <stop offset="1" stopColor="#8FD12F" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="132" fill="#101206" />
      <g transform="rotate(-26 214 128)">
        <rect x="192" y="58" width="44" height="150" rx="22" fill="#E8B96A" />
      </g>
      <g transform="rotate(24 318 148)">
        <path d="M318 96c14 0 22 10 20 24l-10 62c-2 12-18 12-20 0l-10-62c-2-14 6-24 20-24Z" fill="#FF8A3D" />
        <path d="M318 96c-2-10-8-18-16-24M318 96c0-12 2-20 8-26M318 96c4-10 10-16 18-20" fill="none" stroke="#5DA93B" strokeWidth="7" strokeLinecap="round" />
      </g>
      <circle cx="382" cy="158" r="27" fill="#FF6B6B" />
      <path d="M110 146h42l20 30" fill="none" stroke="url(#cf-lime)" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M164 194h232l-28 120a26 26 0 0 1-25 20H207a26 26 0 0 1-25-20Z"
        fill="url(#cf-lime)"
        stroke="url(#cf-lime)"
        strokeWidth="10"
        strokeLinejoin="round"
      />
      <circle cx="234" cy="384" r="30" fill="#B28DFF" />
      <circle cx="344" cy="384" r="30" fill="#B28DFF" />
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
