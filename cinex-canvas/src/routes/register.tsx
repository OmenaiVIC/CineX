import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/cinex-types";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create your CineX account" },
      {
        name: "description",
        content: "Register as a creative or backer on CineX milestone financing.",
      },
      { property: "og:title", content: "Create your CineX account" },
      {
        property: "og:description",
        content: "Join CineX as a creative or backer.",
      },
    ],
  }),
  component: RegisterPage,
});

const ROLES: { role: Role; blurb: string; disabled?: boolean }[] = [
  { role: "Creative", blurb: "Raise milestone-gated capital for your project." },
  { role: "Backer", blurb: "Fund verified projects and vote on deliverables." },
  { role: "Gatekeeper", blurb: "Vouch for creatives from your guild or industry body.", disabled: true },
];

function RegisterPage() {
  const { register } = useStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", role: "Creative" as Role });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-bold">Join CineX</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Trust-first financing for Africa's creative economy.
      </p>

      <form
        className="panel mt-8 space-y-5 p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          const errs: Record<string, string> = {};
          if (!form.name.trim()) errs["name"] = "Name is required";
          if (!/^\S+@\S+\.\S+$/.test(form.email)) errs["email"] = "Enter a valid email address";
          setErrors(errs);
          if (Object.keys(errs).length) return;
          setLoading(true);
          try {
            const ok = await register({
              name: form.name.trim(),
              email: form.email.trim(),
              role: form.role,
            });
            if (!ok) {
              setErrors({ email: "That email is already registered. Try logging in." });
              return;
            }
            toast.success(`Welcome to CineX, ${form.name.split(" ")[0]}`);
            navigate({ to: "/dashboard" });
          } finally {
            setLoading(false);
          }
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Amara Okonkwo"
          />
          {errors["name"] && <p className="text-xs text-destructive">{errors["name"]}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@studio.africa"
          />
          {errors["email"] && <p className="text-xs text-destructive">{errors["email"]}</p>}
        </div>

        <div className="space-y-2">
          <Label>I am a…</Label>
          <div className="grid gap-2">
            {ROLES.map((r) => {
              const active = form.role === r.role;
              return (
                <button
                  key={r.role}
                  type="button"
                  disabled={r.disabled}
                  onClick={() => setForm({ ...form, role: r.role })}
                  className={`rounded-2xl border p-3 text-left transition-colors ${
                    r.disabled
                      ? "cursor-not-allowed border-border opacity-60"
                      : active
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-secondary/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{r.role}</p>
                    {r.disabled && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        Coming soon
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{r.blurb}</p>
                </button>
              );
            })}
          </div>
        </div>

        <Button type="submit" className="w-full rounded-full" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link to="/login" className="text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
