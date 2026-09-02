import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Coins, Milestone, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { formatUSD } from "@/components/cinex/ui-kit";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CineX — Milestone financing for Africa's creative economy" },
      {
        name: "description",
        content:
          "Verified African creatives raise capital from global backers. Gatekeeper trust, productive escrow, and milestone-gated releases in NGN and USDCx.",
      },
      { property: "og:title", content: "CineX — Milestone financing for African creatives" },
      {
        property: "og:description",
        content:
          "Community trust replaces credit checks. Capital releases milestone by milestone, paid out in local currency.",
      },
    ],
  }),
  component: Landing,
});

const STEPS = [
  {
    icon: ShieldCheck,
    title: "Trust verification",
    body: "Get a Verified badge as a creative as well have an established industry gatekeeper vouch for your creator's identity and project before any capital is raised.",
  },
  {
    icon: Coins,
    title: "Productive escrow",
    body: "Backers fund in USD. Capital earns yield in credible Bitcoin DeFi protocols while it waits to be deployed.",
  },
  {
    icon: Milestone,
    title: "Milestone-gated release",
    body: "Each deliverable is verified by backers. The next tranche unlocks automatically; unspent capital stays protected.",
  },
  {
    icon: Wallet,
    title: "Frictionless payout",
    body: "Creatives receive milestone payouts in NGN through a dual-currency wallet. No gas fees, no crypto complexity.",
  },
];

function Landing() {
  const { campaigns, user } = useStore();

  return (
    <div>
      <section className="hero-gradient relative overflow-hidden border-b border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="mb-5 inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Africa's creative economy
          </p>
          <h1 className="max-w-3xl font-display text-4xl font-bold leading-[1.05] sm:text-6xl">
            Financing that unlocks <span className="mint-gradient-text">milestone by milestone</span>
          </h1>
          <p className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
            CineX replaces credit checks with community trust and smart contracts — so verified creatives get
            funded, and global backers stay protected.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="glow rounded-full" asChild>
              <Link to={user ? "/dashboard" : "/register"}>
                {user ? "Go to dashboard" : "Create your account"}
              </Link>
            </Button>
            <Button size="lg" variant="secondary" className="rounded-full" asChild>
              <Link to="/discover">Explore campaigns</Link>
            </Button>
          </div>

          <dl className="mt-16 grid grid-cols-2 gap-6 sm:max-w-2xl sm:grid-cols-4">
            {[
              ["Prototype", "Reference Status"],
              ["19", "Logic Contracts"],
              ["34+", "Community Conversations"],
              ["Past", "Non-Dilutive Grants"],
            ].map(([v, l]) => (
              <div key={l}>
                <dt className="font-display text-2xl font-bold text-primary">{v}</dt>
                <dd className="text-xs text-muted-foreground">{l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">How the flow works</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="panel p-6">
              <s.icon className="h-6 w-6 text-primary" />
              <p className="mt-4 text-xs text-muted-foreground">Step {i + 1}</p>
              <h3 className="mt-1 font-display text-base font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            Demo campaigns <span className="text-xs font-semibold uppercase tracking-wide text-primary">— sample data, not live</span>
          </h2>
          <Link to="/discover" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.slice(0, 3).map((c) => (
            <Link
              key={c.id}
              to="/campaign/$id"
              params={{ id: c.id }}
              className="panel overflow-hidden transition-transform hover:-translate-y-1"
            >
              <div className={`h-28 bg-linear-to-br ${c.coverTone}`} />
              <div className="p-5">
                <p className="text-xs text-muted-foreground">
                  {c.category} · {c.creatorName}
                </p>
                <h3 className="mt-1 font-display text-base font-semibold">{c.title}</h3>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, (c.raised / c.fundingTarget) * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatUSD(c.raised)} of {formatUSD(c.fundingTarget)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
