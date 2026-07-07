import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getServerSession } from "@/lib/auth/server";
import type { CommentAttachment } from "@/types/attachments";

const STORAGE_ROOT =
  process.env.FILE_STORAGE_ROOT ?? path.join(process.cwd(), ".local-uploads");

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Invalid form data" }, { status: 400 });

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await (file as File).arrayBuffer());
  if (buffer.length > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File exceeds 25 MB limit" }, { status: 413 });
  }

  const originalName = (file as File).name || "attachment";
  const safeName = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${Date.now()}_${safeName}`;
  const mimeType = (file as File).type || "application/octet-stream";

  const destDir = path.join(STORAGE_ROOT, "comments");
  fs.mkdirSync(destDir, { recursive: true });
  fs.writeFileSync(path.join(destDir, storagePath), buffer);

  const attachment: CommentAttachment = {
    fileName: originalName,
    fileSize: buffer.length,
    mimeType,
    storagePath,
  };

  return NextResponse.json(attachment, { status: 201 });
}
