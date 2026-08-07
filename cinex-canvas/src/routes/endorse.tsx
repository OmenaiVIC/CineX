import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { RequireAuth } from "@/components/cinex/RequireAuth";
import { PageHeader, Panel } from "@/components/cinex/ui-kit";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/endorse")({
  head: () => ({
    meta: [
      { title: "Become an Endorser — CineX" },
      {
        name: "description",
        content: "Industry endorsers vouch for verified African creatives and unlock higher funding caps on CineX.",
      },
      { property: "og:title", content: "Become an Endorser — CineX" },
      { property: "og:description", content: "Industry endorsement program on CineX — coming soon." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <EndorsePage />
    </RequireAuth>
  ),
});

function EndorsePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow="Endorsement program"
        title="Become an Endorser"
        subtitle="Industry professionals vouch for verified creatives and unlock higher funding caps."
      />
      <Panel className="py-10 text-center">
        <Clock className="mx-auto h-8 w-8 text-muted-foreground" />
        <h2 className="mt-4 font-display text-xl font-semibold">Coming soon</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Self-registration for endorsers isn't open yet. When the program launches, industry
          professionals will be able to review a creative's body of work, submit an endorsement
          letter, and raise their funding cap.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="secondary" className="rounded-full" asChild>
            <Link to="/discover">Browse campaigns</Link>
          </Button>
        </div>
      </Panel>
    </div>
  );
}
