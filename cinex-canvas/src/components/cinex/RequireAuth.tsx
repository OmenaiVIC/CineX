import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { LoadingSpinner } from "@/components/cinex/ui-kit";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/cinex-types";

export function RequireAuth({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user, hydrated } = useStore();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      navigate({ to: "/login", replace: true });
      return;
    }
    setChecked(true);
  }, [hydrated, user, navigate]);

  if (!hydrated || !checked || !user) return <LoadingSpinner label="Preparing your workspace" />;

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="panel mx-auto max-w-md p-8 text-center">
        <h2 className="font-display text-xl font-semibold">Not available for {user.role}s</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This workspace is reserved for {roles.join(" and ")} accounts.
        </p>
        <Button className="mt-5 rounded-full" asChild>
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
