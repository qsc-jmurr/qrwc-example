"use client";

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import Navbar from './NavBar';
import Footer from './Footer';
import VolumeControls from './VolumeControls';

interface ConditionalLayoutProps {
  children: ReactNode;
}

const routeConfig = {
  '/': { showNav: false, showFooter: true, showVolume: false } ,
  '/audio': { showNav: true, showFooter: true, showVolume: true },
  '/video': { showNav: true, showFooter: true, showVolume: true },
  '/camera': { showNav: true, showFooter: true, showVolume: true },

  default: { showNav: true, showFooter: true, showVolume: true }
};

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  const config = routeConfig[pathname as keyof typeof routeConfig] || routeConfig.default;

  return (
    <div className="min-h-screen flex flex-col">
      {config.showNav && <Navbar />}
      
      <div className="flex-1 w-full">
        <main className={config.showNav ? 'with-navigation' : 'full-page'}>
          {children}
        </main>
        {config.showVolume && <VolumeControls />}
      </div>
      
      {config.showFooter && <Footer />}


    </div>
  );
}