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
import { useQrwc } from "../lib/QrwcProvider";
import Fader from "../components/Fader";

export default function Audio() {
    const { qrwcInstance } = useQrwc();

    // Dynamically determine EQ band count from available controls when instance ready
    const [eqBandCount, setEqBandCount] = useState<number>(4);
    const [eqBands, setEqBands] = useState(() => Array.from({ length: 4 }, (_, index) => ({
        id: index,
        frequency: 1000,
        gain: 0,
        bandwidth: 1
    })));
    const [eqBypass, setEqBypass] = useState(false);
    const [compressorBypass, setCompressorBypass] = useState(false);
    const [limiterBypass, setLimiterBypass] = useState(false);

    const [compressorSettings, setCompressorSettings] = useState({
        'threshold.level': -20,
        ratio: 4,
        depth: 10,
        'soft.knee': 0
    });

    const [delayTime, setDelayTime] = useState(0); // in milliseconds
    
    const [limiterSettings, setLimiterSettings] = useState({
        'threshold.level': -20,
        attack: 0.01,
        release: 0.1
    });

    /* -------------------- Derived Data For Graphs -------------------- */
    // EQ response (log spaced frequency points)
    const eqGraph = useMemo(() => {
        // Treat stored 'bandwidth' control value as bandwidth in octaves (common for some DSPs)
        // Previous implementation assumed it was Q and inverted the visual width.
        const minF = 10, maxF = 20000;
        const points = 256;
        const freqs: number[] = [];
        const mags: number[] = [];
        for (let i=0;i<points;i++) {
            const t = i/(points-1);
            const f = minF * Math.pow(maxF/minF, t);
            freqs.push(f);
            if (eqBypass) { mags.push(0); continue; }
            let total = 0;
            for (const b of eqBands) {
                const f0 = Math.max(10, b.frequency);
                const bwOct = Math.max(0.05, b.bandwidth); // interpret directly as octave bandwidth
                // Convert octave bandwidth (FWHM) to log-frequency Gaussian sigma approximation
                const sigmaLn = (Math.log(2) * bwOct) / 2.355; // FWHM -> sigma
                const d = Math.log(f / f0) / sigmaLn;
                const weight = Math.exp(-0.5 * d * d);
                total += b.gain * weight;
            }
            total = Math.max(-30, Math.min(30, total));
            mags.push(total);
        }
        return { freqs, mags };
    }, [eqBands, eqBypass]);

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

    /* -------------------- Chart Config Generators -------------------- */
    const eqChartData = useMemo(() => ({
        labels: eqGraph.freqs.map(f => f < 1000 ? `${Math.round(f)}Hz` : `${(f/1000).toFixed(1)}k`),
        datasets: [{
            label: 'EQ Response (dB)',
            data: eqGraph.mags,
            tension: 0.25,
            borderColor: eqBypass ? 'rgba(180,180,180,0.5)' : 'rgba(0,153,255,0.9)',
            pointRadius: 0,
            fill: true,
            backgroundColor: (ctx:any) => {
                const { chart } = ctx;
                const { ctx: c, chartArea } = chart;
                if (!chartArea) return 'rgba(0,153,255,0.08)';
                const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                g.addColorStop(0, 'rgba(0,153,255,0.25)');
                g.addColorStop(1, 'rgba(0,153,255,0.0)');
                return g;
            }
        }]
    }), [eqGraph, eqBypass]);

    const eqChartOptions = useMemo(() => ({
        responsive: true,
        scales: {
            x: { ticks: { maxTicksLimit: 10, color:'#999', callback:function(tickValue: string | number){
                const numericIndex = typeof tickValue === 'string' ? parseInt(tickValue,10) : tickValue;
                const label = (eqChartData.labels as string[])[numericIndex];
                if (!label) return '';
                return ['20Hz','50Hz','100Hz','200Hz','500Hz','1.0k','2.0k','5.0k','10.0k','20.0k'].includes(label) ? label : '';
            }}, grid:{ color:'rgba(255,255,255,0.06)' } },
            y: { min:-30, max:30, ticks:{ stepSize:6, color:'#999' }, grid:{ color:'rgba(255,255,255,0.06)' } }
        },
        plugins:{ legend:{ display:false }, tooltip:{ enabled:true, callbacks:{ label:(ctx:any)=> `${ctx.parsed.y.toFixed(2)} dB` } } },
        animation: { duration:160 }
    }), [eqChartData.labels]);

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

    const compressorChartOptions = useMemo(()=>({
        responsive:true,
        scales:{ x:{ display:false }, y:{ display:false } },
        plugins:{ legend:{ display:false }, tooltip:{ enabled:true, callbacks:{ label:(ctx:any)=> `Out ${ctx.parsed.y.toFixed(1)} dB` } } },
        animation:{ duration:140 }
    }),[]);

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
        const eqControls = qrwcInstance?.components.testEQ;
        // Detect band count by scanning control keys: frequency.N
        if (eqControls) {
            const keys = Object.keys(eqControls.controls || {});
            const freqMatches = keys.map(k => k.match(/^frequency\.(\d+)$/)).filter(Boolean) as RegExpMatchArray[];
            if (freqMatches.length) {
                const maxBand = Math.max(...freqMatches.map(m => parseInt(m[1],10)));
                if (maxBand !== eqBandCount) {
                    setEqBandCount(maxBand);
                    setEqBands(prev => {
                        const next = Array.from({ length: maxBand }, (_, i) => prev[i] || ({
                            id: i,
                            frequency: 1000,
                            gain: 0,
                            bandwidth: 1
                        }));
                        return next;
                    });
                }
            }
        }
        const compressorControls = qrwcInstance?.components.testCompressor;
        const delayControl = qrwcInstance?.components.testDelay?.controls["delay.1"];
        const limiterControls = qrwcInstance?.components.testLimiter;

        eqControls?.on("update", (control, state) => {
            // Use control id or name (if available) instead of comparing the control object to a string
            const controlId = (control as any)?.id ?? (control as any)?.name;
            if (controlId === "bypass") {
                setEqBypass(state.Bool || false);
                return;
            }
            if (controlId && controlId.includes(".")) {
                const match = controlId.match(/^(frequency|gain|bandwidth)\.(\d+)$/);
                if (match) {
                    const [, parameter, bandNumberStr] = match;
                    const bandNumber = parseInt(bandNumberStr);
                    const bandIndex = bandNumber - 1; // Convert to 0-based index
                    
                    if (bandIndex >= 0 && bandIndex < eqBands.length) {
                        setEqBands(prev => prev.map((band, index) => 
                            index === bandIndex 
                                ? { ...band, [parameter]: state.Value || band[parameter as keyof typeof band] }
                                : band
                        ));
                    }
                }
            }
        });
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
        delayControl?.on("update", () => {
            setDelayTime(delayControl.state.Value || delayTime);
        });
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

    const handleEqChange = async (bandIndex: number, parameter: 'frequency' | 'gain' | 'bandwidth', value: number) => {
        setEqBands(prev => prev.map((band, index) => 
            index === bandIndex 
                ? { ...band, [parameter]: value }
                : band
        ));
        
        if (!qrwcInstance) return;

        const eqControls = qrwcInstance?.components.testEQ;
        const controlName = `${parameter}.${bandIndex + 1}`;
        const control = eqControls?.controls[controlName];
        
        try {
            await control?.update(value);
            console.log(`EQ ${controlName} set to:`, value);
        } catch (error) {
            console.error(`Error updating EQ ${controlName}:`, error);
        }
    };
    
    const handleEqBypass = async () => {
        const newBypassState = !eqBypass;
        setEqBypass(newBypassState);
        
        if (!qrwcInstance) return;

        const eqControls = qrwcInstance?.components.testEQ;
        try {
            const bypassControl = eqControls?.controls.bypass;
            await bypassControl?.update(newBypassState);
            console.log(`EQ bypass set to:`, newBypassState);
        } catch (error) {
            console.error(`Error updating EQ bypass:`, error);
        }
    }

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
    }

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
    }

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
    }

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
    }

    const handleDelayChange = (value: number) => {
        setDelayTime(value);

        if (!qrwcInstance) return;
        const delayControl = qrwcInstance?.components.testDelay?.controls["delay.1"];
        try {
            delayControl?.update(value);
            console.log(`Delay time set to:`, value);
        } catch (error) {
            console.error(`Error updating delay time:`, error);
        }
    }

    return (
        <div className="max-w-7xl mx-auto px-6 py-10">
            <header className="mb-10">
                <h1 className="text-3xl font-semibold tracking-tight">Audio Processing</h1>
                <p className="mt-2 text-sm text-white/50">Take control of the Q-SYS Audio DSP</p>
            </header>
            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                {/* Equaliser */}
                <section className="bg-neutral-900/60 backdrop-blur rounded-xl border border-white/5 p-5 flex flex-col gap-5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-medium tracking-wide text-white/80">Equaliser</h2>
                        <button
                          onClick={handleEqBypass}
                          className={`text-[10px] uppercase tracking-wider font-semibold px-3 py-1 rounded-md border transition bg-gradient-to-r ${eqBypass ? 'from-rose-600 to-pink-600 border-rose-500/40' : 'from-sky-600 to-cyan-500 border-sky-400/40'} shadow-inner`}
                        >
                          {eqBypass ? 'Bypassed' : 'Active'}
                        </button>
                    </div>
                    <h5 className="left-2 text-[10px] uppercase tracking-wide text-white/40">Frequency Response</h5>
                    <div className="relative h-40">
                        <Line data={eqChartData} options={eqChartOptions} />
                        
                    </div>
                                                            <div
                                                                className="overflow-x-auto pb-2"
                                                            >
                                                                <div
                                                                    className="flex gap-8"
                                                                    style={{ minWidth: eqBandCount * 130 }}
                                                                >
                        {eqBands.map((band, index) => {
                            const bwOct = band.bandwidth;
                            const Q = 1.44 / bwOct;
                            return (
                                                                <div key={band.id} className="flex flex-col items-center gap-4 min-w-[7rem]">
                                                                        <span className="text-[10px] font-medium text-white/60 uppercase tracking-wide">Band {index+1}</span>
                                                                        <div className="flex items-end gap-4">
                                                                            <Fader
                                                                                label="Freq"
                                                                                color="green"
                                                                                scale="log"
                                                                                min={10}
                                                                                max={20000}
                                                                                value={band.frequency}
                                                                                onChange={(v)=> handleEqChange(index,'frequency', v)}
                                                                                formatValue={(v)=> v < 1000 ? `${Math.round(v)}Hz` : `${(v/1000).toFixed(1)}k`}
                                                                            />
                                                                            <Fader
                                                                                label="Gain"
                                                                                color="blue"
                                                                                min={-30}
                                                                                max={30}
                                                                                step={0.5}
                                                                                value={band.gain}
                                                                                onChange={(v)=> handleEqChange(index,'gain', v)}
                                                                                formatValue={(v)=> `${v.toFixed(1)}dB`}
                                                                            />
                                                                            <Fader
                                                                                label="BW"
                                                                                color="yellow"
                                                                                min={0.1}
                                                                                max={4}
                                                                                step={0.05}
                                                                                value={band.bandwidth}
                                                                                onChange={(v)=> handleEqChange(index,'bandwidth', v)}
                                                                                formatValue={(v)=> `${v.toFixed(2)}`}
                                                                            />
                                                                        </div>
                                                                        <span className="text-[9px] text-white/40">Q≈{Q.toFixed(2)}</span>
                                                                </div>
                            );
                                                })}
                                            </div>
                                        </div>
                </section>

                {/* Compressor */}
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

                {/* Delay */}
                <section className="bg-neutral-900/60 backdrop-blur rounded-xl border border-white/5 p-5 flex flex-col gap-5">
                    <h2 className="text-sm font-medium tracking-wide text-white/80">Delay</h2>
                    
                                        <div className="flex flex-col gap-4">
                                            <Fader
                                                label="Time"
                                                orientation="horizontal"
                                                min={0}
                                                max={0.5}
                                                step={0.01}
                                                value={delayTime}
                                                onChange={(v)=> handleDelayChange(v)}
                                                formatValue={(v)=> `${(v*1000).toFixed(0)}ms`}
                                            />
                                        </div>
                </section>

                {/* Limiter */}
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
            </div>
        </div>
    );
}
