import { useState } from "react";
import { Pencil, Trash2, ExternalLink } from "lucide-react";
import type { PortfolioCategory, PortfolioItem } from "@/lib/cinex-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImagePicker, ProjectThumb } from "@/components/cinex/ProjectThumb";
import { CategoryField } from "@/components/cinex/CategoryField";
import { EmptyState } from "@/components/cinex/ui-kit";

export interface PortfolioDraft {
  title: string;
  description: string;
  mediaUrl: string;
  year: number;
  category: PortfolioCategory | "";
}

export const emptyDraft: PortfolioDraft = {
  title: "",
  description: "",
  mediaUrl: "",
  year: new Date().getFullYear(),
  category: "",
};

export function validateDraft(d: PortfolioDraft) {
  const errors: Partial<Record<keyof PortfolioDraft, string>> = {};
  if (!d.title.trim()) errors.title = "Title is required";
  if (d.title.length > 120) errors.title = "Keep the title under 120 characters";
  if (d.description.length > 500) errors.description = "Description must be 500 characters or fewer";
  if (d.mediaUrl && !/^(https?:\/\/|data:image\/)/i.test(d.mediaUrl.trim()))
    errors.mediaUrl = "Enter a valid image URL or upload a PNG, JPG or WEBP";
  if (!d.year || d.year < 1950 || d.year > new Date().getFullYear() + 1)
    errors.year = "Enter a realistic year";
  if (!d.category) errors.category = "Select a category";
  else if (d.category === "Other") errors.category = "Tell us your exact category";
  return errors;
}

export function PortfolioForm({
  value,
  onChange,
  onSubmit,
  submitLabel,
  submitting,
}: {
  value: PortfolioDraft;
  onChange: (v: PortfolioDraft) => void;
  onSubmit: () => void;
  submitLabel: string;
  submitting?: boolean;
}) {
  const [errors, setErrors] = useState<Partial<Record<keyof PortfolioDraft, string>>>({});

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const errs = validateDraft(value);
        setErrors(errs);
        if (Object.keys(errs).length === 0) onSubmit();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          placeholder="Harmattan Light"
        />
        {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={4}
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          placeholder="What was the work, and what was your role?"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{errors.description ?? "Max 500 characters"}</span>
          <span>{value.description.length}/500</span>
        </div>
      </div>

      <div className="space-y-2">
        <ImagePicker
          label="Work image"
          value={value.mediaUrl}
          onChange={(mediaUrl) => onChange({ ...value, mediaUrl })}
          help="Upload a PNG, JPG or WEBP, or paste a YouTube/Vimeo/image URL."
        />
        {errors.mediaUrl && <p className="text-xs text-destructive">{errors.mediaUrl}</p>}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="year">Year</Label>
          <Input
            id="year"
            type="number"
            value={value.year}
            onChange={(e) => onChange({ ...value, year: Number(e.target.value) })}
          />
          {errors.year && <p className="text-xs text-destructive">{errors.year}</p>}
        </div>
        <div className="space-y-2">
          <CategoryField
            id="category"
            value={value.category}
            onChange={(category) => onChange({ ...value, category })}
            error={errors.category}
          />
        </div>
      </div>

      <Button type="submit" className="w-full rounded-full" disabled={submitting}>
        {submitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}

export function PortfolioCard({
  item,
  onEdit,
  onDelete,
}: {
  item: PortfolioItem;
  onEdit?: (() => void) | undefined;
  onDelete?: (() => void) | undefined;
}) {
  return (
    <article className="panel group flex flex-col gap-3 p-5">
      <ProjectThumb
        src={item.mediaUrl}
        alt={item.title}
        tone="from-surface-2 to-surface-1"
        className="h-32 w-full rounded-xl"
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold">{item.title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {item.category} · {item.year}
          </p>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex gap-1 opacity-70 transition-opacity group-hover:opacity-100">
            {onEdit && (
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
      {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
      {item.mediaUrl && (
        <a
          href={item.mediaUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-auto inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          View work <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </article>
  );
}

export function PortfolioGrid({
  items,
  onEdit,
  onDelete,
}: {
  items: PortfolioItem[];
  onEdit?: (item: PortfolioItem) => void;
  onDelete?: (item: PortfolioItem) => void;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No portfolio items yet"
        description="Add your first work so backers and the community can assess your track record."
        actionLabel="Add your first work"
        actionTo="/portfolio/add"
      />
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <PortfolioCard
          key={item.id}
          item={item}
          onEdit={onEdit ? () => onEdit(item) : undefined}
          onDelete={onDelete ? () => onDelete(item) : undefined}
        />
      ))}
    </div>
  );
}
