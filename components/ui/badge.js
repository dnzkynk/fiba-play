import { cva } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-fiba-600 text-white",
        secondary: "border-transparent bg-stone-100 text-stone-600",
        success: "border-transparent bg-emerald-100 text-emerald-800",
        warning: "border-transparent bg-amber-100 text-amber-800",
        info: "border-transparent bg-sky-100 text-sky-800",
        destructive: "border-transparent bg-red-100 text-red-800",
        outline: "border-stone-300 text-stone-600",
      },
    },
    defaultVariants: { variant: "secondary" },
  }
);

// Maç/turnuva durumlarını rozet varyantına eşler
export const STATUS_VARIANT = {
  pending: "secondary",
  scheduled: "info",
  live: "warning",
  done: "success",
  draft: "secondary",
  drawn: "info",
  running: "warning",
  finished: "success",
};

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
