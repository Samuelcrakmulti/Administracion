import { cn } from '@/lib/utils';

export function Logo({
  className,
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-700 shadow-soft">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5 text-white"
          aria-hidden="true"
        >
          <path
            d="M12 2L3 7v10l9 5 9-5V7l-9-5z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M8 10.5l4 2.5 4-2.5M12 13v6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {showText && (
        <span className="text-lg font-bold tracking-tight text-slate-900">
          NexoPyme<span className="text-primary"> AI</span>
        </span>
      )}
    </div>
  );
}
