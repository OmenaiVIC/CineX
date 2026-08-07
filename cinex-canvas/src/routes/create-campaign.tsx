import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/cinex/RequireAuth";
import { ImagePicker } from "@/components/cinex/ProjectThumb";
import { CategoryField } from "@/components/cinex/CategoryField";
import { PageHeader, Panel, formatUSD } from "@/components/cinex/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import { TIER_CAPS, type PortfolioCategory } from "@/lib/cinex-types";

export const Route = createFileRoute("/create-campaign")({
  head: () => ({
    meta: [
      { title: "Create a campaign — CineX" },
      {
        name: "description",
        content: "Define your project, funding target and 2–8 milestones for gated capital release.",
      },
      { property: "og:title", content: "Create a campaign — CineX" },
      { property: "og:description", content: "Raise capital milestone by milestone on CineX." },
    ],
  }),
  component: () => (
    <RequireAuth roles={["Creative"]}>
      <CreateCampaignPage />
    </RequireAuth>
  ),
});

function CreateCampaignPage() {
  const { user, addCampaign } = useStore();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [category, setCategory] = useState<PortfolioCategory | "">("");
  const [fundingTarget, setFundingTarget] = useState(0);
  const [milestones, setMilestones] = useState([
    { description: "", amount: 0 },
    { description: "", amount: 0 },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;
  const cap = TIER_CAPS[user.verificationTier];
  const overCap = cap !== null && fundingTarget > cap;
  const milestoneTotal = milestones.reduce((s, m) => s + (Number(m.amount) || 0), 0);

  const setMilestone = (i: number, patch: Partial<{ description: string; amount: number }>) =>
    setMilestones((ms) => ms.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow="Campaign"
        title="Create a campaign"
        subtitle="Break the project into deliverables. Capital unlocks as backers verify each one."
      />

      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          const errs: Record<string, string> = {};
          if (!title.trim()) errs["title"] = "Project title is required";
          if (description.trim().length < 40) errs["description"] = "Give backers at least 40 characters";
          if (!category) errs["category"] = "Select a category";
          else if (category === "Other") errs["category"] = "Tell us your exact category";
          if (fundingTarget <= 0) errs["target"] = "Enter a funding target above zero";
          if (overCap) errs["target"] = `Your ${user.verificationTier} tier caps campaigns at ${formatUSD(cap!)}`;
          if (milestones.length < 2 || milestones.length > 8) errs["milestones"] = "Use between 2 and 8 milestones";
          if (milestones.some((m) => !m.description.trim() || m.amount <= 0))
            errs["milestones"] = "Every milestone needs a description and an amount";
          else if (fundingTarget > 0 && milestoneTotal !== fundingTarget)
            errs["milestones"] = `Milestone amounts total ${formatUSD(milestoneTotal)} — they must equal the target`;
          setErrors(errs);
          if (Object.keys(errs).length) return;
          setSubmitting(true);
          setTimeout(() => {
            const id = addCampaign({ title, description, fundingTarget, mediaUrl, category, milestones });
            setSubmitting(false);
            toast.success("Campaign submitted — backers can now fund it");
            navigate({ to: "/campaign/$id", params: { id } });
          }, 600);
        }}
      >
        <Panel className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Project title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Harmattan Season" />
            {errors["title"] && <p className="text-xs text-destructive">{errors["title"]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you making, who is it for, and what does the capital unlock?"
            />
            {errors["description"] && <p className="text-xs text-destructive">{errors["description"]}</p>}
          </div>
          <CategoryField
            id="category"
            value={category}
            onChange={setCategory}
            error={errors["category"]}
          />
          <ImagePicker
            label="Project image"
            value={mediaUrl}
            onChange={setMediaUrl}
            help="PNG, JPG or WEBP, or a YouTube/Vimeo link. Shown on campaign cards and the campaign page."
          />
          <div className="space-y-2">
            <Label htmlFor="target">Funding target (USD)</Label>
            <Input
              id="target"
              type="number"
              value={fundingTarget || ""}
              onChange={(e) => setFundingTarget(Number(e.target.value))}
              placeholder="48000"
            />
            {errors["target"] && <p className="text-xs text-destructive">{errors["target"]}</p>}
            <p className="text-xs text-muted-foreground">
              {cap === null
                ? "Standard tier — no funding cap."
                : `${user.verificationTier} tier cap: ${formatUSD(cap)}`}
            </p>
          </div>

          {overCap && (
            <div className="flex gap-3 rounded-2xl border border-gold/40 bg-gold/10 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
              <div>
                <p className="text-sm font-semibold">Upgrade your verification to raise more</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your {user.verificationTier} tier caps campaigns at {formatUSD(cap!)}. A verified
                  endorsement lifts your cap — the endorsement program opens soon.
                </p>
                <Button variant="secondary" size="sm" className="mt-3 rounded-full" asChild>
                  <Link to="/endorse">Learn about endorsements</Link>
                </Button>
              </div>
            </div>
          )}
        </Panel>

        <Panel className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">Milestones</h2>
              <p className="text-xs text-muted-foreground">
                {milestones.length} of 8 · total {formatUSD(milestoneTotal)}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-full"
              disabled={milestones.length >= 8}
              onClick={() => setMilestones((ms) => [...ms, { description: "", amount: 0 }])}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add
            </Button>
          </div>

          {milestones.map((m, i) => (
            <div key={i} className="rounded-2xl border border-border bg-surface-2 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Milestone {i + 1}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-destructive"
                  disabled={milestones.length <= 2}
                  onClick={() => setMilestones((ms) => ms.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
                <Input
                  value={m.description}
                  onChange={(e) => setMilestone(i, { description: e.target.value })}
                  placeholder="Principal photography — 21 shooting days"
                />
                <Input
                  type="number"
                  value={m.amount || ""}
                  onChange={(e) => setMilestone(i, { amount: Number(e.target.value) })}
                  placeholder="Amount (USD)"
                />
              </div>
            </div>
          ))}
          {errors["milestones"] && <p className="text-xs text-destructive">{errors["milestones"]}</p>}
        </Panel>

        <Button type="submit" size="lg" className="w-full rounded-full" disabled={submitting}>
          {submitting ? "Submitting…" : "Submit campaign"}
        </Button>
      </form>
    </div>
  );
}
