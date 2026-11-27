import { cn } from "@/lib/utils";

const variants = {
  default: "bg-muted text-foreground",
  positive: "bg-emerald-500/15 text-emerald-400",
  negative: "bg-red-500/15 text-red-400",
};

export function Badge({
  variant = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof variants }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium", variants[variant], className)}
      {...props}
    />
  );
}
