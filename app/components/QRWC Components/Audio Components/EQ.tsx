"use client";

import { useState, useEffect, useMemo } from "react";
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useQrwc } from "../../../lib/QrwcProvider";
import Fader from "../../UI Components/Fader";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend);

export default function EQ() {
    const { qrwcInstance } = useQrwc();

    const [eqBandCount, setEqBandCount] = useState<number>(4);
    const [eqBypass, setEqBypass] = useState(false);

    const [eqBands, setEqBands] = useState(() => Array.from({ length: 4 }, (_, index) => ({
        id: index,
        frequency: 1000,
        gain: 0,
        bandwidth: 1
    })));

    const eqGraph = useMemo(() => {
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
                const bwOct = Math.max(0.05, b.bandwidth); 
                const sigmaLn = (Math.log(2) * bwOct) / 2.355; 
                const d = Math.log(f / f0) / sigmaLn;
                const weight = Math.exp(-0.5 * d * d);
                total += b.gain * weight;
            }
            total = Math.max(-30, Math.min(30, total));
            mags.push(total);
        }
        return { freqs, mags };
    }, [eqBands, eqBypass]);

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

    useEffect(() => {
        const eqControls = qrwcInstance?.components?.testEQ;
        if (!eqControls) return;
        const setUpEQ = () => {
            const keys = Object.keys(eqControls.controls || {});
            const freqMatches = keys.map(k => k.match(/^frequency\.(\d+)$/)).filter(Boolean) as RegExpMatchArray[];
            
            if (freqMatches.length) {
                const maxBand = Math.max(...freqMatches.map(m => parseInt(m[1],10)));
                setEqBandCount(maxBand);           
                const currentBands = Array.from({ length: maxBand }, (_, i) => {
                    const bandNum = i + 1;
                    const freqControl = eqControls.controls[`frequency.${bandNum}`];
                    const gainControl = eqControls.controls[`gain.${bandNum}`];
                    const bwControl = eqControls.controls[`bandwidth.${bandNum}`];
                    
                    return {
                        id: i,
                        frequency: freqControl?.state?.Value ?? 1000,
                        gain: gainControl?.state?.Value ?? 0,
                        bandwidth: bwControl?.state?.Value ?? 1
                    };
                });
                
                setEqBands(currentBands);
            }
            
            const bypassControl = eqControls.controls.bypass;
            if (bypassControl?.state?.Bool !== undefined) {
                setEqBypass(bypassControl.state.Bool);
            }
            
        };

        setUpEQ();

        eqControls?.on("update", (control, state) => {
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
                    const bandIndex = bandNumber - 1;
                    
                    setEqBands(prev => prev.map((band, index) => 
                        index === bandIndex 
                            ? { ...band, [parameter]: state.Value ?? band[parameter as keyof typeof band] }
                            : band
                    ));
                }
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
    };

    return(
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
            <div className="overflow-x-auto pb-2">
                <div className="flex gap-8" style={{ minWidth: eqBandCount * 130 }}>
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
    )

}