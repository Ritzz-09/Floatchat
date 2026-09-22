import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Waves,
  Layers,
  Play,
  Pause,
  TrendingUp,
  Flame,
  Droplets,
  Activity,
  Gauge,
  Sun,
  Moon,
  Compass
} from 'lucide-react';
import { InsightCard } from '../types';
import { playClickSound } from '../utils/audio';

interface ControlsProps {
  currentYear: number;
  onYearChange: (year: number) => void;
  currentDepth: number;
  onDepthChange: (depth: number) => void;
  activeLayer: string;
  onLayerChange: (layer: string) => void;
  showTrajectories: boolean;
  onToggleTrajectories: (val: boolean) => void;
  showFloats: boolean;
  onToggleFloats: (val: boolean) => void;
  insights: InsightCard[];
  summaryMetrics?: {
    average_anomaly: number;
    total_floats: number;
    unit: string;
  };
}

const DEPTH_STEPS = [0, 100, 500, 1000, 1500, 2000];

export const Controls: React.FC<ControlsProps> = ({
  currentYear,
  onYearChange,
  currentDepth,
  onDepthChange,
  activeLayer,
  onLayerChange,
  showTrajectories,
  onToggleTrajectories,
  showFloats,
  onToggleFloats,
  insights,
  summaryMetrics,
}) => {
  const [isPlayingTime, setIsPlayingTime] = useState(false);
  const [playSpeed, setPlaySpeed] = useState<number>(1);
  const playIntervalRef = useRef<any>(null);

  // Time playback animation through 2020 -> 2025
  useEffect(() => {
    if (isPlayingTime) {
      playIntervalRef.current = setInterval(() => {
        onYearChange(currentYear >= 2025 ? 2020 : currentYear + 1);
      }, 1600 / playSpeed);
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlayingTime, playSpeed, currentYear]);

  // Physical calculations based on depth
  const pressureDbar = (currentDepth * 1.025).toFixed(1);
  const waterDensity = (1024.5 + (currentDepth / 2000.0) * 3.8).toFixed(1);

  const getStratumInfo = (d: number) => {
    if (d === 0) {
      return {
        name: 'Epipelagic (Sunlit Mixed Layer)',
        light: 'Full Solar Penetration',
        color: 'text-sky-300',
        bg: 'from-sky-500/30 to-blue-600/20',
      };
    }
    if (d <= 100) {
      return {
        name: 'Upper Thermocline Zone',
        light: 'Euphotic Limit (1% Light)',
        color: 'text-cyan-300',
        bg: 'from-cyan-500/25 to-blue-800/20',
      };
    }
    if (d <= 500) {
      return {
        name: 'Mesopelagic (Oxygen Minimum Zone)',
        light: 'Twilight Zone (Bioluminescence)',
        color: 'text-purple-300',
        bg: 'from-purple-600/30 to-indigo-950/40',
      };
    }
    if (d <= 1000) {
      return {
        name: 'Intermediate Central Water',
        light: 'Perpetual Darkness (Aphotic)',
        color: 'text-indigo-300',
        bg: 'from-indigo-900/40 to-ocean-950',
      };
    }
    if (d <= 1500) {
      return {
        name: 'Deep Ocean Stratum',
        light: 'Aphotic Cold Intermediate',
        color: 'text-violet-300',
        bg: 'from-violet-950/50 to-black',
      };
    }
    return {
      name: 'Bathypelagic (Abyssal Deep Water)',
      light: 'Near Freezing (2.4°C)',
      color: 'text-blue-400',
      bg: 'from-slate-900 to-black',
    };
  };

  const stratum = getStratumInfo(currentDepth);

  return (
    <aside className="w-full lg:w-[320px] xl:w-[350px] flex flex-col h-full bg-ocean-900/70 backdrop-blur-2xl border-l border-cyan-500/15 overflow-y-auto p-3.5 space-y-4 text-xs select-none">
      {/* 1. TIME PANEL (4th Dimension) */}
      <div className="p-3.5 rounded-2xl bg-ocean-850/80 border border-cyan-500/25 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-cyan-300 font-bold uppercase text-xs">
            <Clock className="w-4 h-4 text-cyan-400 animate-spin-slow" />
            <span>Time (4th Dimension)</span>
          </div>
          <span className="font-mono text-base font-extrabold text-white px-2.5 py-0.5 rounded-lg bg-ocean-950 border border-cyan-400/50 text-cyan-200 shadow-glow-cyan">
            {currentYear}
          </span>
        </div>

        {/* Timeline Slider 2020 to 2025 */}
        <div className="space-y-1.5">
          <input
            type="range"
            min={2020}
            max={2025}
            step={1}
            value={currentYear}
            onChange={(e) => {
              playClickSound();
              onYearChange(parseInt(e.target.value));
            }}
            className="w-full h-2 bg-ocean-950 rounded-lg appearance-none cursor-pointer accent-cyan-400 shadow-inner"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-400 px-1">
            <span className={currentYear === 2020 ? 'text-cyan-300 font-bold' : ''}>2020</span>
            <span className={currentYear === 2021 ? 'text-cyan-300 font-bold' : ''}>2021</span>
            <span className={currentYear === 2022 ? 'text-cyan-300 font-bold' : ''}>2022</span>
            <span className={currentYear === 2023 ? 'text-cyan-300 font-bold' : ''}>2023</span>
            <span className={currentYear === 2024 ? 'text-cyan-300 font-bold' : ''}>2024</span>
            <span className={currentYear === 2025 ? 'text-cyan-300 font-bold' : ''}>2025</span>
          </div>
        </div>

        {/* Playback Controls & Speed */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <button
            onClick={() => {
              playClickSound();
              setIsPlayingTime(!isPlayingTime);
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
              isPlayingTime
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-glow-cyan'
                : 'bg-ocean-950 hover:bg-white/10 text-slate-300 border border-white/10'
            }`}
          >
            {isPlayingTime ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{isPlayingTime ? 'Pause 4D' : 'Play 4D Flow'}</span>
          </button>

          <div className="flex items-center gap-1 bg-ocean-950 p-1 rounded-xl border border-white/10 text-[10px] font-mono">
            {[1, 2, 4].map((spd) => (
              <button
                key={spd}
                onClick={() => {
                  playClickSound();
                  setPlaySpeed(spd);
                }}
                className={`px-2 py-0.5 rounded-lg transition-all ${
                  playSpeed === spd ? 'bg-cyan-500 text-black font-extrabold shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. DEPTH PANEL (Z Dimension & Visual Water Column Hologram) */}
      <div className="p-3.5 rounded-2xl bg-ocean-850/80 border border-cyan-500/25 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-purple-300 font-bold uppercase text-xs">
            <Waves className="w-4 h-4 text-purple-400" />
            <span>Vertical Depth (Z)</span>
          </div>
          <span className="font-mono text-base font-extrabold text-purple-300 px-2.5 py-0.5 rounded-lg bg-ocean-950 border border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.3)]">
            {currentDepth} m
          </span>
        </div>

        {/* Quick Depth Slices */}
        <div className="grid grid-cols-6 gap-1">
          {DEPTH_STEPS.map((d) => (
            <button
              key={d}
              onClick={() => {
                playClickSound();
                onDepthChange(d);
              }}
              className={`py-1.5 text-[10px] font-mono rounded-lg text-center transition-all ${
                currentDepth === d
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-extrabold shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                  : 'bg-ocean-950 text-slate-400 hover:text-slate-200 border border-white/5'
              }`}
            >
              {d === 0 ? '0m' : `${d}m`}
            </button>
          ))}
        </div>

        {/* Cross-Section Water Column Hologram */}
        <div className={`p-3 rounded-xl bg-gradient-to-b ${stratum.bg} border border-white/10 space-y-2 transition-all duration-300`}>
          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className={`font-bold ${stratum.color}`}>{stratum.name}</span>
            <div className="flex items-center gap-1 text-[10px] text-slate-300">
              {currentDepth < 200 ? <Sun className="w-3 h-3 text-amber-400" /> : <Moon className="w-3 h-3 text-indigo-400" />}
              <span>{stratum.light}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10 font-mono text-[10px]">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Gauge className="w-3 h-3 text-cyan-400" />
              <span>Hydrostatic Pressure:</span>
            </div>
            <span className="text-right text-cyan-300 font-bold">{pressureDbar} dbar</span>

            <div className="flex items-center gap-1.5 text-slate-300">
              <Compass className="w-3 h-3 text-purple-400" />
              <span>In-situ Density:</span>
            </div>
            <span className="text-right text-purple-300 font-bold">{waterDensity} kg/m³</span>
          </div>
        </div>
      </div>

      {/* 3. SCIENTIFIC DATA LAYERS (Color-Coded) */}
      <div className="p-3.5 rounded-2xl bg-ocean-850/80 border border-cyan-500/25 shadow-lg space-y-2.5">
        <div className="flex items-center gap-2 font-mono text-cyan-300 font-bold uppercase text-xs">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>Scientific Layers</span>
        </div>

        {/* Layer Buttons with Distinct Palette */}
        <div className="space-y-1 text-xs">
          {[
            {
              id: 'temperature',
              label: 'Temperature (°C)',
              icon: Flame,
              activeClasses: 'bg-orange-500/20 text-orange-200 border-orange-500/60 shadow-[0_0_15px_rgba(249,115,22,0.35)]',
              dotColor: 'bg-orange-400 shadow-[0_0_8px_#f97316]',
              iconColor: 'text-orange-400',
            },
            {
              id: 'anomaly',
              label: 'Temperature Anomaly',
              icon: TrendingUp,
              activeClasses: 'bg-red-500/20 text-red-200 border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.35)]',
              dotColor: 'bg-gradient-to-r from-blue-400 to-red-500 shadow-[0_0_8px_#ef4444]',
              iconColor: 'text-red-400',
            },
            {
              id: 'salinity',
              label: 'Salinity (PSU)',
              icon: Droplets,
              activeClasses: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.35)]',
              dotColor: 'bg-emerald-400 shadow-[0_0_8px_#10b981]',
              iconColor: 'text-emerald-400',
            },
            {
              id: 'oxygen',
              label: 'Dissolved Oxygen (µmol/kg)',
              icon: Activity,
              activeClasses: 'bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-500/60 shadow-[0_0_15px_rgba(217,70,239,0.35)]',
              dotColor: 'bg-fuchsia-400 shadow-[0_0_8px_#d946ef]',
              iconColor: 'text-fuchsia-400',
            },
            {
              id: 'chlorophyll',
              label: 'Chlorophyll-a (mg/m³)',
              icon: Layers,
              activeClasses: 'bg-lime-500/20 text-lime-200 border-lime-500/60 shadow-[0_0_15px_rgba(132,204,22,0.35)]',
              dotColor: 'bg-lime-400 shadow-[0_0_8px_#84cc16]',
              iconColor: 'text-lime-400',
            },
          ].map((layer) => {
            const Icon = layer.icon;
            const isActive = activeLayer === layer.id;
            return (
              <button
                key={layer.id}
                onClick={() => {
                  playClickSound();
                  onLayerChange(layer.id);
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                  isActive
                    ? layer.activeClasses
                    : 'bg-ocean-950/60 text-slate-300 hover:bg-white/5 border border-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${isActive ? layer.dotColor : 'bg-slate-600'}`} />
                  <span className="font-mono text-[11px] font-medium">{layer.label}</span>
                </div>
                <Icon className={`w-4 h-4 ${isActive ? layer.iconColor : 'text-slate-500'}`} />
              </button>
            );
          })}
        </div>

        {/* Observation Overlays */}
        <div className="pt-2.5 border-t border-white/10 space-y-2">
          <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">
            Observation Overlays
          </div>

          <label className="flex items-center justify-between p-2 rounded-xl bg-ocean-950/60 text-[11px] font-mono text-slate-300 cursor-pointer hover:bg-white/5 border border-white/5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-[0_0_8px_#facc15]" />
              <span>ARGO Float Positions</span>
            </div>
            <input
              type="checkbox"
              checked={showFloats}
              onChange={(e) => {
                playClickSound();
                onToggleFloats(e.target.checked);
              }}
              className="accent-yellow-400 cursor-pointer w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-2 rounded-xl bg-ocean-950/60 text-[11px] font-mono text-slate-300 cursor-pointer hover:bg-white/5 border border-white/5">
            <div className="flex items-center gap-2">
              <span className="w-3 h-1.5 bg-emerald-400 rounded shadow-[0_0_8px_#10b981]" />
              <span>Float Trajectories (10-Day)</span>
            </div>
            <input
              type="checkbox"
              checked={showTrajectories}
              onChange={(e) => {
                playClickSound();
                onToggleTrajectories(e.target.checked);
              }}
              className="accent-emerald-400 cursor-pointer w-4 h-4"
            />
          </label>
        </div>
      </div>

      {/* 4. KEY INSIGHTS */}
      <div className="p-3.5 rounded-2xl bg-ocean-850/80 border border-cyan-500/25 shadow-lg space-y-2.5">
        <div className="flex items-center gap-2 font-mono text-cyan-300 font-bold uppercase text-xs">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <span>Factual Key Insights</span>
        </div>

        <div className="space-y-2 font-mono text-[11px]">
          <div className="p-2.5 rounded-xl bg-ocean-950/70 border border-white/5">
            <div className="text-base font-extrabold text-amber-400">
              {summaryMetrics && summaryMetrics.average_anomaly > 0 ? '+' : ''}
              {summaryMetrics?.average_anomaly?.toFixed(2) || '+1.18'}°C
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Average temperature anomaly at {currentDepth}m
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-ocean-950/70 border border-white/5">
            <div className="text-xs font-bold text-slate-200">
              Eastern Bay of Bengal
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Peak heat accumulation sector with intense stratification
            </p>
          </div>

          {insights && insights[0] && (
            <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-[10px] text-cyan-200">
              <span className="font-bold text-cyan-300 block mb-1 uppercase tracking-wide">
                {insights[0].title}
              </span>
              {insights[0].description}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
