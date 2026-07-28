"use client";

import { useEffect, useState } from "react";

const SAMPLE_BASE64 =
  "SGVsbG8gZnJvbSBhIGZpbGUgY3JlYXRlZCBlbnRpcmVseSBpbiBtZW1vcnkh"; // "Hello from a file created entirely in memory!"

export default function Home() {
  const [base64, setBase64] = useState(SAMPLE_BASE64);
  const [filename, setFilename] = useState("hello.txt");
  const [download, setDownload] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Pressing "back" from the file URL restores this page from the browser's
  // bfcache in whatever state it was in right before navigation — including
  // submitting=true, which would otherwise leave the button disabled forever.
  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        setSubmitting(false);
      }
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  async function handlePickFile(file: File) {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    setBase64(btoa(binary));
    setFilename(file.name);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, filename }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create file.");
      }
      const url = download ? `${data.url}?download` : data.url;
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 py-16 font-sans dark:bg-black">
      <main className="w-full max-w-lg rounded-2xl border border-black/[.08] bg-white p-8 shadow-sm dark:border-white/[.145] dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Base64 → File
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Paste a base64 string (or pick a file), give it a name with an
          extension, and submit to navigate to the decoded file. The server
          decodes it into a Buffer and streams it back from memory — nothing
          is ever written to disk.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-black dark:text-zinc-50">
            Base64 string
            <textarea
              value={base64}
              onChange={(e) => setBase64(e.target.value)}
              rows={6}
              required
              className="rounded-lg border border-black/[.08] bg-transparent p-3 font-mono text-xs text-black outline-none focus:border-black/30 dark:border-white/[.145] dark:text-zinc-50 dark:focus:border-white/40"
              placeholder="data:application/pdf;base64,... or a raw base64 string"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-black dark:text-zinc-50">
            Or pick a file to encode
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handlePickFile(file);
              }}
              className="text-sm text-zinc-600 file:mr-3 file:rounded-full file:border-0 file:bg-black file:px-4 file:py-2 file:text-xs file:font-medium file:text-white dark:text-zinc-400 dark:file:bg-white dark:file:text-black"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-black dark:text-zinc-50">
            File name (with extension)
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              required
              pattern="^[^\\/]+\.[A-Za-z0-9]+$"
              title="Include an extension, e.g. report.pdf"
              className="rounded-lg border border-black/[.08] bg-transparent p-3 text-sm text-black outline-none focus:border-black/30 dark:border-white/[.145] dark:text-zinc-50 dark:focus:border-white/40"
              placeholder="report.pdf"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={download}
              onChange={(e) => setDownload(e.target.checked)}
            />
            Force download (otherwise the browser may preview it inline)
          </label>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 flex h-11 items-center justify-center rounded-full bg-black text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            {submitting ? "Creating file…" : "Create file & navigate to it"}
          </button>
        </form>
      </main>
    </div>
  );
}
