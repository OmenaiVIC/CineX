import { useEffect, useRef, useState } from "react";
import type { PortfolioCategory, PresetPortfolioCategory } from "@/lib/cinex-types";
import { CATEGORIES, CATEGORY_TO_SECTOR } from "@/lib/cinex-types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const OTHER = "Other";

function isPreset(category: PortfolioCategory | ""): category is PresetPortfolioCategory {
  return category !== "" && category in CATEGORY_TO_SECTOR;
}

export function CategoryField({
  value,
  onChange,
  label = "Category",
  id,
  error,
  placeholder = "Select a category…",
}: {
  value: PortfolioCategory | "";
  onChange: (v: PortfolioCategory) => void;
  label?: string;
  id?: string;
  error?: string;
  placeholder?: string;
}) {
  const custom = value !== "" && !isPreset(value);
  const specify = value === OTHER || custom;
  const [customText, setCustomText] = useState(custom ? value : "");
  const inputRef = useRef<HTMLInputElement>(null);

  // Edit pre-fill: a stored custom (non-preset) category loads into the box.
  useEffect(() => {
    if (custom) setCustomText(value);
  }, [value, custom]);

  useEffect(() => {
    if (specify) inputRef.current?.focus();
  }, [specify]);

  const handleSelect = (v: string) => {
    setCustomText("");
    if (v === OTHER) {
      onChange(OTHER);
    } else {
      onChange(v as PresetPortfolioCategory);
    }
  };

  const handleCustomText = (text: string) => {
    setCustomText(text);
    onChange(text.trim() ? text : OTHER);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={custom ? OTHER : value || undefined} onValueChange={handleSelect}>
        <SelectTrigger id={id} className={error ? "border-destructive" : undefined}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {CATEGORIES.map((c) => (
            <SelectItem key={c} value={c}>
              {c === OTHER ? "Other — specify" : c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {specify && (
        <Input
          ref={inputRef}
          value={customText}
          onChange={(e) => handleCustomText(e.target.value)}
          placeholder="Name your exact category, e.g. Kite Making"
          aria-invalid={error ? true : undefined}
        />
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
