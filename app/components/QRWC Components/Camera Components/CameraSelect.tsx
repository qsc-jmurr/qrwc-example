"use client";

import { useState, useEffect } from "react";
import { useQrwc } from "../../../lib/QrwcProvider";


export default function CameraSelect() {
    const [cameraCount, setCameraCount] = useState(0);
    const [cameras] = useState<{ id: number }[]>(
        Array.from({ length: cameraCount }, (_, index) => ({
            id: index
        }))
    );

    const [activeCamera, setActiveCamera] = useState<number | null>(null);

    const { qrwcInstance } = useQrwc();

    useEffect(() => {
        if (!qrwcInstance) return;

        const cameraSelectionControls = qrwcInstance?.components.camRouter?.controls

        const updateCameraCount = () => {
            // look up the number of controls that contain the "select" buttons and use that to se the count
            const count = 0
            setCameraCount(count);
        };

        cameraSelectionControls["select.1"]?.on("update", ( { Value }) => {
            if (typeof Value === 'number') {
                setActiveCamera(Value - 1);
            }
        });



        return () => {
            qrwcInstance?.close();
        };
    }, [qrwcInstance]);

    const handleCameraSelect = (cameraId: number) => {
        setActiveCamera(cameraId);
        if (!qrwcInstance) return;
        try {
            const cameraRouter = qrwcInstance?.components.camRouter.controls["select.1"];
            cameraRouter?.update(cameraId + 1); 
            console.log(`Switched to camera ${cameraId + 1}`);
        } catch (error) {
            console.error(`Error switching camera:`, error);
        }
    };



    return (
        <div>
            <section className="rounded-lg border border-neutral-700/60 bg-neutral-900/60 backdrop-blur p-4 flex flex-col gap-3 h-full">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Cameras</h2>
                <div className="grid grid-cols-2 gap-2">
                    {cameras.map((camera) => {
                        const active = activeCamera === camera.id;
                        return (
                            <button
                            key={camera.id}
                            onClick={() => handleCameraSelect(camera.id)}
                            className={`group h-20 relative flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${active ? 'border-sky-500/60 bg-gradient-to-r from-sky-600 to-cyan-500 text-white shadow' : 'border-neutral-600/70 bg-neutral-800/40 text-neutral-300 hover:bg-neutral-700/50'}`}
                            >
                                Cam {camera.id + 1}
                            </button>
                            );
                        })}
                </div>
            </section>
        </div>
    );
} 