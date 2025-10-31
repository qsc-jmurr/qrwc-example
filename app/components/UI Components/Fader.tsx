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
    let mapped = mapFromSlider(raw, min, max, scale);
    if (step) mapped = Number((Math.round(mapped / step) * step).toFixed(6));
    onChange(mapped);
  }, [min,max,scale,step,onChange]);


  if (orientation === 'horizontal') {
    return (
      <div className={`flex flex-col w-full ${className}`}>
        {label && <span className="mb-2 text-[10px] uppercase tracking-wide text-white/60">{label}</span>}
        <div className="relative h-6 w-full flex items-center">
          <div className="absolute inset-0 rounded-full bg-neutral-800/60" />
          <div className={`absolute left-0 top-0 bottom-0 rounded-full bg-gradient-to-r ${gradient}`} style={{ width: `${t*100}%` }} />
          <input
            type="range"
            min={0}
            max={1000}
            value={Math.round(t*1000)}
            onChange={e=> handleChange(Number(e.target.value)/1000)}
            step={1}
            aria-label={label}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-white/70 font-medium">
            {formatValue ? formatValue(value) : null}
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
