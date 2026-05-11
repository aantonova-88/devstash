import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TopBar() {
  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-border shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold tracking-tight">DevStash</span>
      </div>

      <div className="flex-1 max-w-sm mx-8">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search snippets, prompts, commands..."
            className="pl-8 h-8 text-sm bg-muted/40 border-border"
            readOnly
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs">
          <Plus className="h-3.5 w-3.5" />
          New collection
        </Button>
        <Button size="sm" className="gap-1.5 h-8 text-xs">
          <Plus className="h-3.5 w-3.5" />
          New item
        </Button>
      </div>
    </header>
  );
}
