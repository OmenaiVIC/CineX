import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { RequireAuth } from "@/components/cinex/RequireAuth";
import { ProjectThumb } from "@/components/cinex/ProjectThumb";
import { PageHeader, EmptyState, formatUSD } from "@/components/cinex/ui-kit";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { thumbnailForCampaign } from "@/lib/thumbnails";

export const Route = createFileRoute("/discover")({
  head: () => ({
    meta: [
      { title: "Discover campaigns — CineX" },
      {
        name: "description",
        content: "Browse verified African film, music, fashion and game projects raising milestone capital.",
      },
      { property: "og:title", content: "Discover campaigns — CineX" },
      { property: "og:description", content: "Back verified African creative projects on CineX." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <DiscoverPage />
    </RequireAuth>
  ),
});

function DiscoverPage() {
  const { campaigns } = useStore();
  const [q, setQ] = useState("");
  const results = campaigns.filter((c) =>
    `${c.title} ${c.creatorName} ${c.category}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow="Campaign discovery"
        title="Projects raising now"
        subtitle="Every campaign here was submitted by a verified creative."
      />

      <div className="relative mb-8 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by project, creative or category"
          className="rounded-full pl-9"
        />
      </div>

      {results.length === 0 ? (
        <EmptyState title="No campaigns match" description="Try a different project, creative or category." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((c) => (
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
                className="h-28"
              />
              <div className="p-5">
                <p className="text-xs text-muted-foreground">
                  {c.category} · {c.creatorName}
                </p>
                <h3 className="mt-1 font-display text-base font-semibold">{c.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
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
      )}
    </div>
  );
}
