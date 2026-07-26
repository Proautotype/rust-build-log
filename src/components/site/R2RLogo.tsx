/** Right2Read wordmark / avatar mark. */
export function R2RLogo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground font-display font-bold ring-1 ring-primary/40 shadow-sm ${className}`}
      aria-label="Right2Read"
    >
      <svg viewBox="0 0 32 32" className="h-4/5 w-4/5" fill="none">
        <text
          x="50%"
          y="55%"
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="ui-sans-serif, system-ui"
          fontWeight="800"
          fontSize="13"
          fill="currentColor"
          letterSpacing="-0.5"
        >
          R2R
        </text>
      </svg>
    </span>
  );
}
