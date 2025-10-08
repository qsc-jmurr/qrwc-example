"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQrwc } from "../lib/QrwcProvider";


export default function Camera() {
    const cameraCount = 4;
    const [cameras] = useState<{ id: number }[]>(
        Array.from({ length: cameraCount }, (_, index) => ({
            id: index
        }))
    );

    const { qrwcInstance } = useQrwc();
    const [activeCamera, setActiveCamera] = useState<number | null>(null);
    const joystickContainerRef = useRef<HTMLDivElement>(null);
    const knobRef = useRef<HTMLDivElement>(null);
    const isDraggingRef = useRef(false);
    const frameRequestRef = useRef<number | null>(null);
    const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
    const [previewSrc, setPreviewSrc] = useState<string | null>(null);

    useEffect(() => {
        if (!qrwcInstance) return;

        const cameraSelectionControl = qrwcInstance?.components.camRouter.controls["select.1"]; 
        const cameraPreviewControl = qrwcInstance?.components.usbBridge.controls["jpeg"];

        console.log(cameraPreviewControl)

        cameraSelectionControl?.on("update", ({ Value }) => {
            if (typeof Value === 'number') {
                // Assuming control Value is 1-based index of camera
                setActiveCamera(Value - 1);
            }
        });
        

        // Initialize from current control state if present
        const currentValue = (cameraSelectionControl as any)?.state?.Value;
        if (typeof currentValue === 'number') {
            setActiveCamera(currentValue - 1);
        }

        cameraPreviewControl?.on("update", () => {
            console.log(`${cameraPreviewControl} has been updated`);
            try {
                
            } catch (err) {
                // Non JSON; ignore
            }
        });

        
    }, [qrwcInstance]);
    
    // Derived joystick radius (in px) - matches CSS size (container 180px; radius ~ 80 limit within padding)
    const JOYSTICK_LIMIT = 70; // max travel from center in px

    const resetJoystick = useCallback(() => {
        setJoystickPos({ x: 0, y: 0 });
        handleJoystickMove(0, 0);
    }, []);

    // Pointer event handlers for custom joystick (always active now)
    useEffect(() => {
        const container = joystickContainerRef.current;
        if (!container) return;

        const handlePointerDown = (e: PointerEvent) => {
            if (activeCamera === null) return; // require active camera
            isDraggingRef.current = true;
            container.setPointerCapture(e.pointerId);
            updatePositionFromEvent(e);
        };
        const handlePointerMove = (e: PointerEvent) => {
            if (!isDraggingRef.current) return;
            updatePositionFromEvent(e);
        };
        const handlePointerUp = (e: PointerEvent) => {
            if (!isDraggingRef.current) return;
            isDraggingRef.current = false;
            container.releasePointerCapture(e.pointerId);
            animateReturn();
        };

        const updatePositionFromEvent = (e: PointerEvent) => {
            const rect = container.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const dx = e.clientX - cx;
            const dy = e.clientY - cy;
            // invert y (screen y down -> positive) to logical up positive
            const clamped = clampToCircle(dx, dy, JOYSTICK_LIMIT);
            setJoystickPos(clamped);
            scheduleMove(clamped.x, clamped.y);
        };

        const handleBlur = () => {
            if (isDraggingRef.current) {
                isDraggingRef.current = false;
                animateReturn();
            }
        };

        container.addEventListener('pointerdown', handlePointerDown);
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('blur', handleBlur);

        return () => {
            container.removeEventListener('pointerdown', handlePointerDown);
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('blur', handleBlur);
            resetJoystick();
        };
    }, [activeCamera, resetJoystick]);

    // Handler for fallback JPEG updates
    const handleFallbackFrame = (payload: any) => {
        try {
            const raw = payload?.String || (typeof payload?.Value === 'string' ? payload.Value : null);
            if (!raw) return;
            // Accept already-formatted data URLs or plain base64
            const src = raw.startsWith('data:image') ? raw : `data:image/jpeg;base64,${raw.replace(/^data:image\/jpeg;base64,/,'')}`;
            setPreviewSrc(src);
        } catch (e) {
            console.error('Error processing preview frame', e);
        }
    };

    // Utility: clamp vector to circle
    const clampToCircle = (x: number, y: number, r: number) => {
        const mag = Math.hypot(x, y);
        if (mag <= r) return { x, y };
        const scale = r / mag;
        return { x: x * scale, y: y * scale };
    };

    // Throttle joystick movement to animation frames
    const scheduleMove = (x: number, y: number) => {
        if (frameRequestRef.current) cancelAnimationFrame(frameRequestRef.current);
        frameRequestRef.current = requestAnimationFrame(() => {
            // normalize to -1..1
            const nx = x / JOYSTICK_LIMIT;
            const ny = -y / JOYSTICK_LIMIT; // invert y back so up is positive
            handleJoystickMove(nx, ny);
        });
    };

    const animateReturn = () => {
        const start = performance.now();
        const startPos = { ...joystickPos };
        const DURATION = 120; // ms
        const step = (ts: number) => {
            const t = Math.min(1, (ts - start) / DURATION);
            const ease = 1 - Math.pow(1 - t, 3);
            const x = startPos.x * (1 - ease);
            const y = startPos.y * (1 - ease);
            setJoystickPos({ x, y });
            scheduleMove(x, y); // keep sending decel speeds
            if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    };

    const handleCameraSelect = (cameraId: number) => {
        setActiveCamera(cameraId);
        
        if (!qrwcInstance) return;

        try {
            const cameraRouter = qrwcInstance?.components.camRouter.controls["select.1"];
            cameraRouter?.update(cameraId + 1); // Assuming camera IDs start from 0 and control values from 1
            console.log(`Switched to camera ${cameraId + 1}`);
        } catch (error) {
            console.error("Error switching camera:", error);
        }
    }

    const handleJoystickMove = (x: number, y: number) => {
        if (!qrwcInstance || activeCamera === null) return;

        try {
            // Use ptzControl component (adjust path if different in your design)
            const ptz = qrwcInstance.components.ptzControl || qrwcInstance.components.usbBridge;
            if (!ptz) return;

            const DEADZONE = 0; // 8% of full deflection
            const pan = Math.abs(x) < DEADZONE ? 0 : x;  
            const tilt = Math.abs(y) < DEADZONE ? 0 : y; 
            const controls = ptz.controls;

            // Helper to safely update a momentary control (0/1)
            const press = (name: string) => {
                const c = controls?.[name];
                if (c && c.update) c.update(1);
            };
            const release = (name: string) => {
                const c = controls?.[name];
                if (c && c.update) c.update(0);
            };

            // Track which logical buttons we want active this frame
            const desired: string[] = [];

            // Determine directional intent. If you truly have diagonal virtual buttons, you could map them here.
            // Priority: If both pan and tilt are non-zero and diagonals exist, choose diagonal; otherwise fire both axis buttons.
            const haveDiagonalButtons = !!(controls?.['pan.left.tilt.up'] || controls?.['pan.left.tilt.down'] || controls?.['pan.right.tilt.up'] || controls?.['pan.right.tilt.down']);

            const panDir = pan === 0 ? 0 : pan > 0 ? 1 : -1;
            const tiltDir = tilt === 0 ? 0 : tilt > 0 ? 1 : -1;

            if (panDir === 0 && tiltDir === 0) {
                // nothing pressed
            } else if (haveDiagonalButtons && panDir !== 0 && tiltDir !== 0) {
                // Choose appropriate diagonal
                if (panDir === -1 && tiltDir === 1) desired.push('pan.left.tilt.up');
                if (panDir === -1 && tiltDir === -1) desired.push('pan.left.tilt.down');
                if (panDir === 1 && tiltDir === 1) desired.push('pan.right.tilt.up');
                if (panDir === 1 && tiltDir === -1) desired.push('pan.right.tilt.down');
            } else {
                // Use single-axis buttons (can allow both pan + tilt simultaneously if hardware permits)
                if (panDir === 1) desired.push('pan.right');
                if (panDir === -1) desired.push('pan.left');
                if (tiltDir === 1) desired.push('tilt.up');
                if (tiltDir === -1) desired.push('tilt.down');
            }

            const allButtons = [
                'pan.left','pan.right','tilt.up','tilt.down',
                'pan.left.tilt.up','pan.left.tilt.down','pan.right.tilt.up','pan.right.tilt.down'
            ];

            // Release those not desired
            for (const btn of allButtons) {
                if (controls?.[btn]) {
                    if (!desired.includes(btn)) release(btn);
                }
            }

            // Press desired ones
            for (const btn of desired) press(btn);

            // Optional: if you also have speed-based controls (panSpeed/tiltSpeed) update them proportionally
            if (controls?.panSpeed && controls?.panSpeed.update) {
                controls.panSpeed.update(Math.round(pan * 100));
            }
            if (controls?.tiltSpeed && controls?.tiltSpeed.update) {
                controls.tiltSpeed.update(Math.round(tilt * 100));
            }

            // Debug output
            console.log(`Joystick PTZ intent pan=${panDir} tilt=${tiltDir} buttons=[${desired.join(', ')}] raw=(${pan.toFixed(2)}, ${tilt.toFixed(2)})`);
        } catch (error) {
            console.error("Error controlling PTZ with joystick:", error);
        }
    };

    // Zoom momentary controls (press=1, release=0). Supports multiple possible naming variants.
    const resolveZoomControl = (direction: 'in' | 'out') => {
        const base = qrwcInstance?.components.usbBridge?.controls || qrwcInstance?.components.ptzControl?.controls;
        if (!base) return undefined;
        const candidates = direction === 'in'
            ? ['zoom.in','zoomIn','zoom_plus','zoom+']
            : ['zoom.out','zoomOut','zoom_minus','zoom-'];
        for (const name of candidates) {
            if ((base as any)[name]) return (base as any)[name];
        }
        return undefined;
    };

    const handleZoomPress = (direction: 'in' | 'out') => {
        if (!qrwcInstance || activeCamera === null) return;
        try {
            const control = resolveZoomControl(direction);
            control?.update?.(1);
        } catch (err) {
            console.error('Error zoom press', direction, err);
        }
    };
    const handleZoomRelease = (direction: 'in' | 'out') => {
        if (!qrwcInstance || activeCamera === null) return;
        try {
            const control = resolveZoomControl(direction);
            control?.update?.(0);
        } catch (err) {
            console.error('Error zoom release', direction, err);
        }
    };

                return (
                    <div className="max-w-7xl mx-auto px-6 py-10">
                        <header className="mb-8 space-y-2">
                            <h1 className="text-2xl font-semibold tracking-tight">Camera Control</h1>
                            <p className="text-sm text-neutral-400">Example of camera controls with joystick</p>
                        </header>
                        <div className="grid gap-6 md:grid-cols-3">
                            {/* Preview */}
                            <section className="rounded-lg border border-neutral-700/60 bg-neutral-900/60 backdrop-blur p-4 flex flex-col gap-3">
                                <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Preview</h2>
                                <div className="relative aspect-video w-full overflow-hidden rounded-md border border-neutral-700/60 bg-neutral-800 flex items-center justify-center">
                                    {previewSrc ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={previewSrc} alt="Camera Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-[10px] text-neutral-500">No Preview</span>
                                    )}
                                </div>
                            </section>

                            {cameraCount > 1 && (
                                <section className="rounded-lg border border-neutral-700/60 bg-neutral-900/60 backdrop-blur p-4 flex flex-col gap-3">
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
                            )}
                            

                            {/* PTZ */}
                            <section className="rounded-lg border border-neutral-700/60 bg-neutral-900/60 backdrop-blur p-4 flex flex-col gap-4 col-span-full md:col-span-1">
                                <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">PTZ</h2>
                                {activeCamera === null ? (
                                    <div className="text-xs rounded-md border border-amber-400/40 bg-amber-500/10 text-amber-300 px-3 py-2">Select a camera to enable controls.</div>
                                ) : (
                                    <div className="flex justify-center gap-6 md:flex-col md:items-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <label className="text-[10px] uppercase tracking-wide text-neutral-400">Pan / Tilt</label>
                                            <div
                                                ref={joystickContainerRef}
                                                id="camera-joystick-container"
                                                className={`relative w-44 h-44 rounded-full border border-neutral-600/70 bg-neutral-800/70 overflow-hidden select-none ${activeCamera === null ? 'opacity-40 grayscale' : ''}`}
                                                aria-label="Camera PTZ Joystick"
                                                role="application"
                                            >
                                                <div
                                                    ref={knobRef}
                                                    className="absolute content-center top-1/2 left-1/2 w-16 h-16 -translate-x-1/20 -translate-y-1/20 rounded-full bg-gradient-to-br from-red-400 to-red-600 shadow-lg shadow-red-900/30 ring-1 ring-red-300/30 flex items-center justify-center"
                                                    style={{ transform: `translate(calc(-50% + ${joystickPos.x}px), calc(-50% + ${joystickPos.y}px))` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center gap-2">
                                            <label className="text-[10px] uppercase tracking-wide text-neutral-400">Zoom</label>
                                            <div className="flex gap-2">
                                                <button
                                                    onMouseDown={() => handleZoomPress('in')}
                                                    onMouseUp={() => handleZoomRelease('in')}
                                                    onMouseLeave={() => handleZoomRelease('in')}
                                                    onTouchStart={(e) => { e.preventDefault(); handleZoomPress('in'); }}
                                                    onTouchEnd={() => handleZoomRelease('in')}
                                                    className="inline-flex items-center justify-center rounded-md border border-neutral-600/70 bg-neutral-800/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-200 hover:bg-neutral-700/60 active:translate-y-px"
                                                >
                                                    Zoom In
                                                </button>
                                                <button
                                                    onMouseDown={() => handleZoomPress('out')}
                                                    onMouseUp={() => handleZoomRelease('out')}
                                                    onMouseLeave={() => handleZoomRelease('out')}
                                                    onTouchStart={(e) => { e.preventDefault(); handleZoomPress('out'); }}
                                                    onTouchEnd={() => handleZoomRelease('out')}
                                                    className="inline-flex items-center justify-center rounded-md border border-neutral-600/70 bg-neutral-800/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-200 hover:bg-neutral-700/60 active:translate-y-px"
                                                >
                                                    Zoom Out
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </section>
                        </div>
                    </div>
                );
}