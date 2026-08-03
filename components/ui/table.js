import { cn } from "@/lib/cn";

export function Table({ className, ...props }) {
  return (
    <div className="relative w-full overflow-x-auto">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

export function THead({ className, ...props }) {
  return <thead className={cn("[&_tr]:border-b", className)} {...props} />;
}

export function TBody({ className, ...props }) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TR({ className, ...props }) {
  return (
    <tr className={cn("border-b border-stone-200 transition-colors hover:bg-stone-50", className)} {...props} />
  );
}

export function TH({ className, ...props }) {
  return (
    <th className={cn("h-10 px-3 text-left align-middle text-xs font-medium uppercase tracking-wide text-stone-500", className)} {...props} />
  );
}

export function TD({ className, ...props }) {
  return <td className={cn("px-3 py-2.5 align-middle", className)} {...props} />;
}
