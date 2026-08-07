import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/cinex-types";

const NAV: { to: string; label: string; roles: Role[] | "all" }[] = [
  { to: "/dashboard", label: "Dashboard", roles: "all" },
  { to: "/discover", label: "Discover", roles: ["Backer", "Gatekeeper", "Creative"] },
  { to: "/profile", label: "Profile", roles: "all" },
  { to: "/create-campaign", label: "Create campaign", roles: ["Creative"] },
  { to: "/endorse", label: "Become an Endorser", roles: "all" },
];

export function Header() {
  const { user, logout } = useStore();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const links = NAV.filter((n) => n.roles === "all" || (user && n.roles.includes(user.role)));

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary font-display text-sm font-bold text-primary-foreground">
            C
          </span>
          <span className="font-display text-lg font-bold tracking-tight">CineX</span>
        </Link>

        {user && (
          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                  pathname === l.to
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="ml-auto hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <span className="text-sm text-muted-foreground">{user.name}</span>
              <Button variant="ghost" size="sm" className="rounded-full" onClick={logout} asChild={false}>
                <span className="flex items-center gap-1.5">
                  <LogOut className="h-4 w-4" /> Sign out
                </span>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="rounded-full" asChild>
                <Link to="/login">Log in</Link>
              </Button>
              <Button size="sm" className="rounded-full" asChild>
                <Link to="/register">Get started</Link>
              </Button>
            </>
          )}
        </div>

        <button
          className="ml-auto rounded-full p-2 text-muted-foreground md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle navigation"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/70 bg-background px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {(user ? links : []).map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
            {user ? (
              <button
                onClick={() => {
                  logout();
                  setOpen(false);
                }}
                className="rounded-xl px-3 py-2 text-left text-sm text-muted-foreground hover:bg-secondary"
              >
                Sign out
              </button>
            ) : (
              <div className="flex gap-2 pt-1">
                <Button variant="secondary" className="flex-1 rounded-full" asChild>
                  <Link to="/login" onClick={() => setOpen(false)}>
                    Log in
                  </Link>
                </Button>
                <Button className="flex-1 rounded-full" asChild>
                  <Link to="/register" onClick={() => setOpen(false)}>
                    Get started
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>© {new Date().getFullYear()} CineX — milestone financing for Africa's creative economy.</p>
        <p className="text-xs">Funds held in productive escrow. Payouts settle in local currency.</p>
      </div>
    </footer>
  );
}
