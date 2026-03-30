/**
 * ViewToggle.tsx
 * リスト/タイル表示の切り替えボタングループ。
 * localStorageで設定を永続化する。
 */

import { LayoutList, LayoutGrid, AlignJustify, Grid3X3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";

export type ViewMode = "list-lg" | "list-sm" | "tile-lg" | "tile-sm";

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const VIEW_OPTIONS: { mode: ViewMode; icon: React.ReactNode; label: string }[] = [
  { mode: "list-lg", icon: <AlignJustify className="h-4 w-4" />, label: "リスト（大）" },
  { mode: "list-sm", icon: <LayoutList className="h-4 w-4" />, label: "リスト（小）" },
  { mode: "tile-lg", icon: <Grid3X3 className="h-4 w-4" />, label: "タイル（大）" },
  { mode: "tile-sm", icon: <LayoutGrid className="h-4 w-4" />, label: "タイル（小）" },
];

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted/30 p-0.5">
        {VIEW_OPTIONS.map(({ mode, icon, label }) => (
          <Tooltip key={mode}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 rounded transition-all ${
                  value === mode
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => onChange(mode)}
                aria-label={label}
              >
                {icon}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {label}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

/** localStorageからViewModeを読み込むカスタムフック */
export function useViewMode(storageKey: string, defaultMode: ViewMode = "tile-lg"): [ViewMode, (mode: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && ["list-lg", "list-sm", "tile-lg", "tile-sm"].includes(stored)) {
        return stored as ViewMode;
      }
    } catch {}
    return defaultMode;
  });

  const setAndStore = (newMode: ViewMode) => {
    setMode(newMode);
    try {
      localStorage.setItem(storageKey, newMode);
    } catch {}
  };

  return [mode, setAndStore];
}
