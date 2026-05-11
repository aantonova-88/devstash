import { TopBar } from "@/components/layout/TopBar";

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 border-r border-border p-4 shrink-0">
          <h2 className="text-sm font-semibold text-muted-foreground">Sidebar</h2>
        </aside>
        <main className="flex-1 p-4 overflow-auto">
          <h2 className="text-sm font-semibold text-muted-foreground">Main</h2>
        </main>
      </div>
    </div>
  );
}
