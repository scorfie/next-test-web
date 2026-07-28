import { getFile } from "@/lib/fileStore";
import { mimeTypeForFilename } from "@/lib/mimeTypes";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";

export const runtime = "nodejs";

// RFC 6266: `filename=` is a legacy quoted-string, not a place for percent-encoding —
// stuffing an encodeURIComponent()'d name in there can leave stray characters (like a
// trailing quote) in what browsers save to disk. Ship a sanitized ASCII fallback plus
// a correctly percent-encoded `filename*=UTF-8''...` for full-fidelity names.
function contentDispositionHeader(
  type: "inline" | "attachment",
  filename: string,
): string {
  const asciiFallback =
    filename.replace(/[\x00-\x1f"\\]/g, "").replace(/[^\x20-\x7e]/g, "_") ||
    "file";
  return `${type}; filename="${asciiFallback}"; filename*=${encodeURIComponent(filename)}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; filename: string }> },
) {
  const { id, filename } = await params;
  const file = getFile(id);

  if (!file) {
    return NextResponse.json(
      { error: "File not found or expired." },
      { status: 404 },
    );
  }

  // Serve the decoded bytes straight from memory: a Node Readable wrapping the
  // Buffer, with no intermediate write to disk.
  const memoryStream = Readable.from(file.buffer);
  const webStream = Readable.toWeb(memoryStream) as ReadableStream;

  const disposition =
    request.nextUrl.searchParams.get("download") !== null
      ? "attachment"
      : "inline";

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": mimeTypeForFilename(filename),
      "Content-Length": String(file.buffer.length),
      "Content-Disposition": contentDispositionHeader(
        disposition,
        file.filename,
      ),
      "Cache-Control": "no-store",
    },
  });
}
