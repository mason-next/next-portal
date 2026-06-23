interface UserAvatarImageProps {
  name: string;
  avatarUrl: string | null;
  size?: number;
}

export function UserAvatarImage({ name, avatarUrl, size = 32 }: UserAvatarImageProps) {
  const style = { width: size, height: size, fontSize: size * 0.4 };

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- locally stored data URL, not an optimizable remote asset
      <img src={avatarUrl} alt="" style={style} className="shrink-0 rounded-full object-cover" />
    );
  }

  const initials =
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <span
      style={style}
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-300 to-slate-700 font-semibold text-white"
    >
      {initials}
    </span>
  );
}
