import { redirect } from "next/navigation";
export default function QuoteRedirect({ params }: { params: { quoteId: string } }) {
  redirect(`/sales/deal-desk/${params.quoteId}`);
}
