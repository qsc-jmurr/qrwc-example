"use client";

import Compressor from "../components/QRWC Components/Compressor";
import EQ from "../components/QRWC Components/EQ";
import Limiter from "../components/QRWC Components/Limiter";
import Delay from "../components/QRWC Components/Delay";
import VolumeControls from "../components/QRWC Components/VolumeControls";

export default function Audio() {
    return (
        <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
            <header className="mb-10">
                <h1 className="text-3xl font-semibold tracking-tight">Audio Processing</h1>
                <p className="mt-2 text-sm text-white/50">Take control of the Q-SYS Audio DSP</p>
            </header>
            
            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                <EQ />
                <Compressor />
                <Delay />
                {/* <Limiter /> */}{/* Limiter component is currently commented out as while it is not fully implemented */}
            </div>
            
            <VolumeControls />
        </div>
    );
}
