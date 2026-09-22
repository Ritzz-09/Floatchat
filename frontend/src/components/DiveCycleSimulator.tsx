import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Radio,
  Waves,
  ArrowDown,
  ArrowUp,
  Activity,
  Satellite,
  Gauge,
  Droplet
} from 'lucide-react';
import { playClickSound } from '../utils/audio';

interface PhaseInfo {
  id: number;
  title: string;
  depthStr: string;
  durationStr: string;
  buoyancy: string;
  oilVolume: string;
  sensors: string;
  telemetry: string;
  description: string;
}

const PHASES: PhaseInfo[] = [
  {
    id: 1,
    title: 'Surface & Satellite Telemetry',
    depthStr: '0m (Sea Surface)',
    durationStr: '6 hours',
    buoyancy: 'Positive (+330 cm³)',
    oilVolume: 'Fully Inflated',
    sensors: 'Standby / Air Cal',
    telemetry: 'Iridium Uplink Active',
    description: 'Float rests on sea surface with whip antenna elevated, transmitting CTD profile dataset to Iridium satellites and receiving GPS fix.',
  },
  {
    id: 2,
    title: 'Descent to Parking Depth',
    depthStr: '0m → 1,000m',
    durationStr: '6 hours (~10 cm/s)',
    buoyancy: 'Negative (-250 cm³)',
    oilVolume: 'Retracting to reservoir',
    sensors: 'Standby',
    telemetry: 'Radio Silence',
    description: 'Internal hydraulic pump retracts mineral oil into internal reservoir, decreasing displaced volume so float sinks at a controlled rate of ~10 cm/s.',
  },
  {
    id: 3,
    title: 'Subsurface Isobaric Drift',
    depthStr: '1,000m (Intermediate Layer)',
    durationStr: '9 days (~216 hours)',
    buoyancy: 'Neutral (0 cm³ net)',
    oilVolume: 'Stabilized at 1000 dbar',
    sensors: 'Periodic baseline checks',
    telemetry: 'Radio Silence',
    description: 'Float drifts passively with deep mid-depth ocean currents at 1,000m depth, mapping deep ocean circulation without propulsion.',
  },
  {
    id: 4,
    title: 'Descent to Profiling Depth',
    depthStr: '1,000m → 2,000m',
    durationStr: '3 hours',
    buoyancy: 'Negative (-300 cm³)',
    oilVolume: 'Maximum retraction',
    sensors: 'Standby',
    telemetry: 'Radio Silence',
    description: 'Further oil is retracted, descending to maximum bathypelagic depth (2,000 dbar) to prepare for scientific upward profiling.',
  },
  {
    id: 5,
    title: 'Ascent & Continuous CTD Profiling',
    depthStr: '2,000m → 0m (Surface)',
    durationStr: '6 hours (~10 cm/s)',
    buoyancy: 'Positive (+330 cm³)',
    oilVolume: 'Hydraulic pump inflating bladder',
    sensors: 'ACTIVE: 1 Hz CTD Sampling',
    telemetry: 'Queued for transmission',
    description: 'Hydraulic pump pushes oil into external rubber bladder. Float ascends smoothly while CTD package measures continuous conductivity, temperature, and depth.',
  },
];

export const DiveCycleSimulator: React.FC = () => {
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState<1 | 2 | 5>(2);

  // Auto-advance phase when playing
  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = 4000 / speed;
    const timer = setInterval(() => {
      setCurrentPhaseIndex((prev) => (prev + 1) % PHASES.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, speed]);

  const activePhase = PHASES[currentPhaseIndex];

  // Visual float depth position on the 0-2000m vertical axis
  const getFloatYPercent = (phaseId: number) => {
    switch (phaseId) {
      case 1: return 4; // Surface
      case 2: return 48; // Sinking to 1000m
      case 3: return 50; // Drifting at 1000m
      case 4: return 92; // Deep at 2000m
      case 5: return 30; // Ascending
      default: return 4;
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-ocean-950/75 border border-cyan-500/25 space-y-4 font-mono text-xs">
      {/* Simulator Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2 text-cyan-300 font-bold">
          <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span>ARGO Profiling Buoy — 10-Day Physical Dive Cycle</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Play / Pause */}
          <button
            onClick={() => {
              playClickSound();
              setIsPlaying(!isPlaying);
            }}
            className={`px-2.5 py-1 rounded-lg border text-[11px] flex items-center gap-1.5 transition-all ${
              isPlaying
                ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300'
                : 'bg-ocean-900 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            {isPlaying ? <Pause className="w-3 h-3 text-cyan-300" /> : <Play className="w-3 h-3" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          {/* Speed Toggle */}
          <div className="flex items-center bg-ocean-900 p-0.5 rounded-lg border border-white/10 text-[10px]">
            {([1, 2, 5] as const).map((s) => (
              <button
                key={s}
                onClick={() => {
                  playClickSound();
                  setSpeed(s);
                }}
                className={`px-1.5 py-0.5 rounded ${
                  speed === s ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30' : 'text-slate-400'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Reset */}
          <button
            onClick={() => {
              playClickSound();
              setCurrentPhaseIndex(0);
            }}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
            title="Restart cycle"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Simulation View: Left Water Column, Right Telemetry Panel */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* LEFT (4 cols): Animated Vertical Water Column (0 - 2000m) */}
        <div className="md:col-span-5 relative h-56 rounded-xl border border-cyan-500/30 overflow-hidden bg-gradient-to-b from-sky-950 via-ocean-900 to-[#020617] p-2 flex flex-col justify-between select-none">
          {/* Strata Labels */}
          <div className="absolute top-1 left-2 text-[9px] text-sky-400 font-bold tracking-wider uppercase opacity-75">
            0m • Epipelagic (Sunlight)
          </div>
          <div className="absolute top-1/2 -translate-y-1/2 left-2 text-[9px] text-cyan-500 font-bold tracking-wider uppercase opacity-75">
            1,000m • Mesopelagic (Drift Depth)
          </div>
          <div className="absolute bottom-1 left-2 text-[9px] text-purple-400 font-bold tracking-wider uppercase opacity-75">
            2,000m • Bathypelagic (Max Profiling)
          </div>

          {/* Horizontal Depth Reference Dashed Lines */}
          <div className="absolute top-0 w-full border-b border-sky-400/20" />
          <div className="absolute top-1/2 w-full border-b border-dashed border-cyan-400/25" />
          <div className="absolute bottom-0 w-full border-b border-purple-400/20" />

          {/* SATELLITE (When float is at surface in Phase 1) */}
          {activePhase.id === 1 && (
            <div className="absolute top-1 right-3 flex items-center gap-1 text-[10px] text-cyan-300 animate-bounce">
              <Satellite className="w-3.5 h-3.5 text-cyan-400" />
              <span>Iridium Fix</span>
            </div>
          )}

          {/* 3D ARGO FLOAT BUOY AVATAR */}
          <div
            className="absolute right-8 -translate-x-1/2 transition-all duration-700 ease-in-out flex flex-col items-center"
            style={{ top: `${getFloatYPercent(activePhase.id)}%` }}
          >
            {/* Antenna with satellite ping */}
            <div className="w-0.5 h-3 bg-slate-300 relative">
              {activePhase.id === 1 && (
                <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 rounded-full border border-cyan-400 animate-ping" />
              )}
            </div>
            {/* Titanium CTD head */}
            <div className="w-2.5 h-1.5 bg-slate-300 rounded-t-sm" />
            {/* Bright Yellow Float Pressure Hull */}
            <div className="w-3.5 h-7 bg-yellow-400 rounded-sm border border-black/30 shadow-md relative flex items-center justify-center">
              {/* Black stabilization dampener collar */}
              <div className="w-4 h-1 bg-black absolute top-2" />
            </div>
            {/* External Bladder Indicator */}
            <div
              className={`rounded-full transition-all duration-500 ${
                activePhase.buoyancy.includes('Positive')
                  ? 'w-3 h-2 bg-emerald-400 shadow-glow-cyan'
                  : 'w-1 h-0.5 bg-slate-600'
              }`}
            />
            {/* Ascent/Descent Motion Vector Arrow */}
            {activePhase.id === 2 && <ArrowDown className="w-3 h-3 text-cyan-400 animate-bounce mt-1" />}
            {activePhase.id === 4 && <ArrowDown className="w-3 h-3 text-purple-400 animate-bounce mt-1" />}
            {activePhase.id === 5 && <ArrowUp className="w-3 h-3 text-emerald-400 animate-bounce mt-1" />}
          </div>
        </div>

        {/* RIGHT (7 cols): Phase Telemetry Card & Mechanical Readouts */}
        <div className="md:col-span-7 space-y-2.5">
          {/* Phase Badge & Step Indicator */}
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-bold text-[11px] border border-cyan-400/30">
              Phase {activePhase.id} of 5: {activePhase.title}
            </span>
            <span className="text-[10px] text-slate-400">
              Step duration: {activePhase.durationStr}
            </span>
          </div>

          <p className="text-slate-300 text-xs leading-relaxed font-sans">
            {activePhase.description}
          </p>

          {/* Real-time Subsystem Status Grid */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 rounded-xl bg-ocean-900 border border-white/5 space-y-0.5">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                <Gauge className="w-3 h-3 text-cyan-400" />
                <span>Operating Depth</span>
              </div>
              <div className="text-cyan-200 font-bold">{activePhase.depthStr}</div>
            </div>

            <div className="p-2 rounded-xl bg-ocean-900 border border-white/5 space-y-0.5">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                <Droplet className="w-3 h-3 text-emerald-400" />
                <span>Buoyancy / Bladder</span>
              </div>
              <div className="text-emerald-300 font-bold">{activePhase.buoyancy}</div>
            </div>

            <div className="p-2 rounded-xl bg-ocean-900 border border-white/5 space-y-0.5">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                <Waves className="w-3 h-3 text-amber-400" />
                <span>CTD Sensors</span>
              </div>
              <div className="text-amber-300 font-bold">{activePhase.sensors}</div>
            </div>

            <div className="p-2 rounded-xl bg-ocean-900 border border-white/5 space-y-0.5">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                <Radio className="w-3 h-3 text-purple-400" />
                <span>Satellite Comms</span>
              </div>
              <div className="text-purple-300 font-bold">{activePhase.telemetry}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Phase Timeline Chips */}
      <div className="pt-2 border-t border-white/5 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mr-1">
          Jump Phase:
        </span>
        {PHASES.map((p, idx) => (
          <button
            key={p.id}
            onClick={() => {
              playClickSound();
              setCurrentPhaseIndex(idx);
            }}
            className={`px-2 py-1 rounded-lg text-[10px] transition-all ${
              currentPhaseIndex === idx
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 font-bold shadow-glow-cyan'
                : 'bg-ocean-900 text-slate-400 hover:text-white border border-white/5'
            }`}
          >
            {p.id}. {p.title.split('&')[0].trim()}
          </button>
        ))}
      </div>
    </div>
  );
};
