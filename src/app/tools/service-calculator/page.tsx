"use client";

import Link from "next/link";

export default function ServiceCalculatorPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      <div className="flex items-center gap-2 px-6 py-3 border-b bg-card text-sm text-muted-foreground shrink-0">
        <Link href="/tools" className="hover:text-foreground">Tools</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Service Calculator</span>
      </div>
      <iframe
        src="/tools/service-calculator/index.html"
        className="flex-1 w-full border-0"
        title="Managed Services Calculator"
      />
    </div>
  );
}
