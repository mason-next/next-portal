import { redirect } from "next/navigation";

// The CRM dashboard is now the Sales dashboard.
export default function CrmDashboardRedirect() {
  redirect("/sales");
}
