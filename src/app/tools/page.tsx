import Link from "next/link";

const TOOLS = [
  {
    href: "/tools/service-calculator",
    name: "Service Calculator",
    description: "Price managed service contracts by tier, rooms, and nodes. Shows service cost, gross margin, and gross profit in real time.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2"/>
        <line x1="8" y1="8" x2="16" y2="8"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
        <line x1="8" y1="16" x2="12" y2="16"/>
      </svg>
    ),
  },
];

export default function ToolsPage() {
  return (
    <div className="mx-auto max-w-4xl p-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Tools</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Internal calculators and utilities</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group rounded-xl border bg-card p-5 hover:shadow-md transition-shadow"
          >
            <div className="text-muted-foreground group-hover:text-primary transition-colors mb-3">
              {tool.icon}
            </div>
            <div className="font-semibold text-sm mb-1">{tool.name}</div>
            <p className="text-xs text-muted-foreground leading-relaxed">{tool.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
