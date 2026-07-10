import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const name = file.name.toLowerCase();
    const bytes = await file.arrayBuffer();

    if (name.endsWith(".txt")) {
      const text = new TextDecoder().decode(bytes);
      return NextResponse.json({ text });
    }

    if (name.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
      return NextResponse.json({ text: result.value });
    }

    return NextResponse.json(
      { error: "Unsupported file type. Please upload a .txt or .docx file." },
      { status: 400 }
    );
  } catch (err) {
    console.error("[extract-file]", err);
    return NextResponse.json(
      { error: "Failed to read file. Please try again." },
      { status: 500 }
    );
  }
}
