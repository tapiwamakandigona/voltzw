/** Small brand-consistent inline icons — replace the informal emoji
 *  (💡/🛠) in tip callouts. Decorative only, hence aria-hidden. */

const base = "mr-1.5 inline-block h-4 w-4 -translate-y-px align-middle";

export function BulbIcon() {
  return (
    <svg aria-hidden className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.3h6c0-.9.4-1.8 1-2.3A7 7 0 0 0 12 2z" />
    </svg>
  );
}

export function BoltIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={className ?? base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
    </svg>
  );
}

export function WrenchIcon() {
  return (
    <svg aria-hidden className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

export function WhatsAppIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
      <path d="M12 2a9.9 9.9 0 0 0-8.51 15.07L2 22l5.09-1.44A9.95 9.95 0 1 0 12 2Zm0 18.05a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.02.85.86-2.94-.2-.31A8.06 8.06 0 1 1 12 20.05Zm4.44-6.04c-.24-.12-1.43-.7-1.65-.79-.22-.08-.38-.12-.55.13-.16.24-.63.78-.77.94-.14.16-.28.18-.53.06a6.6 6.6 0 0 1-3.3-2.88c-.25-.43.25-.4.71-1.32.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.8-.2-.48-.4-.42-.55-.43h-.47c-.16 0-.42.06-.65.3-.22.24-.85.83-.85 2.02s.87 2.35 1 2.51c.12.16 1.72 2.62 4.16 3.68.58.25 1.03.4 1.39.51.58.19 1.11.16 1.53.1.47-.07 1.43-.58 1.63-1.15.2-.56.2-1.04.14-1.15-.06-.1-.22-.16-.47-.28Z" />
    </svg>
  );
}
