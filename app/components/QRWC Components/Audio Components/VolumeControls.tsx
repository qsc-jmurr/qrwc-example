"use client";

import { useState, useEffect } from "react";
import { useQrwc } from "../../../lib/QrwcProvider";

export default function VolumeControls() {
    const { qrwcInstance } = useQrwc();

    const [gain, setGain] = useState<number>(0);
    const [isMuted, setIsMuted] = useState<boolean>(false);
    const [updating, setUpdating] = useState(false);
    
    useEffect(() => {
        const gainControl = qrwcInstance?.components.Gain?.controls.gain;
        const muteControl = qrwcInstance?.components.Gain?.controls.mute;

        gainControl?.on("update", ({ Value, Position, String, Bool }) => {
        console.log("Gain Control Updated:", { Value, Position, String, Bool });
        if (typeof Value === "number") {
            setGain(Value);
        }
        });

        muteControl?.on("update", ({ Value, Position, String, Bool }) => {
        console.log("Mute Control Updated:", { Value, Position, String, Bool });
            if (typeof Bool === "boolean") {
            setIsMuted(Bool);
        }
        });

    }, [qrwcInstance]);

    const handleGainChange = async (v: number) => {
        if (!qrwcInstance) return;
        try{
            setUpdating(true);
            await qrwcInstance.components.Gain.controls.gain.update(v);
            console.log("Gain set to:", v);
        } catch (error) {
            console.error("Error setting gain:", error);
        } finally {
            setUpdating(false);
        }
    };

    const handleToggleMute = async () => {
        if (!qrwcInstance) return;
        try {
            setUpdating(true);
            await qrwcInstance.components.Gain.controls.mute.update(!isMuted);
            console.log("Mute toggled");
        } catch (error) {
            console.error("Error toggling mute:", error);
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="w-full">
            <div className="mx-auto max-w-7xl">
                <div className="rounded-2xl border border-white/10 bg-neutral-900/80 backdrop-blur-xl px-6 py-4 flex items-center gap-8 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)]">
                    <div className="flex flex-col gap-2 min-w-[5.5rem]">
                        <button
                          onClick={handleToggleMute}
                          disabled={updating}
                          className={`text-[0.6rem] uppercase tracking-wide font-semibold px-3 py-2 rounded-md border transition bg-gradient-to-r ${isMuted ? 'from-rose-600 to-pink-600 border-rose-400/40' : 'from-emerald-600 to-teal-500 border-emerald-400/40'} disabled:opacity-40`}
                        >
                          {isMuted ? 'Unmute' : 'Mute'}
                        </button>
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[0.5rem] tracking-wide text-white/40">
                      </div>
                      <input
                        type="range"
                        min={-100}
                        max={20}
                        step={0.5}
                        value={gain}
                        onChange={(e)=> handleGainChange(Number(e.target.value))}
                        className="w-full accent-sky-400 h-2 cursor-pointer [--track-bg:theme(colors.neutral.700)]"
                      />
                    </div>
                    <div className="text-[0.75rem] text-white/40 leading-tight">
                        Gain<br/><span className="text-white/70 font-medium">{gain.toFixed(1)} dB</span>
                    </div>
                </div>
            </div>
        </div>
    );
}