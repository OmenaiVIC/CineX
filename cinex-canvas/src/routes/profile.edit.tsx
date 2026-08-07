import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/cinex/RequireAuth";
import { PageHeader, Panel } from "@/components/cinex/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/profile/edit")({
  head: () => ({
    meta: [
      { title: "Edit profile — CineX" },
      { name: "description", content: "Update your CineX display name, email and bio." },
      { property: "og:title", content: "Edit profile — CineX" },
      { property: "og:description", content: "Keep your CineX creative profile current." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <EditProfilePage />
    </RequireAuth>
  ),
});

function EditProfilePage() {
  const { user, updateUser } = useStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    bio: user?.bio ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <PageHeader title="Edit profile" subtitle="This is what gatekeepers and backers see." />
      <Panel>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            const errs: Record<string, string> = {};
            if (!form.name.trim()) errs["name"] = "Name is required";
            if (!/^\S+@\S+\.\S+$/.test(form.email)) errs["email"] = "Enter a valid email";
            if (form.bio.length > 400) errs["bio"] = "Bio must be 400 characters or fewer";
            setErrors(errs);
            if (Object.keys(errs).length) return;
            updateUser({ name: form.name.trim(), email: form.email.trim(), bio: form.bio.trim() });
            toast.success("Profile updated");
            navigate({ to: "/profile" });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            {errors["name"] && <p className="text-xs text-destructive">{errors["name"]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            {errors["email"] && <p className="text-xs text-destructive">{errors["email"]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              rows={4}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Lagos-based director working on speculative West African cinema."
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{errors["bio"] ?? "Max 400 characters"}</span>
              <span>{form.bio.length}/400</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="rounded-full">
              Save changes
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="rounded-full"
              onClick={() => navigate({ to: "/profile" })}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
