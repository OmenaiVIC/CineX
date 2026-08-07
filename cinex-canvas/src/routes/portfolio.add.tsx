import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/cinex/RequireAuth";
import { PageHeader, Panel } from "@/components/cinex/ui-kit";
import { PortfolioForm, emptyDraft, type PortfolioDraft } from "@/components/cinex/portfolio";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/portfolio/add")({
  head: () => ({
    meta: [
      { title: "Add portfolio work — CineX" },
      {
        name: "description",
        content: "Publish a past film, music, fashion, art or game project to your CineX portfolio.",
      },
      { property: "og:title", content: "Add portfolio work — CineX" },
      { property: "og:description", content: "Show backers the work behind your funding request." },
    ],
  }),
  component: () => (
    <RequireAuth roles={["Creative"]}>
      <AddPortfolioPage />
    </RequireAuth>
  ),
});

function AddPortfolioPage() {
  const { addPortfolioItem } = useStore();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<PortfolioDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow="Portfolio"
        title="Add a past work"
        subtitle="Link to hosted work on YouTube, Vimeo, SoundCloud or an image host."
      />
      <Panel>
        <PortfolioForm
          value={draft}
          onChange={setDraft}
          submitLabel="Add to portfolio"
          submitting={saving}
          onSubmit={() => {
            setSaving(true);
            setTimeout(() => {
              addPortfolioItem(draft);
              setSaving(false);
              toast.success("Portfolio item added");
              navigate({ to: "/profile" });
            }, 400);
          }}
        />
      </Panel>
    </div>
  );
}
