import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 text-5xl">🚧</div>
      <h1 className="text-2xl font-semibold tracking-tight">Coming Soon</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        The Dashboard is being redesigned. In the meantime, use the Operations Overview for
        a summary of team activity and project health.
      </p>
      <Link
        href="/operations"
        className="mt-6 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Go to Operations Overview →
      </Link>
    </div>
  );
}
