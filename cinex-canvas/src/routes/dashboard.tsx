import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowDownToLine, ArrowUpRight, Plus, Vote } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/cinex/RequireAuth";
import { ProjectThumb } from "@/components/cinex/ProjectThumb";
import {
  CardSkeleton,
  PageHeader,
  Panel,
  StatusPill,
  TierBadge,
  formatNGN,
  formatUSD,
  formatDate,
} from "@/components/cinex/ui-kit";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { thumbnailForCampaign } from "@/lib/thumbnails";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — CineX" },
      {
        name: "description",
        content: "Track your CineX wallet balances, escrow disbursements and live campaign milestones.",
      },
      { property: "og:title", content: "Dashboard — CineX" },
      { property: "og:description", content: "Wallet balances, disbursements and milestone progress." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <DashboardPage />
    </RequireAuth>
  ),
});

function DashboardPage() {
  const { user, wallet, campaigns, addTransaction } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, []);

  if (!user) return null;
  const isCreative = user.role === "Creative";
  const myCampaigns = isCreative
    ? campaigns.filter((c) => c.creatorId === user.id)
    : campaigns.filter((c) => c.contributions.some((cc) => cc.userId === user.id));

  const needsVote = campaigns.flatMap((c) =>
    c.milestones
      .filter(
        (m) =>
          m.status !== "Released" &&
          c.contributions.some((cc) => cc.userId === user.id) &&
          m.voters[user.id] === undefined,
      )
      .map((m) => ({ campaign: c, milestone: m })),
  );

  const totalBacked = user.role === "Backer"
    ? campaigns
        .filter((c) => c.contributions.some((cc) => cc.userId === user.id))
        .flatMap((c) => c.contributions.filter((cc) => cc.userId === user.id))
        .reduce((sum, cc) => sum + cc.amount, 0)
    : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow={`${user.role} workspace`}
        title={`Hello, ${user.name.split(" ")[0]}`}
        subtitle="Your escrow, disbursements and milestone activity in one place."
        action={
          user.role === "Creative" ? (
            <Button className="rounded-full" asChild>
              <Link to="/create-campaign">
                <Plus className="mr-1.5 h-4 w-4" /> New campaign
              </Link>
            </Button>
          ) : (
            <Button variant="secondary" className="rounded-full" asChild>
              <Link to="/discover">Discover campaigns</Link>
            </Button>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Dual-currency wallet</p>
              <p className="mt-3 font-display text-3xl font-bold">{formatNGN(wallet.ngnBalance)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {wallet.usdcxBalance.toLocaleString("en-US", { maximumFractionDigits: 2 })} USDCx in escrow
              </p>
            </div>
            <TierBadge tier={user.verificationTier} />
          </div>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button
              className="rounded-full"
              onClick={() => {
                addTransaction({ type: "Top-up via card", amount: 250, currency: "USDCx", status: "Pending" });
                toast.success("Top-up requested", { description: "Funds appear once settlement clears." });
              }}
            >
              <ArrowDownToLine className="mr-1.5 h-4 w-4" /> Add funds
            </Button>
            <Button
              variant="secondary"
              className="rounded-full"
              onClick={() => {
                addTransaction({
                  type: "Withdrawal to bank",
                  amount: 500000,
                  currency: "NGN",
                  status: "Pending",
                });
                toast.success("Withdrawal queued", { description: "NGN payout lands in 1–2 business days." });
              }}
            >
              <ArrowUpRight className="mr-1.5 h-4 w-4" /> Withdraw
            </Button>
          </div>
        </Panel>

        <Panel>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            {isCreative ? "Reputation" : "Backing"}
          </p>
          <p className="mt-3 font-display text-3xl font-bold text-primary">
            {isCreative ? user.reputationScore : formatUSD(totalBacked)}
          </p>
          {isCreative ? (
            <>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, user.reputationScore / 10)}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {user.endorsements.length} endorsement
                {user.endorsements.length === 1 ? "" : "s"} on file.
              </p>
            </>
          ) : (
            <>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, (totalBacked / 25000) * 100)}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                across {myCampaigns.length} backed project{myCampaigns.length === 1 ? "" : "s"}.
              </p>
            </>
          )}
        </Panel>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">Recent transactions</h2>
        <Panel className="mt-4 divide-y divide-border p-0">
          {wallet.transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{t.type}</p>
                <p className="text-xs text-muted-foreground">{formatDate(t.timestamp)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-sm font-semibold">
                  {t.currency === "NGN" ? formatNGN(t.amount) : `${t.amount.toLocaleString()} USDCx`}
                </span>
                <StatusPill status={t.status} />
              </div>
            </div>
          ))}
        </Panel>
      </section>

      {user.role === "Backer" && needsVote.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold">Milestone approvals</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {needsVote.map(({ campaign, milestone }) => (
              <Link
                key={`${campaign.id}-${milestone.id}`}
                to="/campaign/$id"
                params={{ id: campaign.id }}
                className="panel p-5 transition-transform hover:-translate-y-1"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                    {campaign.title}
                  </p>
                  <StatusPill status={milestone.status} />
                </div>
                <p className="mt-2 text-sm font-medium">{milestone.description}</p>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Vote className="h-3.5 w-3.5" /> Needs your weighted vote to settle
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">
          {isCreative ? "Your campaigns" : "Campaigns you've backed"}
        </h2>
        <div className="mt-4">
          {loading ? (
            <CardSkeleton />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myCampaigns.map((c) => {
                const released = c.milestones.filter((m) => m.status === "Released").length;
                const myTotal = isCreative
                  ? 0
                  : c.contributions
                      .filter((cc) => cc.userId === user.id)
                      .reduce((sum, cc) => sum + cc.amount, 0);
                return (
                  <Link
                    key={c.id}
                    to="/campaign/$id"
                    params={{ id: c.id }}
                    className="panel overflow-hidden transition-transform hover:-translate-y-1"
                  >
                    <ProjectThumb
                      src={thumbnailForCampaign(c)}
                      alt={c.title}
                      tone={c.coverTone}
                      className="h-24 w-full"
                    />
                    <div className="p-5">
                      <h3 className="font-display text-base font-semibold">{c.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {isCreative
                          ? `${released}/${c.milestones.length} milestones released`
                          : `You've backed ${formatUSD(myTotal)}`}
                      </p>
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
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
