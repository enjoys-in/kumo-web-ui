export function Badge({ children, variant = "default", className = "" }: { children: React.ReactNode; variant?: "default" | "secondary" | "destructive" | "outline"; className?: string }) {
  const base = "inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:ring-offset-1";
  const variants: Record<string, string> = {
    default: "border-transparent bg-primary/90 text-primary-foreground shadow-sm shadow-primary/15",
    secondary: "border-transparent bg-secondary/80 text-secondary-foreground backdrop-blur-sm",
    destructive: "border-transparent bg-destructive/90 text-destructive-foreground shadow-sm shadow-destructive/15",
    outline: "text-foreground border-border/60 bg-background/50 backdrop-blur-sm",
  };
  return <span className={`${base} ${variants[variant]} ${className}`}>{children}</span>;
}
