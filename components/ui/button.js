import { cva } from "class-variance-authority";
import { cn } from "@/lib/cn";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fiba-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer no-underline",
  {
    variants: {
      variant: {
        default: "bg-fiba-600 text-white shadow-sm hover:bg-fiba-700",
        outline: "border border-stone-300 bg-white text-stone-900 shadow-sm hover:border-fiba-300 hover:bg-fiba-50 hover:text-fiba-700",
        secondary: "bg-fiba-50 text-fiba-700 hover:bg-fiba-100",
        destructive: "border border-red-200 bg-white text-red-700 shadow-sm hover:bg-red-50",
        ghost: "text-stone-600 hover:bg-fiba-50 hover:text-fiba-700",
        accent: "bg-amber-500 text-white shadow-sm hover:bg-amber-600",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-6",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export function Button({ className, variant, size, ...props }) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
