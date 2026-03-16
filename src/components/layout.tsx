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
  Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

const navGroups = [
  {
    label: "Overview",
    items: [
      { to: "/", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/top", icon: Gauge, label: "Live Top" },
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
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border/50">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#FFA724] to-[#FF8C00] text-white shadow-md shadow-[#FFA724]/20">
          <Zap className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-[#FFA724] to-[#FF8C00] bg-clip-text text-transparent">KumoMTA</h1>
          <p className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase">Admin Console</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-auto px-3 py-4 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-[#FFA724]/15 to-[#FFA724]/5 text-[#FFA724] shadow-sm border border-[#FFA724]/20"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
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
      <div className="px-4 py-3 border-t border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-[11px] text-muted-foreground font-medium">v1.0.0</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent" onClick={() => setDark(!dark)}>
            {dark ? <Sun className="h-4 w-4 text-[#FFA724]" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground/50 text-center mt-2">Made by <span className="font-semibold text-[#FFA724]/70">Enjoys</span></p>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-[250px] flex-col border-r bg-card/80 backdrop-blur-sm shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-[250px] flex flex-col bg-card border-r shadow-2xl z-50 animate-fade-in">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center gap-3 h-14 px-4 lg:px-6 border-b bg-card/60 backdrop-blur-sm shrink-0">
          <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 border border-success/20">
              <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[11px] text-success font-semibold">Connected</span>
            </div>
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
