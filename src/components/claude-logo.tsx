export function ClaudeLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M9.5 22L14.2 9h2.6L21.5 22h-2.5l-1.05-3h-4.9L12 22H9.5zm4.3-5h3.4L15.5 12l-1.7 5z"
        fill="currentColor"
      />
      <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="1.5" opacity="0.15" />
    </svg>
  );
}
