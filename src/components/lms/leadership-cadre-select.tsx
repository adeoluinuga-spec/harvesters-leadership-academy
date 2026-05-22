"use client";

import { LEADERSHIP_CADRES } from "@/lib/lms-types";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

type Props = {
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
};

export function LeadershipCadreSelect({ value, onChange, className }: Props) {
  const allSelected = value.length === LEADERSHIP_CADRES.length;

  function toggle(cadre: string) {
    if (value.includes(cadre)) {
      onChange(value.filter((v) => v !== cadre));
    } else {
      onChange([...value, cadre]);
    }
  }

  function toggleAll() {
    if (allSelected) {
      onChange([]);
    } else {
      onChange([...LEADERSHIP_CADRES]);
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <button
        type="button"
        onClick={toggleAll}
        className={cn(
          "flex h-8 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-colors",
          allSelected
            ? "border-zinc-900 bg-zinc-900 text-white"
            : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
        )}
      >
        <div className={cn("flex size-4 items-center justify-center rounded border", allSelected ? "border-white bg-white" : "border-zinc-300")}>
          {allSelected ? <Check className="size-2.5 text-zinc-900" /> : null}
        </div>
        All leadership cadres
      </button>

      <div className="flex flex-wrap gap-2">
        {LEADERSHIP_CADRES.map((cadre) => {
          const selected = value.includes(cadre);
          return (
            <button
              key={cadre}
              type="button"
              onClick={() => toggle(cadre)}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors",
                selected
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
              )}
            >
              {selected ? <Check className="size-3" /> : null}
              {cadre}
            </button>
          );
        })}
      </div>

      {value.length === 0 ? (
        <p className="text-xs text-zinc-400">No cadres selected — course will be visible to all roles</p>
      ) : (
        <p className="text-xs text-zinc-500">
          {value.length} cadre{value.length !== 1 ? "s" : ""} targeted
        </p>
      )}
    </div>
  );
}
