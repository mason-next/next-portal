import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddressLinkProps {
  address: string;
  className?: string;
}

export function AddressLink({ address, className }: AddressLinkProps) {
  if (!address) return <span className={className}>—</span>;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      title="Open in Google Maps"
      className={cn(
        "inline-flex items-center gap-1 text-primary hover:underline underline-offset-2 transition-colors",
        className
      )}
    >
      <MapPin className="size-3 flex-none" />
      <span className="truncate">{address}</span>
    </a>
  );
}
