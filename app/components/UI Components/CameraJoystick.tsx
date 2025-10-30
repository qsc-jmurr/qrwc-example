"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface CameraJoystickProps {
    onMove?: (x: number, y: number) => void; 
    onZoomPress?: (direction: 'in' | 'out') => void;
    onZoomRelease?: (direction: 'in' | 'out') => void;
    disabled?: boolean;
}

export default function CameraJoystick({ 
    onMove, 
    onZoomRelease, 
    disabled = false 
}: CameraJoystickProps) {
    const joystickContainerRef = useRef<HTMLDivElement>(null);
    const knobRef = useRef<HTMLDivElement>(null);
    const isDraggingRef = useRef(false);
    const frameRequestRef = useRef<number | null>(null);
    const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });

    const JOYSTICK_LIMIT = 70;

    const scheduleMove = useCallback((x: number, y: number) => {
        if (frameRequestRef.current) cancelAnimationFrame(frameRequestRef.current);
        frameRequestRef.current = requestAnimationFrame(() => {
            const nx = x / JOYSTICK_LIMIT;
            const ny = -y / JOYSTICK_LIMIT; 
            onMove?.(nx, ny); 
        });
    }, [onMove, JOYSTICK_LIMIT]);

    const resetJoystick = useCallback(() => {
        setJoystickPos({ x: 0, y: 0 });
        onMove?.(0, 0); 
    }, [onMove]);

    useEffect(() => {
        const container = joystickContainerRef.current;
        if (!container) return;

        const handlePointerDown = (e: PointerEvent) => {
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
    }, [resetJoystick, scheduleMove, disabled]);

    const clampToCircle = (x: number, y: number, r: number) => {
        const mag = Math.hypot(x, y);
        if (mag <= r) return { x, y };
        const scale = r / mag;
        return { x: x * scale, y: y * scale };
    };

    const animateReturn = () => {
        const start = performance.now();
        const startPos = { ...joystickPos };
        const DURATION = 120; 
        const step = (ts: number) => {
            const t = Math.min(1, (ts - start) / DURATION);
            const ease = 1 - Math.pow(1 - t, 3);
            const x = startPos.x * (1 - ease);
            const y = startPos.y * (1 - ease);
            setJoystickPos({ x, y });
            scheduleMove(x, y); 
            if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    };

    return (
        <div className="flex justify-center gap-6 md:flex-col md:items-center">
            <div className="flex flex-col items-center gap-2">
                <label className="text-[10px] uppercase tracking-wide text-neutral-400">Pan / Tilt</label>
                <div
                ref={joystickContainerRef}
                id="camera-joystick-container"
                className={`relative w-44 h-44 rounded-full border border-neutral-600/70 bg-neutral-800/70 overflow-hidden select-none`}
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
        </div>
    );
}