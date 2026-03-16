import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Ban,
  Pause,
  PauseCircle,
  Send,
  Search,
  Mail,
  BarChart3,
  FileText,
  ArrowRightLeft,
  Moon,
  Sun,
  Menu,
  Zap,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

const navGroups = [
  {
    label: "Overview",
    items: [
      { to: "/", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/metrics", icon: BarChart3, label: "Metrics" },
    ],
  },
  {
    label: "Delivery",
    items: [
      { to: "/bounce", icon: Ban, label: "Bounces" },
      { to: "/suspend", icon: Pause, label: "Suspensions" },
      { to: "/suspend-ready-q", icon: PauseCircle, label: "Ready Q Suspend" },
      { to: "/rebind", icon: ArrowRightLeft, label: "Rebind" },
    ],
  },
  {
    label: "Messages",
    items: [
      { to: "/inject", icon: Send, label: "Inject" },
      { to: "/queues", icon: Search, label: "Queue Inspect" },
      { to: "/queue-summary", icon: Layers, label: "Queue Summary" },
      { to: "/messages", icon: Mail, label: "Message Inspect" },
    ],
  },
  {
    label: "Diagnostics",
    items: [
      { to: "/trace-smtp-client", icon: ArrowUpRight, label: "Trace Client" },
      { to: "/trace-smtp-server", icon: ArrowDownLeft, label: "Trace Server" },
      { to: "/log-filter", icon: FileText, label: "Log Filter" },
    ],
  },
];

export function Layout() {
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Zap className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-base font-semibold tracking-tight">KumoMTA</h1>
          <p className="text-[11px] text-muted-foreground font-medium">Admin Console</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-auto px-3 py-2 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-primary/10 text-primary shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground font-medium">v1.0.0</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDark(!dark)}>
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-60 flex-col border-r bg-card/50 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-60 flex flex-col bg-card border-r shadow-xl z-50 animate-fade-in">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center gap-3 h-14 px-4 lg:px-6 border-b bg-card/50 shrink-0">
          <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs text-muted-foreground font-medium">Connected</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl p-4 lg:p-6 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
