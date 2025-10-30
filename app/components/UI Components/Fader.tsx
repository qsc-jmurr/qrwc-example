"use client";
import React, { useCallback } from 'react';

interface FaderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  label?: string;
  orientation?: 'vertical' | 'horizontal';
  color?: 'green' | 'blue' | 'yellow' | 'slate' | 'red';
  scale?: 'linear' | 'log'; // for frequency etc.
  formatValue?: (v: number) => string;
  className?: string;
}

// Utility for log scaling mapping scalar slider 0..1 to min..max logarithmically
function mapFromSlider(t: number, min: number, max: number, scale: 'linear'|'log') {
  if (scale === 'log') {
    return Math.exp(Math.log(min) + (Math.log(max) - Math.log(min)) * t);
  }
  return min + (max - min) * t;
}
function mapToSlider(v: number, min: number, max: number, scale: 'linear'|'log') {
  if (scale === 'log') {
    return (Math.log(v) - Math.log(min)) / (Math.log(max) - Math.log(min));
  }
  return (v - min) / (max - min);
}

const colorMap: Record<string,string> = {
  green: 'from-emerald-500 to-teal-400',
  blue: 'from-sky-500 to-cyan-400',
  yellow: 'from-amber-400 to-yellow-300',
  slate: 'from-slate-500 to-slate-400',
  red: 'from-rose-500 to-pink-500'
};

export const Fader: React.FC<FaderProps> = ({
  value, min, max, step, onChange, label, orientation='vertical', color='slate', scale='linear', formatValue, className='' }) => {
  const t = mapToSlider(value, min, max, scale);
  const gradient = colorMap[color] || colorMap.slate;

  const handleChange = useCallback((raw: number) => {
    // raw is slider 0..1
    let mapped = mapFromSlider(raw, min, max, scale);
    if (step) mapped = Number((Math.round(mapped / step) * step).toFixed(6));
    onChange(mapped);
  }, [min,max,scale,step,onChange]);

  // We implement custom slider using input range, styling track fill via CSS variable for simplicity.
  if (orientation === 'horizontal') {
    return (
      <div className={`flex flex-col w-full ${className}`}>
        {label && <span className="mb-1 text-[10px] uppercase tracking-wide text-white/60">{label}</span>}
        <div className="relative h-8 flex items-center">
          <input
            type="range"
            min={0}
            max={1000}
            value={Math.round(t*1000)}
            onChange={e=> handleChange(Number(e.target.value)/1000)}
            step={1}
            className="w-full m-2 h-2 rounded-full appearance-none bg-neutral-800/70 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0"
            style={{ background: `linear-gradient(to right, var(--track-bg, #262626) ${t*100}%, rgba(255,255,255,0.08) ${t*100}%)` }}
          />
          <div className={`pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r ${gradient} opacity-25`} />
          <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-white/70 font-medium">
            {formatValue ? formatValue(value) : value.toFixed(2)}
          </span>
        </div>
      </div>
    );
  }

  // vertical
  return (
    <div className={`flex flex-col items-center ${className}`}>
      {label && <span className="mb-2 text-[10px] uppercase tracking-wide text-white/60">{label}</span>}
      <div className="relative h-40 w-6 flex items-end">
        <div className="absolute inset-0 rounded-full bg-neutral-800/60" />
        <div className={`absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t ${gradient}`} style={{ height: `${t*100}%` }} />
        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round(t*1000)}
          onChange={e=> handleChange(Number(e.target.value)/1000)}
          step={1}
          aria-label={label}
          className="absolute inset-0 opacity-0 cursor-pointer"
          style={{ WebkitAppearance: 'slider-vertical', writingMode: 'vertical' as any }}
        />
        <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-white/70 font-medium">
            {formatValue ? formatValue(value) : value.toFixed(2)}
          </span>
      </div>
    </div>
  );
};

export default Fader;
