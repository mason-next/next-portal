"use client";

import { useEffect, useRef, useState } from "react";
import { readGlobal, writeGlobal } from "@/lib/storage/local-store";

const AVATAR_KEY = "current-user-avatar";

export function UserAvatar() {
  const [avatar, setAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Deferred to a microtask so this reads as an async load (matching how every other
    // data source in this app is loaded post-mount) rather than a synchronous setState.
    queueMicrotask(() => setAvatar(readGlobal<string>(AVATAR_KEY)));
  }, []);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      writeGlobal(AVATAR_KEY, dataUrl);
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
        className="size-8 shrink-0 overflow-hidden rounded-full"
      >
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- locally stored data URL, not an optimizable remote asset
          <img src={avatar} alt="" className="size-8 rounded-full object-cover" />
        ) : (
          <span className="block size-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-700" />
        )}
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
