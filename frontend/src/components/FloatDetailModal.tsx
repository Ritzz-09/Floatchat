import React, { useEffect, useState } from 'react';
import {
  X,
  Radio,
  MapPin,
  Calendar,
  Activity,
  Waves,
  ShieldCheck,
  Compass,
  ArrowRight
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { ArgoFloat, FloatDossier } from '../types';
import { fetchFloatDossier } from '../services/api';
import { DiveCycleSimulator } from './DiveCycleSimulator';
import { playClickSound } from '../utils/audio';

interface FloatDetailModalProps {
  float: ArgoFloat;
  onClose: () => void;
  onFlyToFloat: (lat: number, lon: number) => void;
}

export const FloatDetailModal: React.FC<FloatDetailModalProps> = ({
  float,
  onClose,
  onFlyToFloat,
}) => {
  const [dossier, setDossier] = useState<FloatDossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModalTab, setActiveModalTab] = useState<'profile' | 'simulator'>('profile');

  useEffect(() => {
    let isMounted = true;
    fetchFloatDossier(float.float_id).then((data) => {
      if (isMounted) {
        setDossier(data);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [float.float_id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-ocean-900 border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-white/10 bg-ocean-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-mono">
                  ARGO Profiler WMO {float.wmo_id}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {float.status}
                </span>
              </div>
              <p className="text-xs text-cyan-300/80 font-mono">
                {float.platform_type} • {float.country}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
            <div className="p-2.5 rounded-xl bg-ocean-950/60 border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-400">Current Position</span>
              <div className="text-xs font-bold text-cyan-200">
                {float.last_latitude.toFixed(2)}°N, {float.last_longitude.toFixed(2)}°E
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-ocean-950/60 border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-400">Completed Cycles</span>
              <div className="text-xs font-bold text-white">
                {float.total_profiles} Profiles
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-ocean-950/60 border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-400">Telemetry</span>
              <div className="text-xs font-bold text-slate-200 truncate">
                {float.transmission_system || 'Iridium / Argos'}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-ocean-950/60 border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-400">Last Telemetry Date</span>
              <div className="text-xs font-bold text-slate-200">
                {float.last_update}
              </div>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-ocean-950/80 border border-white/10 font-mono text-xs">
            <button
              onClick={() => {
                playClickSound();
                setActiveModalTab('profile');
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 ${
                activeModalTab === 'profile'
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/40 font-bold shadow-glow-cyan'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Waves className="w-3.5 h-3.5 text-cyan-400" />
              <span>CTD Observations & Curve</span>
            </button>
            <button
              onClick={() => {
                playClickSound();
                setActiveModalTab('simulator');
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 ${
                activeModalTab === 'simulator'
                  ? 'bg-purple-500/25 text-purple-300 border border-purple-400/40 font-bold shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-purple-400" />
              <span>10-Day Dive Cycle Simulator</span>
            </button>
          </div>

          {activeModalTab === 'simulator' ? (
            <DiveCycleSimulator />
          ) : (
            /* Vertical CTD Profile for Latest Cycle */
            <div className="p-3.5 rounded-xl bg-ocean-950/60 border border-white/5 space-y-2">
              <div className="flex items-center justify-between font-mono">
                <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-xs">
                  <Waves className="w-4 h-4 text-cyan-400" />
                  <span>Latest Vertical CTD Profile (Cycle #{float.total_profiles})</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  Inverted Depth (0m → 2000m)
                </span>
              </div>

              {loading ? (
                <div className="h-44 flex items-center justify-center text-slate-400 font-mono">
                  Loading profile data...
                </div>
              ) : dossier?.latest_profile ? (
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={dossier.latest_profile}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#172c4e" />
                      <XAxis
                        type="number"
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                        unit="°C"
                      />
                      <YAxis
                        dataKey="depth"
                        type="number"
                        reversed={true}
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                        unit="m"
                        domain={[0, 2000]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#060d1d',
                          borderColor: '#00f2fe',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                        }}
                        formatter={(val: any, name: any) => [
                          `${val} ${name === 'temperature' ? '°C' : 'PSU'}`,
                          name === 'temperature' ? 'Temperature' : 'Salinity',
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="temperature"
                        stroke="#f97316"
                        strokeWidth={2}
                        dot={false}
                        name="Temperature"
                      />
                      <Line
                        type="monotone"
                        dataKey="salinity"
                        stroke="#10b981"
                        strokeWidth={2}
                        strokeDasharray="3 3"
                        dot={false}
                        name="Salinity"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-44 flex items-center justify-center text-slate-400">
                  No depth measurements available for this float.
                </div>
              )}
            </div>
          )}

          {/* Sensor Suite Specs */}
          <div className="p-3 rounded-xl bg-ocean-950/40 border border-white/5 font-mono text-[11px] text-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Sensor Suite:</span>
            </div>
            <span className="text-cyan-300">
              {float.sensor_suite || 'CTD (SBE-41CP) + Aanderaa Optode 4330'}
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-ocean-950/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">
            Autonomous Profiling Float • 10-Day Cycle
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onFlyToFloat(float.last_latitude, float.last_longitude);
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-mono font-medium shadow-glow-cyan transition-all"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Center on 4D Globe</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-mono transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
