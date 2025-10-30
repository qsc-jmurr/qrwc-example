"use client";

import VolumeControls from "../components/QRWC Components/Audio Components/VolumeControls";
import PTZControls from "../components/QRWC Components/Camera Components/PTZControls";
import Preview from "../components/QRWC Components/Camera Components/CameraPreview";
import CameraSelect from "../components/QRWC Components/Camera Components/CameraSelect";

export default function Camera() {
    return (
        <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
            <header className="mb-8 space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight">Camera Control</h1>
                <p className="text-sm text-neutral-400">Example of camera controls with joystick</p>
            </header>
            <div className="grid gap-6 md:grid-cols-3">
                <Preview />
                <CameraSelect />
                <PTZControls />
            </div>
            <VolumeControls />
        </div>
    );
}