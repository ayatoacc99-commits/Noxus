export function NoxusLogo({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="noxus-grad" x1="0" y1="0" x2="40" y2="40">
          <stop stopColor="#4F46E5" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill="url(#noxus-grad)" />
      <path
        d="M20 8L30 14V26L20 32L10 26V14L20 8Z"
        stroke="white"
        strokeWidth="2"
        fill="none"
        strokeLinejoin="round"
      />
      <path d="M20 14L25 17V23L20 26L15 23V17L20 14Z" fill="white" fillOpacity="0.9" />
    </svg>
  );
}
