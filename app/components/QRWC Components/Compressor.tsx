"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Chart as ChartJS,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    Filler,
    Tooltip,
    Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend);
import { useQrwc } from "../../lib/QrwcProvider";
import Fader from "../UI Components/Fader";

export default function Compressor() {
    const { qrwcInstance } = useQrwc();

    const [compressorSettings, setCompressorSettings] = useState({
        'threshold.level': -20,
        ratio: 4,
        depth: 10,
        'soft.knee': 0
    });
    const [compressorBypass, setCompressorBypass] = useState(false);

    const compressorCurve = useMemo(() => {
        const T = compressorSettings['threshold.level'];
        const R = compressorSettings.ratio;
        const K = compressorSettings['soft.knee'];
        const inMin = -60, inMax = 0, steps = 180;
        const input: number[] = []; const output: number[] = [];
        for (let i=0;i<steps;i++) {
            const xin = inMin + (inMax - inMin) * (i/(steps-1));
            let yout: number;
            if (K > 0 && xin > T - K/2 && xin < T + K/2) {
                const xk = xin - (T - K/2);
                yout = xin + ((1/R - 1) * xk * xk) / (2 * K);
            } else if (xin > T + K/2) {
                yout = T + (xin - T)/R;
            } else {
                yout = xin;
            }
            input.push(xin); output.push(yout);
        }
        return { input, output, T, K };
    }, [compressorSettings]);

    const compressorChartOptions = useMemo(()=>({
        responsive:true,
        scales:{ x:{ display:false }, y:{ display:false } },
        plugins:{ legend:{ display:false }, tooltip:{ enabled:true, callbacks:{ label:(ctx:any)=> `Out ${ctx.parsed.y.toFixed(1)} dB` } } },
        animation:{ duration:140 }
    }),[]);


    const compressorChartData = useMemo(()=>{
        const labels = compressorCurve.input.map(v=>v.toFixed(1));
        const transferData = compressorBypass ? compressorCurve.input : compressorCurve.output; // unity when bypassed
        return {
            labels,
            datasets:[
                {
                    label: compressorBypass ? 'Bypassed' : 'Transfer',
                    data: transferData,
                    borderColor: compressorBypass ? 'rgba(180,180,180,0.6)' : 'rgba(0,153,255,0.9)',
                    tension:0.05,
                    pointRadius:0,
                    borderDash: compressorBypass ? [4,4] : undefined
                },
                {
                    label:'Unity',
                    data: compressorCurve.input,
                    borderColor: 'rgba(255,255,255,0.15)',
                    borderDash:[6,6],
                    pointRadius:0
                }
            ]
        };
    },[compressorCurve, compressorBypass]);

    useEffect(() => {
        const compressorControls = qrwcInstance?.components?.testCompressor;

        compressorControls?.on("update", (control, state) => {
            const controlId = (control as any)?.id ?? (control as any)?.name;
            if (controlId === "bypass") {
                setCompressorBypass(state.Bool || false);
                return;
            }
            if (controlId) {
                setCompressorSettings(prev => ({
                    ...prev,
                    [controlId]: state.Value || prev[controlId as keyof typeof prev]
                }));
            }
        });
    }, [qrwcInstance]);

    const handleCompressorChange = async (parameter: 'threshold.level' | 'ratio' | 'depth' | 'soft.knee', value: number) => {
        setCompressorSettings(prev => ({ ...prev, [parameter]: value }));
        if (!qrwcInstance) return;
        const compressorControls = qrwcInstance?.components.testCompressor;
        const control = compressorControls?.controls[parameter];
        try {
            await control?.update(value);
            console.log(`Compressor ${parameter} set to:`, value);
        } catch (error) {
            console.error(`Error updating Compressor ${parameter}:`, error);
        }
    };
    const handleCompressorBypass = async () => {
        const newBypassState = !compressorBypass;
        setCompressorBypass(newBypassState);
        if (!qrwcInstance) return;
        const compressorControls = qrwcInstance?.components.testCompressor;
        try {
            const bypassControl = compressorControls?.controls.bypass;
            await bypassControl?.update(newBypassState);
            console.log(`Compressor bypass set to:`, newBypassState);
        } catch (error) {
            console.error(`Error updating Compressor bypass:`, error);
        }
    };

    return(
            <section className="bg-neutral-900/60 backdrop-blur rounded-xl border border-white/5 p-5 flex flex-col gap-5">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-medium tracking-wide text-white/80">Compressor</h2>
                        <button
                        onClick={handleCompressorBypass}
                        className={`text-[10px] uppercase tracking-wider font-semibold px-3 py-1 rounded-md border transition bg-gradient-to-r ${compressorBypass ? 'from-rose-600 to-pink-600 border-rose-500/40' : 'from-sky-600 to-cyan-500 border-sky-400/40'} shadow-inner`}
                        >
                            {compressorBypass ? 'Bypassed' : 'Active'}
                        </button>
                </div>
                <h5 className="left-2 text-[10px] uppercase tracking-wide text-white/40">Transfer Curve</h5>
                <div className="relative h-40">
                    <Line data={compressorChartData} options={compressorChartOptions} />
                </div>
                <div className="flex flex-col gap-4">
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-2">
                        <Fader
                            label="Thresh"
                            orientation="horizontal"
                            min={-60}
                            max={0}
                            step={0.5}
                            value={compressorSettings['threshold.level']}
                            onChange={(v)=> handleCompressorChange('threshold.level', v)}
                            formatValue={(v)=> `${v.toFixed(1)}dB`}
                        />
                        <Fader
                            label="Ratio"
                            orientation="horizontal"
                            min={1}
                            max={20}
                            step={0.1}
                            value={compressorSettings.ratio}
                            onChange={(v)=> handleCompressorChange('ratio', v)}
                            formatValue={(v)=> `${v.toFixed(1)}:1`}
                        />
                        <Fader
                            label="Depth"
                            orientation="horizontal"
                            min={0}
                            max={60}
                            step={0.5}
                            value={compressorSettings.depth}
                            onChange={(v)=> handleCompressorChange('depth', v)}
                            formatValue={(v)=> `${v.toFixed(1)}dB`}
                        />
                        <Fader
                            label="Knee"
                            orientation="horizontal"
                            min={0}
                            max={24}
                            step={0.5}
                            value={compressorSettings['soft.knee']}
                            onChange={(v)=> handleCompressorChange('soft.knee', v)}
                            formatValue={(v)=> `${v.toFixed(1)}dB`}
                        />
                    </div>
                </div>
            </section>
    )
};