"use client";

import { useState, useEffect } from "react";
import { useQrwc } from "../../../lib/QrwcProvider";
import CameraJoystick from "../../../components/UI Components/CameraJoystick";

export default function PTZControls() {
    const { qrwcInstance } = useQrwc();

    const handleJoystickMove = (x: number, y: number) => {
        if (!qrwcInstance) return;
        try {
            const ptz = qrwcInstance.components.ptzControl || qrwcInstance.components.usbBridge;
            if (!ptz) return;
            const DEADZONE = 0;
            const pan = Math.abs(x) < DEADZONE ? 0 : x;  
            const tilt = Math.abs(y) < DEADZONE ? 0 : y; 
            const controls = ptz.controls;
            const press = (name: string) => {
                const c = controls?.[name];
                if (c && c.update) c.update(1);
            };
            const release = (name: string) => {
                const c = controls?.[name];
                if (c && c.update) c.update(0);
            };
            const desired: string[] = [];
            const magnitude = Math.hypot(pan, tilt);
            const angle = Math.atan2(tilt, pan) * (180 / Math.PI);

            const normalizedAngle = angle < 0 ? angle + 360 : angle;

            const ANGLE_TOLERANCE = 30; 
            
            const panDir = pan === 0 ? 0 : pan > 0 ? 1 : -1;
            const tiltDir = tilt === 0 ? 0 : tilt > 0 ? 1 : -1;

            if (panDir === 0 && tiltDir === 0) {
            } else if (magnitude > 0.1) { 
                const isHorizontalish = (normalizedAngle <= ANGLE_TOLERANCE) || (normalizedAngle >= 360 - ANGLE_TOLERANCE) || (normalizedAngle >= 180 - ANGLE_TOLERANCE && normalizedAngle <= 180 + ANGLE_TOLERANCE);
                const isVerticalish   = (normalizedAngle >= 90 - ANGLE_TOLERANCE && normalizedAngle <= 90 + ANGLE_TOLERANCE) ||(normalizedAngle >= 270 - ANGLE_TOLERANCE && normalizedAngle <= 270 + ANGLE_TOLERANCE);

                if (isHorizontalish && Math.abs(pan) > Math.abs(tilt) * 0.5) {
                    if (panDir === 1) desired.push('pan.right');
                    if (panDir === -1) desired.push('pan.left');
                    if (tiltDir === 1) desired.push('tilt.up');
                    if (tiltDir === -1) desired.push('tilt.down');
                } else {
                    const haveDiagonalButtons = !!(controls?.['pan.left.tilt.up'] || controls?.['pan.left.tilt.down'] || controls?.['pan.right.tilt.up'] || controls?.['pan.right.tilt.down']);
                    if (haveDiagonalButtons) {
                        if (panDir === -1 && tiltDir === 1) desired.push('pan.left.tilt.up');
                        if (panDir === -1 && tiltDir === -1) desired.push('pan.left.tilt.down');
                        if (panDir === 1 && tiltDir === 1) desired.push('pan.right.tilt.up');
                        if (panDir === 1 && tiltDir === -1) desired.push('pan.right.tilt.down');
                    } else {
                        if (panDir === 1) desired.push('pan.right');
                        if (panDir === -1) desired.push('pan.left');
                        if (tiltDir === 1) desired.push('tilt.up');
                        if (tiltDir === -1) desired.push('tilt.down');
                    }
                }
            }

            const allButtons = [
                'pan.left','pan.right','tilt.up','tilt.down',
                'pan.left.tilt.up','pan.left.tilt.down','pan.right.tilt.up','pan.right.tilt.down'
            ];

            for (const btn of allButtons) {
                if (controls?.[btn]) {
                    if (!desired.includes(btn)) release(btn);
                }
            }

            for (const btn of desired) press(btn);

            if (controls?.panSpeed && controls?.panSpeed.update) {
                controls.panSpeed.update(Math.round(pan * 100));
            }
            if (controls?.tiltSpeed && controls?.tiltSpeed.update) {
                controls.tiltSpeed.update(Math.round(tilt * 100));
            }

            console.log(`Joystick PTZ intent pan=${panDir} tilt=${tiltDir} buttons=[${desired.join(', ')}] raw=(${pan.toFixed(2)}, ${tilt.toFixed(2)})`);
        } catch (error) {
            console.error("Error controlling PTZ with joystick:", error);
        }
    };

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
        if (!qrwcInstance) return;
        try {
            const control = resolveZoomControl(direction);
            control?.update?.(1);
        } catch (err) {
            console.error('Error zoom press', direction, err);
        }
    };

    const handleZoomRelease = (direction: 'in' | 'out') => {
        if (!qrwcInstance) return;
        try {
            const control = resolveZoomControl(direction);
            control?.update?.(0);
        } catch (err) {
            console.error('Error zoom release', direction, err);
        }
    };

    return (
         <section className="rounded-lg border border-neutral-700/60 bg-neutral-900/60 backdrop-blur p-4 flex flex-col gap-4 col-span-full md:col-span-1">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">PTZ</h2>
                <div>
                <CameraJoystick 
                    onMove={handleJoystickMove}
                    onZoomPress={handleZoomPress}
                    onZoomRelease={handleZoomRelease}
                />
                <div className="flex flex-col items-center gap-2">
                    <label className="text-[10px] uppercase tracking-wide text-neutral-400">Zoom</label>
                    <div className="flex gap-2">
                        <button
                            onMouseDown={() => handleZoomPress('in')}
                            onMouseUp={() => handleZoomRelease('in')}
                            onMouseLeave={() => handleZoomRelease('in')}
                            onTouchStart={(e) => { e.preventDefault(); handleZoomPress('in'); }}
                            onTouchEnd={() => handleZoomRelease('in')}
                            className="inline-flex items-center justify-center rounded-md border border-neutral-600/70 bg-neutral-800/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-200 hover:bg-neutral-700/60 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Zoom In
                        </button>
                        <button
                            onMouseDown={() => handleZoomPress('out')}
                            onMouseUp={() => handleZoomRelease('out')}
                            onMouseLeave={() => handleZoomRelease('out')}
                            onTouchStart={(e) => { e.preventDefault(); handleZoomPress('out'); }}
                            onTouchEnd={() => handleZoomRelease('out')}
                            className="inline-flex items-center justify-center rounded-md border border-neutral-600/70 bg-neutral-800/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-200 hover:bg-neutral-700/60 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Zoom Out
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}