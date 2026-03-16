export function Badge({ children, variant = "default", className = "" }: { children: React.ReactNode; variant?: "default" | "secondary" | "destructive" | "outline"; className?: string }) {
  const base = "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
  const variants: Record<string, string> = {
    default: "border-transparent bg-primary text-primary-foreground shadow",
    secondary: "border-transparent bg-secondary text-secondary-foreground",
    destructive: "border-transparent bg-destructive text-destructive-foreground shadow",
    outline: "text-foreground",
  };
  return <span className={`${base} ${variants[variant]} ${className}`}>{children}</span>;
}
