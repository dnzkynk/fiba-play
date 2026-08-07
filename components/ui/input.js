import { cn } from "@/lib/cn";

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        "flex h-9 w-full rounded-md border border-stone-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fiba-400 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        "flex h-9 w-full rounded-md border border-stone-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fiba-400",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        "flex min-h-24 w-full rounded-md border border-stone-300 bg-white px-3 py-2 font-mono text-xs shadow-sm placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fiba-400",
        className
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }) {
  return (
    <label className={cn("text-xs font-medium text-stone-600", className)} {...props} />
  );
}
