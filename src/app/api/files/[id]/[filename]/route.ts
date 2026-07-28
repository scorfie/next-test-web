import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import { getFile } from "@/lib/fileStore";
import { mimeTypeForFilename } from "@/lib/mimeTypes";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; filename: string }> },
) {
  const { id, filename } = await params;
  const file = getFile(id);

  if (!file) {
    return NextResponse.json({ error: "File not found or expired." }, { status: 404 });
  }

  // Serve the decoded bytes straight from memory: a Node Readable wrapping the
  // Buffer, with no intermediate write to disk.
  const memoryStream = Readable.from(file.buffer);
  const webStream = Readable.toWeb(memoryStream) as ReadableStream;

  const disposition = request.nextUrl.searchParams.get("download") !== null ? "attachment" : "inline";

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": mimeTypeForFilename(filename),
      "Content-Length": String(file.buffer.length),
      "Content-Disposition": `${disposition}; filename="${encodeURIComponent(file.filename)}"`,
      "Cache-Control": "no-store",
    },
  });
}
