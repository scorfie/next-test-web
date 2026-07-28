import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { putFile } from "@/lib/fileStore";

export const runtime = "nodejs";

function decodeBase64(input: string): Buffer {
  // Strip a data URL prefix like "data:application/pdf;base64," if present.
  const commaIndex = input.indexOf(",");
  const raw = input.startsWith("data:") && commaIndex !== -1 ? input.slice(commaIndex + 1) : input;
  return Buffer.from(raw, "base64");
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.base64 !== "string" || typeof body.filename !== "string") {
    return NextResponse.json(
      { error: "Expected JSON body with string fields 'base64' and 'filename'." },
      { status: 400 },
    );
  }

  const filename = body.filename.trim();
  if (!filename || filename.includes("/") || filename.includes("\\")) {
    return NextResponse.json({ error: "Invalid filename." }, { status: 400 });
  }

  let buffer: Buffer;
  try {
    buffer = decodeBase64(body.base64);
  } catch {
    return NextResponse.json({ error: "Invalid base64 string." }, { status: 400 });
  }

  if (buffer.length === 0) {
    return NextResponse.json({ error: "Decoded file is empty." }, { status: 400 });
  }

  const id = randomUUID();
  putFile(id, { buffer, filename, createdAt: Date.now() });

  return NextResponse.json({
    id,
    url: `/api/files/${id}/${encodeURIComponent(filename)}`,
  });
}
