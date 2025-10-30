"use client";

import { useState, useEffect } from "react";
import { useQrwc } from "../../../lib/QrwcProvider";


export default function Preview() {
    const { qrwcInstance } = useQrwc();
    const [previewSrc, setPreviewSrc] = useState<string | null>(null);

    useEffect(() => {
        if (!qrwcInstance) return;

        const cameraPreviewControl = qrwcInstance?.components.usbBridge?.controls["jpeg"];

        console.log(cameraPreviewControl)

        cameraPreviewControl?.on("update", () => {
            console.log(`${cameraPreviewControl} has been updated`);
            try {

            } catch (err) {

            }
        });

    }, [qrwcInstance]);

    return (
         <section className="rounded-lg border border-neutral-700/60 bg-neutral-900/60 backdrop-blur p-4 flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Preview</h2>
            <div className="relative aspect-video w-full overflow-hidden rounded-md border border-neutral-700/60 bg-neutral-800 flex items-center justify-center">
            {previewSrc ? (
                <img src={previewSrc} alt="Camera Preview" className="w-full h-full object-cover" />
                ) : (
                <span className="text-[10px] text-neutral-500">No Preview</span>
                )}
            </div>
        </section>
    );
}