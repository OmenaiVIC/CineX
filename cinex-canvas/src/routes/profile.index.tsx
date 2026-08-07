import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { RequireAuth } from "@/components/cinex/RequireAuth";
import { PageHeader, Panel, TierBadge, formatDate, formatUSD } from "@/components/cinex/ui-kit";
import { PortfolioGrid, PortfolioForm, type PortfolioDraft } from "@/components/cinex/portfolio";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import type { PortfolioItem } from "@/lib/cinex-types";

export const Route = createFileRoute("/profile/")({
  head: () => ({
    meta: [
      { title: "Your profile — CineX" },
      {
        name: "description",
        content: "Verification tier, reputation score, portfolio and endorsements.",
      },
      { property: "og:title", content: "Your profile — CineX" },
      { property: "og:description", content: "Portfolio, endorsements and verification on CineX." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <ProfilePage />
    </RequireAuth>
  ),
});

function ProfilePage() {
  const { user, campaigns, updatePortfolioItem, deletePortfolioItem } = useStore();
  const [editing, setEditing] = useState<PortfolioItem | null>(null);
  const [draft, setDraft] = useState<PortfolioDraft | null>(null);

  if (!user) return null;

  const isCreative = user.role === "Creative";
  const backedCampaigns = campaigns.filter((c) =>
    c.contributions.some((cc) => cc.userId === user.id),
  );
  const totalBacked = backedCampaigns
    .flatMap((c) => c.contributions.filter((cc) => cc.userId === user.id))
    .reduce((sum, cc) => sum + cc.amount, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow={user.role}
        title={user.name}
        subtitle={user.bio || (isCreative ? "Add a short bio so backers understand your practice." : "Backer profile.")}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" className="rounded-full" asChild>
              <Link to="/profile/edit">Edit profile</Link>
            </Button>
            {isCreative && (
              <Button className="rounded-full" asChild>
                <Link to="/portfolio/add">
                  <Plus className="mr-1.5 h-4 w-4" /> Add work
                </Link>
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Verification</p>
          <div className="mt-3">
            <TierBadge tier={user.verificationTier} />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {isCreative
              ? user.verificationTier === "Standard"
                ? "No funding cap on your campaigns."
                : user.verificationTier === "Basic"
                  ? "You can raise up to $10,000 per campaign."
                  : "You can raise up to $1,000 per campaign. Applications to raise the cap are reviewed in order."
              : "Backers don't raise funds — verification applies to wallet limits."}
          </p>
        </Panel>
        <Panel>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            {isCreative ? "Reputation" : "Backing"}
          </p>
          <p className="mt-3 font-display text-3xl font-bold text-primary">
            {isCreative ? user.reputationScore : formatUSD(totalBacked)}
          </p>
          {!isCreative && (
            <p className="mt-3 text-sm text-muted-foreground">
              across {backedCampaigns.length} backed project{backedCampaigns.length === 1 ? "" : "s"}.
            </p>
          )}
        </Panel>
        <Panel>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Contact</p>
          <p className="mt-3 text-sm">{user.email}</p>
          <p className="mt-1 text-xs text-muted-foreground">Role: {user.role}</p>
        </Panel>
      </div>

      {isCreative && (
        <>
          <section className="mt-12">
            <h2 className="font-display text-xl font-semibold">Portfolio</h2>
            <div className="mt-4">
              <PortfolioGrid
                items={user.portfolio}
                onEdit={(item) => {
                  setEditing(item);
                  setDraft({
                    title: item.title,
                    description: item.description,
                    mediaUrl: item.mediaUrl,
                    year: item.year,
                    category: item.category,
                  });
                }}
                onDelete={(item) => {
                  deletePortfolioItem(item.id);
                  toast.success("Portfolio item removed");
                }}
              />
            </div>
          </section>

          <section className="mt-12">
            <h2 className="font-display text-xl font-semibold">Endorsements</h2>
            <div className="mt-4 space-y-3">
              {user.endorsements.length === 0 ? (
                <Panel>
                  <p className="text-sm text-muted-foreground">
                    No endorsements yet. An industry endorsement unlocks a higher funding cap — the
                    program opens soon.
                  </p>
                </Panel>
              ) : (
                user.endorsements.map((e) => (
                  <Panel key={e.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-display text-sm font-semibold">{e.endorserName}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(e.timestamp)}</p>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{e.letter}</p>
                    {e.url && (
                      <a
                        href={e.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-sm text-primary hover:underline"
                      >
                        View endorsement record
                      </a>
                    )}
                  </Panel>
                ))
              )}
            </div>
          </section>
        </>
      )}

      {!isCreative && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-semibold">Projects you've backed</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {backedCampaigns.length === 0 ? (
              <Panel>
                <p className="text-sm text-muted-foreground">
                  You haven't backed anything yet.{" "}
                  <Link to="/discover" className="text-primary hover:underline">
                    Discover campaigns
                  </Link>
                </p>
              </Panel>
            ) : (
              backedCampaigns.map((c) => {
                const myTotal = c.contributions
                  .filter((cc) => cc.userId === user.id)
                  .reduce((sum, cc) => sum + cc.amount, 0);
                return (
                  <Link
                    key={c.id}
                    to="/campaign/$id"
                    params={{ id: c.id }}
                    className="panel p-5 transition-transform hover:-translate-y-1"
                  >
                    <h3 className="font-display text-base font-semibold">{c.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      You've backed {formatUSD(myTotal)}
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
                  </Link>
                );
              })
            )}
          </div>
        </section>
      )}

      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
            setDraft(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Edit portfolio item</DialogTitle>
            <DialogDescription>Update the details of this past work.</DialogDescription>
          </DialogHeader>
          {draft && (
            <PortfolioForm
              value={draft}
              onChange={setDraft}
              submitLabel="Save changes"
              onSubmit={() => {
                if (!editing) return;
                updatePortfolioItem(editing.id, draft);
                setEditing(null);
                setDraft(null);
                toast.success("Portfolio item updated");
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
