"use client";

import { usePathname } from 'next/navigation';
import Link from "next/link";

export default function NavBar() {
  const pathname = usePathname();
  if (pathname === '/') return null; // hide on home

  const linkBase = 'relative inline-flex items-center justify-center rounded-md px-3 py-2 text-[11px] font-semibold uppercase tracking-wide transition-colors';
  const inactive = 'text-neutral-300/80 hover:text-white hover:bg-white/5';
  const active = 'text-white bg-white/10';

  const NavL = ({ href, label }: { href: string; label: string }) => {
    const isActive = pathname.startsWith(href);
    return (
      <Link
        href={href}
        aria-current={isActive ? 'page' : undefined}
        className={`${linkBase} ${isActive ? active : inactive}`}
      >
        {label}
        {isActive && (
          <span className="pointer-events-none absolute inset-x-2 -bottom-1 h-0.5 rounded-full bg-gradient-to-r from-sky-500 to-cyan-400" />
        )}
      </Link>
    )
  };

  return (
    <nav className="sticky top-0 z-40 w-full backdrop-blur supports-[backdrop-filter]:bg-neutral-900/70 border-b border-neutral-800/80">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 py-3">
        <Link href="/" aria-label="Home" className="inline-flex items-center gap-2">
          <img src="/logo-horizon.png" alt="Q-SYS" className="h-8 w-auto" />
        </Link>
        <div className="flex items-center gap-2" role="menubar" aria-label="Primary">
          <NavL href="/audio" label="Audio" />
          <NavL href="/video" label="Video" />
          <NavL href="/camera" label="Camera" />
        </div>
      </div>
    </nav>
  );
}