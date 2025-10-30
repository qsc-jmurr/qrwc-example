"use client";

import { useState, useEffect } from "react";

import { useQrwc } from "../../lib/QrwcProvider";
import { Fader } from "../UI Components/Fader";

export default function Delay() {
    const { qrwcInstance } = useQrwc();

    const [delayTime, setDelayTime] = useState(0);

    useEffect(() => {
        const delayControl = qrwcInstance?.components.testDelay?.controls["delay.1"];
        delayControl?.on("update", ({ Value, Position, String, Bool }) => {
            setDelayTime(delayControl.state.Value || delayTime)
        });
    }, [qrwcInstance]);

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

    return(
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
    )
}