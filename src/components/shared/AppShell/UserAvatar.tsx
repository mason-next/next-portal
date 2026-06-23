"use client";

import { useRef, useState } from "react";
import { CURRENT_USER } from "@/lib/current-user";
import { CURRENT_USER_AVATAR_KEY, useCurrentUserAvatar } from "@/lib/hooks/useCurrentUserAvatar";
import { writeGlobal } from "@/lib/storage/local-store";
import { UserAvatarImage } from "./UserAvatarImage";

export function UserAvatar() {
  const initialAvatar = useCurrentUserAvatar();
  const [avatar, setAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      writeGlobal(CURRENT_USER_AVATAR_KEY, dataUrl);
      setAvatar(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        title="Click to change profile photo"
        className="overflow-hidden rounded-full"
      >
        <UserAvatarImage name={CURRENT_USER} avatarUrl={avatar ?? initialAvatar} size={32} />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </>
  );
}
