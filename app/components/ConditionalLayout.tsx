"use client";

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import Navbar from './UI Components/NavBar';
import Footer from './UI Components/Footer';

interface ConditionalLayoutProps {
  children: ReactNode;
}

const routeConfig = {
  '/': { showNav: false, showFooter: true },
  '/audio': { showNav: true, showFooter: true },
  '/video': { showNav: true, showFooter: true },
  '/camera': { showNav: true, showFooter: true },

  default: { showNav: true, showFooter: true }
};

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  const config = routeConfig[pathname as keyof typeof routeConfig] || routeConfig.default;

  return (
    <div className="min-h-screen flex flex-col">
      {config.showNav && <Navbar />}
      
      <main className="flex-1 w-full">
        {children}
      </main>
      
      {config.showFooter && <Footer />}
    </div>
  );
}