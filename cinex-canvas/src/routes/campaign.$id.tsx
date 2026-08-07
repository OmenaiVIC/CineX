import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ThumbsUp, ThumbsDown, Lock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/cinex/RequireAuth";
import { ProjectThumb } from "@/components/cinex/ProjectThumb";
import { PageHeader, Panel, StatusPill, formatUSD } from "@/components/cinex/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { thumbnailForCampaign } from "@/lib/thumbnails";

export const Route = createFileRoute("/campaign/$id")({
  head: () => ({
    meta: [
      { title: "Campaign milestones — CineX" },
      {
        name: "description",
        content: "Track milestone status, backer votes and escrow releases for this CineX campaign.",
      },
      { property: "og:title", content: "Campaign milestones — CineX" },
      { property: "og:description", content: "Milestone progress and backer voting on CineX." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <CampaignPage />
    </RequireAuth>
  ),
});

function CampaignPage() {
  const { id } = Route.useParams();
  const { campaigns, voteMilestone, contribute, user } = useStore();
  const campaign = campaigns.find((c) => c.id === id);
  const [amount, setAmount] = useState("");

  if (!campaign) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <h1 className="font-display text-2xl font-bold">Campaign not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">It may have been withdrawn by the creative.</p>
        <Button className="mt-6 rounded-full" asChild>
          <Link to="/discover">Browse campaigns</Link>
        </Button>
      </div>
    );
  }

  const progress = Math.min(100, (campaign.raised / campaign.fundingTarget) * 100);
  const remaining = Math.max(0, campaign.fundingTarget - campaign.raised);
  const myContribution = user
    ? campaign.contributions.filter((c) => c.userId === user.id).reduce((s, c) => s + c.amount, 0)
    : 0;
  const canVote = !!user && user.role === "Backer" && myContribution > 0;
  const isCreator = user?.id === campaign.creatorId;
  const thumbnail = thumbnailForCampaign(campaign);

  const submitContribution = () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter a contribution amount");
      return;
    }
    if (value > remaining) {
      toast.error(`Only ${formatUSD(remaining)} remains to be raised`);
      return;
    }
    if (contribute(campaign.id, value)) {
      setAmount("");
      toast.success(`Contributed ${formatUSD(value)}`);
    } else {
      toast.error("Contribution failed");
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <ProjectThumb
        src={thumbnail}
        alt={campaign.title}
        tone={campaign.coverTone}
        rounded="rounded-3xl"
        className="h-56 w-full"
      />

      <div className="mt-8">
        <PageHeader
          eyebrow={`${campaign.category} · ${campaign.creatorName}`}
          title={campaign.title}
          subtitle={campaign.description}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Panel>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-display text-3xl font-bold">{formatUSD(campaign.raised)}</p>
              <p className="text-sm text-muted-foreground">raised of {formatUSD(campaign.fundingTarget)}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {campaign.milestones.filter((m) => m.status === "Released").length} of{" "}
              {campaign.milestones.length} milestones released
            </p>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
        </Panel>

        {user?.role === "Backer" && !isCreator && (
          <Panel className="space-y-3">
            <Label htmlFor="contribution" className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Fund this project
            </Label>
            <div className="flex gap-2">
              <Input
                id="contribution"
                type="number"
                min={1}
                max={remaining}
                step={50}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={remaining > 0 ? "Amount (USDCx)" : "Fully funded"}
                disabled={remaining <= 0}
                className="rounded-xl"
              />
              <Button
                className="rounded-xl"
                onClick={submitContribution}
                disabled={remaining <= 0}
              >
                Back
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {myContribution > 0
                ? `You've backed ${formatUSD(myContribution)} — your vote counts that much.`
                : "Backers who contribute get a weighted vote on each milestone."}
            </p>
            {remaining <= 0 && <p className="text-xs text-muted-foreground">Funding target reached.</p>}
          </Panel>
        )}
      </div>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-xl font-semibold">Milestones</h2>
        {campaign.milestones.map((m, i) => {
          const totalContributed = campaign.contributions.reduce((sum, c) => sum + c.amount, 0);
          const weight = totalContributed ? Math.round((m.votes.yesAmount / totalContributed) * 100) : 0;
          return (
            <Panel key={m.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                    Milestone {i + 1}
                  </p>
                  <h3 className="mt-1 font-display text-base font-semibold">{m.description}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{formatUSD(m.amount)} tranche</p>
                </div>
                <StatusPill status={m.status} />
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Backer approval (by contribution)</span>
                  <span>
                    {weight}% yes · {formatUSD(m.votes.yesAmount)} of {formatUSD(totalContributed)}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${weight}%` }} />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {m.status === "Released" ? (
                  <p className="flex items-center gap-1.5 text-sm text-primary">
                    <CheckCircle2 className="h-4 w-4" /> Capital released to creative wallet
                  </p>
                ) : m.status === "Approved" ? (
                  <p className="flex items-center gap-1.5 text-sm text-chart-2">
                    <CheckCircle2 className="h-4 w-4" /> Releasable — awaiting settlement
                  </p>
                ) : m.status === "Disputed" ? (
                  <p className="flex items-center gap-1.5 text-sm text-destructive">
                    <Lock className="h-4 w-4" /> Disputed — funds held in escrow
                  </p>
                ) : (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Lock className="h-4 w-4" /> Pending verification
                  </p>
                )}

                {canVote && m.status !== "Released" && (
                  <div className="ml-auto flex gap-2">
                    <Button
                      size="sm"
                      variant={m.myVote === "yes" ? "default" : "secondary"}
                      className="rounded-full"
                      onClick={() => {
                        if (voteMilestone(campaign.id, m.id, "yes")) {
                          toast.success("Vote recorded: approve");
                        } else if (m.myVote === "yes") {
                          toast("Vote already recorded");
                        } else {
                          toast.error("Only backers who contributed can vote");
                        }
                      }}
                    >
                      <ThumbsUp className="mr-1.5 h-3.5 w-3.5" /> Yes
                    </Button>
                    <Button
                      size="sm"
                      variant={m.myVote === "no" ? "destructive" : "secondary"}
                      className="rounded-full"
                      onClick={() => {
                        if (voteMilestone(campaign.id, m.id, "no")) {
                          toast("Vote recorded: reject");
                        } else if (m.myVote === "no") {
                          toast("Vote already recorded");
                        } else {
                          toast.error("Only backers who contributed can vote");
                        }
                      }}
                    >
                      <ThumbsDown className="mr-1.5 h-3.5 w-3.5" /> No
                    </Button>
                  </div>
                )}
              </div>
            </Panel>
          );
        })}
      </section>
    </div>
  );
}
