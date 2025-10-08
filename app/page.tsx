"use client";

import Link from "next/link";


export default function Home() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-4xl flex-col items-center justify-center px-6 py-20">
      <div className="w-full max-w-xl rounded-2xl border border-neutral-800 bg-neutral-900/70 p-10 backdrop-blur-md shadow-[0_8px_40px_-12px_rgba(0,0,0,0.55)]">
        <img src="/logo-stack.png" alt="Q-SYS Horizon" className="h-24 w-auto mb-6 mx-auto drop-shadow" />
        <h1 className="text-center text-3xl md:text-4xl font-semibold tracking-tight bg-gradient-to-r from-sky-400 to-cyan-300 text-transparent bg-clip-text">QRWC Demo</h1>
        <p className="mt-4 text-center text-sm text-neutral-400">Explore live examples of QRWC Components</p>
        <div className="mt-8 w-full flex flex-wrap items-center justify-center gap-3">
          <Link href="/audio" className="inline-flex items-center justify-center rounded-md border border-neutral-600/70 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-200 hover:bg-neutral-800/70 transition-colors">Audio</Link>
          <Link href="/video" className="inline-flex items-center justify-center rounded-md border border-neutral-600/70 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-200 hover:bg-neutral-800/70 transition-colors">Video</Link>
          <Link href="/camera" className="inline-flex items-center justify-center rounded-md border border-neutral-600/70 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-200 hover:bg-neutral-800/70 transition-colors">Camera</Link>
        </div>
      </div>
    </main>
  );
}
