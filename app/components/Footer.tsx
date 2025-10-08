import Link from "next/link";
import { useQrwc } from "../lib/QrwcProvider";
import { useMemo } from "react";

export default function Footer() {
    const { isConnected } = useQrwc();

    const statusStyles = useMemo(() => isConnected ? {
        pill: 'from-emerald-600/80 to-teal-500/70 border-emerald-400/40',
        dot: 'bg-emerald-300 shadow-[0_0_0_3px_rgba(16,185,129,0.25)]',
        label: 'text-emerald-300'
    } : {
        pill: 'from-rose-700/80 to-pink-600/70 border-rose-400/40',
        dot: 'bg-rose-300 shadow-[0_0_0_3px_rgba(244,63,94,0.25)]',
        label: 'text-rose-300'
    }, [isConnected]);

    return (

    <footer className="sticky top-0 z-40 w-full backdrop-blur supports-[backdrop-filter]:bg-neutral-900/70 border-b border-neutral-800/80">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 py-3">
         <div className="flex items-center gap-3 min-w-[9rem]" aria-live="polite">
                       <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[0.55rem] font-medium tracking-wide bg-gradient-to-r ${statusStyles.pill}`}>
                           <span className={`h-2.5 w-2.5 rounded-full ${statusStyles.dot}`} aria-hidden="true" />
                           <span className={`uppercase ${statusStyles.label}`}>QRWC Status: {isConnected ? 'Connected' : 'Offline'}</span>
                       </div>
                   </div>
            <div className="flex items-center gap-3 min-w-[13rem] justify-end">
                         <span className="text-[0.55rem] text-white/40">Made by <span className="text-white/70 font-medium">Jasper&nbsp;Murrell</span></span>
                         <Link
                            href='https://github.com/qsc-jmurr'
                             target="_blank"
                             rel="noopener noreferrer"
                             aria-label="GitHub Profile"
                             className="h-7 w-7 rounded-lg border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:border-white/40 transition bg-neutral-800/60"
                         >
                             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-github" viewBox="0 0 16 16">
                                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"/>
                            </svg>
                         </Link>
                     </div>
      </div>
    </footer>
    );
}