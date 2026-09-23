import Link from "next/link";

// The commission statement is not ready for use yet. The working implementation lives
// in ./CommissionStatement.tsx; re-export it from here when it's ready to launch.
export default function CommissionStatementComingSoon() {
  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="rounded-xl border bg-card px-6 py-16 text-center">
        <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
          Coming soon
        </span>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">Commission Statement</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Commission statements are still being finished and aren&apos;t available yet.
        </p>
        <Link href="/sales/deal-desk" className="mt-6 inline-block text-sm text-primary hover:underline">
          ← Back to Deal Desk
        </Link>
      </div>
    </div>
  );
}
