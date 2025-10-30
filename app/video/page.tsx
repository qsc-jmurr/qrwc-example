"use client";

import DragAndDrop from "../components/QRWC Components/Video Components/DragAndDrop";
import VolumeControls from "../components/QRWC Components/Audio Components/VolumeControls";

export default function Video() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">Video Routing</h1>
        <p className="mt-2 text-sm text-white/50">Drag and drop video routing demo</p>
      </header>
      <DragAndDrop />
      <VolumeControls />
    </div>
  );
}