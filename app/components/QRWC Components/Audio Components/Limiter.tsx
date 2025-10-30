"use client";

import { useState, useEffect, useMemo } from "react";
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useQrwc } from "../../../lib/QrwcProvider";
import Fader from "../../UI Components/Fader";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend);

export default function Limiter() {
    const { qrwcInstance } = useQrwc();

    const [limiterSettings, setLimiterSettings] = useState({
        'threshold.level': -20,
        attack: 0.01,
        release: 0.1
    });
    const [limiterBypass, setLimiterBypass] = useState(false);

    const limiterCurve = useMemo(() => {
        const T = limiterSettings['threshold.level'];
        const inMin = -60, inMax = 0, steps = 4;
        const input: number[] = []; const output: number[] = [];
        for (let i=0;i<steps;i++) {
            const xin = inMin + (inMax-inMin)*(i/(steps-1));
            let yout: number;
            if (xin <= T) yout = xin; else yout = T; // brick wall
            input.push(xin); output.push(yout);
        }
        return { input, output, T };
    }, [limiterSettings]);
    const limiterChartData = useMemo(()=>{
        const labels = limiterCurve.input.map(v=>v.toFixed(1));
        const activeData = limiterBypass ? limiterCurve.input : limiterCurve.output; // unity when bypassed
        return {
            labels,
            datasets:[
                {
                    label: limiterBypass ? 'Bypassed' : 'Limiter',
                    data: activeData,
                    borderColor: limiterBypass ? 'rgba(180,180,180,0.6)' : 'rgba(34,197,94,0.9)',
                    pointRadius:0,
                    tension:0,
                    borderDash: limiterBypass ? [4,4] : undefined
                },
                {
                    label:'Unity',
                    data: limiterCurve.input,
                    borderColor:'rgba(255,255,255,0.15)',
                    borderDash:[6,6],
                    pointRadius:0
                }
            ]
        };
    },[limiterCurve, limiterBypass]);

    const limiterChartOptions = useMemo(()=>({
        responsive:true,
        scales:{ x:{ display:false }, y:{ display:false } },
        plugins:{ legend:{ display:false }, tooltip:{ enabled:true, callbacks:{ label:(ctx:any)=> `Out ${ctx.parsed.y.toFixed(1)} dB` } } },
        animation:{ duration:140 }
    }),[]);

    useEffect(() => {
        const limiterControls = qrwcInstance?.components.testLimiter;
        if (!limiterControls) return;

        limiterControls?.on("update", (control, state) => {
            const controlId = (control as any)?.id ?? (control as any)?.name;
            if (controlId === "bypass") {
                setLimiterBypass(state.Bool || false);
                return;
            }
            if (controlId) {
                setLimiterSettings(prev => ({
                    ...prev,
                    [controlId]: state.Value || prev[controlId as keyof typeof prev]
                }));
            }
        });


    }, [qrwcInstance]);

    const handleLimiterChange = async (parameter: 'threshold.level' | 'attack' | 'release', value: number) => {
        setLimiterSettings(prev => ({ ...prev, [parameter]: value }));
        if (!qrwcInstance) return;
        const limiterControls = qrwcInstance?.components.testLimiter;
        const control = limiterControls?.controls[parameter];
        try {
            await control?.update(value);
            console.log(`Limiter ${parameter} set to:`, value);
        } catch (error) {
            console.error(`Error updating Limiter ${parameter}:`, error);
        }
    };

    const handleLimiterBypass = async () => {
        const newBypassState = !limiterBypass;
        setLimiterBypass(newBypassState);
        if (!qrwcInstance) return;
        const limiterControls = qrwcInstance?.components.testLimiter;
        try {
            const bypassControl = limiterControls?.controls.bypass;
            await bypassControl?.update(newBypassState);
            console.log(`Limiter bypass set to:`, newBypassState);
        } catch (error) {
            console.error(`Error updating Limiter bypass:`, error);
        }   
    };

    return (
        <section className="bg-neutral-900/60 backdrop-blur rounded-xl border border-white/5 p-5 flex flex-col gap-5">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium tracking-wide text-white/80">Limiter</h2>
                <button
                    onClick={handleLimiterBypass}
                                            className={`text-[10px] uppercase tracking-wider font-semibold px-3 py-1 rounded-md border transition bg-gradient-to-r ${limiterBypass ? 'from-rose-600 to-pink-600 border-rose-500/40' : 'from-sky-600 to-cyan-500 border-sky-400/40'} shadow-inner`}
                >
                                            {limiterBypass ? 'Bypassed' : 'Active'}
                </button>
            </div>
            <h5 className="left-2 text-[10px] uppercase tracking-wide text-white/40">Ceiling Curve</h5>
            <div className="relative h-40">
            <Line data={limiterChartData} options={limiterChartOptions} />
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    <Fader
                        label="Thresh"
                        orientation="horizontal"
                        min={-60}
                        max={0}
                        step={0.5}
                        value={limiterSettings['threshold.level']}
                        onChange={(v)=> handleLimiterChange('threshold.level', v)}
                        formatValue={(v)=> `${v.toFixed(1)}dB`}
                    />
                    <Fader
                        label="Attack"
                        orientation="horizontal"
                        min={0.001}
                        max={0.1}
                        step={0.001}
                        value={limiterSettings.attack}
                        onChange={(v)=> handleLimiterChange('attack', v)}
                        formatValue={(v)=> `${(v*1000).toFixed(1)}ms`}
                    />
                    <Fader
                        label="Release"
                        orientation="horizontal"
                        min={0.01}
                        max={2}
                        step={0.01}
                        value={limiterSettings.release}
                        onChange={(v)=> handleLimiterChange('release', v)}
                        formatValue={(v)=> `${(v*1000).toFixed(0)}ms`}
                     />
                </div>
        </section>
    )
};