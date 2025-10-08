"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useQrwc } from "../lib/QrwcProvider";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

// Mapping Q-SYS control value -> source id. Example: control values 4..6 => source ids 1..3
const CONTROL_OFFSET = 3; // controlValue = sourceId + CONTROL_OFFSET
const DEFAULT_CONTROL_VALUE = 1; // reset value

interface SourceDef { id: number; label: string; }
interface DisplayState { id: number; sourceId: number | null; }

const ITEM_TYPE = "VIDEO_SOURCE";

export default function Video() {
  const { qrwcInstance } = useQrwc();

  // Static (could later be fetched dynamically)
  const initialSources: SourceDef[] = useMemo(() => ([
    { id: 1, label: 'Laptop Front' },
    { id: 2, label: 'Laptop Rear' },
    { id: 3, label: 'MTR' },
  ]), []);

  // Determine how many outputs exist (assume up to 2; check for control presence)
  const hasSecond = !!qrwcInstance?.components?.videoDecoder?.controls?.['hdmi.out.2.select.index'];
  const displayCount = hasSecond ? 2 : 1;

  const [displays, setDisplays] = useState<DisplayState[]>(() => Array.from({ length: displayCount }, (_, i) => ({ id: i + 1, sourceId: null })));

  // Listen to decoder output select indices and sync local display assignments
  useEffect(() => {
    if (!qrwcInstance) return;
    const decoder = qrwcInstance.components.videoDecoder;
    if (!decoder) return;

    const listeners: Array<() => void> = [];

    const attach = (displayId: number) => {
      const key = `hdmi.out.${displayId}.select.index`;
      const ctrl: any = decoder.controls[key];
      if (!ctrl) return;
      const handler = () => {
        const val = ctrl.state?.Value; // numeric control value
        setDisplays(prev => prev.map(d => {
          if (d.id !== displayId) return d;
            // Map numeric value back to sourceId or null
            if (val === DEFAULT_CONTROL_VALUE) return { ...d, sourceId: null };
            if (typeof val === 'number' && val >= CONTROL_OFFSET + 1) {
              const sourceId = val - CONTROL_OFFSET;
              return { ...d, sourceId };
            }
            return { ...d, sourceId: null };
        }));
      };
      ctrl.on?.('update', handler);
      // prime
      handler();
      listeners.push(() => ctrl.off?.('update', handler));
    };

    for (let i = 1; i <= displayCount; i++) attach(i);
    return () => { listeners.forEach(off => off()); };
  }, [qrwcInstance, displayCount]);

  // Compute availability: a source is shown in the list if it's not assigned to ALL displays simultaneously.
  // If only one display: it's hidden when assigned. If two displays: hide only if assigned to both.
  const availableSources = useMemo(() => {
    return initialSources.filter(src => {
      const assignments = displays.filter(d => d.sourceId === src.id).length;
      if (displayCount === 1) return assignments === 0; // hide while on sole display
      return assignments < displayCount; // hide only if on all outputs
    });
  }, [initialSources, displays, displayCount]);

  // Helpers to push selection to core
  const setDisplaySource = useCallback(async (displayId: number, sourceId: number | null) => {
    if (!qrwcInstance) return;
    const decoder = qrwcInstance.components.videoDecoder;
    const key = `hdmi.out.${displayId}.select.index`;
    const ctrl: any = decoder?.controls?.[key];
    if (!ctrl) return;
    const targetValue = sourceId === null ? DEFAULT_CONTROL_VALUE : sourceId + CONTROL_OFFSET; // map back
    try {
      await ctrl.update(targetValue);
    } catch (e) {
      console.error('Failed to set display source', { displayId, sourceId, targetValue }, e);
    }
  }, [qrwcInstance]);

  const handleDrop = async (sourceId: number, displayId: number) => {
    const current = displays.find(d => d.id === displayId);
    if (current?.sourceId === sourceId) return;
    await setDisplaySource(displayId, sourceId);
  };

  const handleReset = async (displayId: number) => {
    await setDisplaySource(displayId, null);
  };

  interface SourceCardProps { source: SourceDef; assignedElsewhere: boolean; }
  const SourceCard = ({ source }: SourceCardProps) => {
    const [{ isDragging }, drag] = useDrag(() => ({
      type: ITEM_TYPE,
      item: { sourceId: source.id },
      collect: (monitor) => ({ isDragging: monitor.isDragging() })
    }), [source.id]);
    return (
      <div
        ref={el => { if (el) drag(el); }}
        className={`relative h-16 mt-2 rounded-lg border border-white/10 bg-neutral-900/60 backdrop-blur px-3 py-2 cursor-move flex flex-col gap-1 transition shadow-sm hover:shadow-md hover:border-sky-400/40 ${isDragging ? 'opacity-40 scale-[0.97]' : ''}`}
      >
        <span className="text-[1rem] tracking-wide text-white/80 leading-none">{source.label}</span>
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 pointer-events-none" />
      </div>
    );
  };

  interface DisplayPanelProps { display: DisplayState; }
  const DisplayPanel = ({ display }: DisplayPanelProps) => {
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
      accept: ITEM_TYPE,
      drop: (item: { sourceId: number }) => handleDrop(item.sourceId, display.id),
      canDrop: () => true,
      collect: monitor => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() })
    }), [display.id, handleDrop]);

    const assignedSource = display.sourceId ? initialSources.find(s => s.id === display.sourceId) : null;

    return (
      <div
        ref={el => { if (el) drop(el); }}
        className={`relative mt-2 rounded-xl border min-h-40 flex flex-col p-4 gap-3 transition backdrop-blur bg-neutral-900/60 border-white/10 ${isOver ? 'ring-2 ring-sky-400/60 border-sky-400/40' : 'hover:border-sky-400/30'} ${assignedSource ? '' : 'justify-between'}`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[1rem] font-semibold tracking-wide text-white/80">Display {display.id}</span>
          <button
            onClick={() => handleReset(display.id)}
            className="text-[0.75rem] px-2 py-1 rounded-md bg-neutral-800 border border-white/10 hover:border-rose-400/50 hover:text-rose-300 transition"
          >Reset</button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          {assignedSource ? (
            <div className="text-center">
              <div className="text-[1rem] font-medium text-white/80">{assignedSource.label}</div>
              <div className="text-[1rem] text-white/40">Source {assignedSource.id}</div>
            </div>
          ) : (
            <div className="text-[1rem] text-white/35 italic">Drop Source Here</div>
          )}
        </div>
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">Video Routing</h1>
        <p className="mt-2 text-sm text-white/50">Drag and drop video routing demo</p>
      </header>
      <DndProvider backend={HTML5Backend}>
        <section className="mb-8">
          <h2 className="text-sm font-medium tracking-wide text-white/70 mb-4">Sources</h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {availableSources.map(src => (
              <SourceCard key={src.id} source={src} assignedElsewhere={false} />
            ))}
            {availableSources.length === 0 && (
              <div className="text-[0.55rem] text-white/40 italic">All sources active on every display.</div>
            )}
          </div>
        </section>
        <section>
          <h2 className="text-sm font-medium tracking-wide text-white/70 mb-4">Displays</h2>
          <div className={`grid gap-6 ${displayCount === 2 ? 'md:grid-cols-2' : 'md:grid-cols-1'} xl:grid-cols-${displayCount}`}>
            {displays.map(d => (
              <DisplayPanel key={d.id} display={d} />
            ))}
          </div>
        </section>
      </DndProvider>
    </div>
  );
}