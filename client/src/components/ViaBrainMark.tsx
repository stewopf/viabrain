type ViaBrainMarkProps = {
  className?: string;
  title?: string;
};

/** Lime mark: code brackets around a neural node — code chat / repo intelligence. */
export function ViaBrainMark({
  className = "console-logo-mark",
  title = "VIA Project",
}: ViaBrainMarkProps) {
  return (
    <span className={className} aria-hidden>
      <svg
        viewBox="0 0 32 32"
        width="100%"
        height="100%"
        focusable="false"
      >
        <title>{title}</title>
        <rect width="32" height="32" rx="8" fill="currentColor" />
        <g
          fill="none"
          stroke="var(--opf-navy-deepest, #013065)"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11.5 8.5 7 16l4.5 7.5" />
          <path d="M20.5 8.5 25 16l-4.5 7.5" />
        </g>
        <circle cx="16" cy="16" r="3.35" fill="var(--opf-navy-deepest, #013065)" />
        <circle cx="16" cy="16" r="1.35" fill="currentColor" />
        <path
          d="M16 24.5V20.2"
          fill="none"
          stroke="var(--opf-navy-deepest, #013065)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
