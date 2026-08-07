import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — CineX" },
      { name: "description", content: "Sign in to your CineX creative, backer or gatekeeper workspace." },
      { property: "og:title", content: "Log in — CineX" },
      { property: "og:description", content: "Access your CineX workspace." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login } = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-bold">Welcome back</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter the email tied to your CineX account.
      </p>

      <form
        className="panel mt-8 space-y-5 p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          if (!/^\S+@\S+\.\S+$/.test(email)) {
            setError("Enter a valid email address");
            return;
          }
          setLoading(true);
          try {
            const ok = await login(email.trim());
            if (!ok) {
              setError("No account found with that email. Try registering instead.");
              return;
            }
            toast.success("Signed in to CineX");
            navigate({ to: "/dashboard" });
          } finally {
            setLoading(false);
          }
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@studio.africa"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <Button type="submit" className="w-full rounded-full" disabled={loading}>
          {loading ? "Signing in…" : "Log in"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Demo accounts: amara@cinex.africa · thabo@cinex.africa · fatou@cinex.africa
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to CineX?{" "}
        <Link to="/register" className="text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
