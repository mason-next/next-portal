import type { ReactNode } from "react";

// Login page is outside the main app shell — no header, no providers.
export default function LoginLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
