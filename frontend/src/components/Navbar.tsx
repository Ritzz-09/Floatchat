import React, { useState } from 'react';
import {
  Waves,
  Compass,
  HelpCircle,
  BarChart3,
  TrendingUp,
  Radio,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  MapPin
} from 'lucide-react';
import { playClickSound, setSoundMuted } from '../utils/audio';

interface NavbarProps {
  activeTab: 'explore' | 'ask' | 'analyze' | 'forecast';
  onTabChange: (tab: 'explore' | 'ask' | 'analyze' | 'forecast') => void;
  onSelectRegion?: (regionName: string) => void;
  onSelectMission?: (mission: any) => void;
  isCinemaMode: boolean;
  onToggleCinemaMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onSelectRegion,
  onSelectMission,
  isCinemaMode,
  onToggleCinemaMode,
}) => {
  const [isMuted, setIsMuted] = useState(false);

  const toggleSound = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    setSoundMuted(nextState);
    if (!nextState) playClickSound();
  };

  const handleTabClick = (tab: 'explore' | 'ask' | 'analyze' | 'forecast') => {
    playClickSound();
    onTabChange(tab);
  };

  const regions = [
    { name: 'Bay of Bengal', icon: '🌊' },
    { name: 'Chennai Hub', icon: '📍' },
    { name: 'Arabian Sea', icon: '⚓' },
    { name: 'Equatorial IO', icon: '🌐' },
  ];

  const [isMissionsOpen, setIsMissionsOpen] = useState(false);

  const missions = [
    {
      id: 'heatwave_bob',
      title: '2023 Bay of Bengal Heatwave',
      subtitle: 'Category II/III thermal anomaly (+1.8°C)',
      icon: '🔥',
      query: 'Show temperature anomalies in the Bay of Bengal from 2020 to 2025 at 0m depth.',
      region: 'Bay of Bengal',
      depth: 0,
      year: 2023,
      layer: 'anomaly',
      lat: 14.0,
      lon: 88.0,
      altitude: 1.5,
    },
    {
      id: 'halocline_as',
      title: 'Arabian Sea Halocline & OMZ',
      subtitle: 'High-salinity outflow & oxygen minimum',
      icon: '⚓',
      query: 'Compare temperature and salinity at 1000m depth.',
      region: 'Arabian Sea',
      depth: 1000,
      year: 2024,
      layer: 'salinity',
      lat: 16.0,
      lon: 66.0,
      altitude: 1.6,
    },
    {
      id: 'monsoon_gyres',
      title: 'Monsoon Drift Current Reversal',
      subtitle: '10-day drift trajectories in equatorial basin',
      icon: '🌀',
      query: 'Show the trajectory of ARGO floats in the Indian Ocean.',
      region: 'Indian Ocean Basin',
      depth: 1000,
      year: 2024,
      layer: 'temperature',
      lat: 3.0,
      lon: 78.0,
      altitude: 2.1,
    },
    {
      id: 'chennai_fleet',
      title: 'Chennai Coastal Profiler Fleet',
      subtitle: 'Coastal upwelling & freshwater runoff plume',
      icon: '📍',
      query: 'Show ARGO floats near Chennai.',
      region: 'Coastal Chennai / SW Bay of Bengal',
      depth: 500,
      year: 2024,
      layer: 'anomaly',
      lat: 13.08,
      lon: 80.27,
      altitude: 1.3,
    },
  ];

  return (
    <header className="h-14 border-b border-cyan-500/20 bg-ocean-900/90 backdrop-blur-xl px-4 flex items-center justify-between z-30 sticky top-0 select-none">
      {/* Brand & Wave Icon */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 shadow-glow-cyan">
          <Waves className="w-5 h-5 text-white" />
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 ocean-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-extrabold tracking-wider text-white bg-gradient-to-r from-cyan-300 via-sky-100 to-white bg-clip-text text-transparent font-mono">
              FloatChat
            </span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border border-cyan-400/40 bg-cyan-950/60 text-cyan-300 font-bold">
              4D ARGO
            </span>
          </div>
          <p className="text-[10px] text-cyan-300/80 font-medium tracking-wide">
            Talk to the Ocean
          </p>
        </div>
      </div>

      {/* Quick Region Shortcuts & Scientific Missions */}
      <div className="hidden xl:flex items-center gap-2">
        {/* Curated Missions Launcher */}
        {onSelectMission && (
          <div className="relative">
            <button
              onClick={() => {
                playClickSound();
                setIsMissionsOpen(!isMissionsOpen);
              }}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-purple-500/20 hover:from-amber-500/30 hover:to-purple-500/30 text-amber-300 border border-amber-500/40 shadow-sm transition-all flex items-center gap-1.5 text-xs font-mono font-bold"
            >
              <span>🔬</span>
              <span>Scientific Stories</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                4 Tours
              </span>
            </button>

            {/* Missions Popover Menu */}
            {isMissionsOpen && (
              <div className="absolute top-11 left-0 w-80 p-2 rounded-2xl bg-ocean-950/95 border border-amber-500/40 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2 py-1 text-[10px] uppercase tracking-wider font-bold font-mono text-amber-400 flex items-center justify-between border-b border-white/10 pb-1.5 mb-1">
                  <span>Curated Ocean Storylines</span>
                  <span className="text-slate-500 font-normal">1-Click Tour</span>
                </div>
                {missions.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      playClickSound();
                      setIsMissionsOpen(false);
                      onSelectMission(m);
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-amber-500/15 border border-transparent hover:border-amber-500/30 transition-all flex items-start gap-2.5 group"
                  >
                    <span className="text-base">{m.icon}</span>
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-xs font-bold text-slate-100 group-hover:text-amber-200 truncate font-mono">
                        {m.title}
                      </div>
                      <div className="text-[10px] text-slate-400 group-hover:text-slate-300 leading-tight">
                        {m.subtitle}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick Basins */}
        {onSelectRegion && (
          <div className="flex items-center gap-1.5 bg-ocean-950/70 p-1 rounded-xl border border-white/10 font-mono text-[11px]">
            <span className="text-slate-400 px-2 text-[10px] flex items-center gap-1 uppercase tracking-wider font-semibold">
              <MapPin className="w-3 h-3 text-cyan-400" />
              Basins:
            </span>
            {regions.map((reg) => (
              <button
                key={reg.name}
                onClick={() => {
                  playClickSound();
                  onSelectRegion(reg.name);
                }}
                className="px-2.5 py-1 rounded-lg bg-ocean-900/80 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-200 border border-white/5 hover:border-cyan-500/40 transition-all flex items-center gap-1.5 text-[11px]"
              >
                <span>{reg.icon}</span>
                <span>{reg.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Center Navigation */}
      <nav className="hidden md:flex items-center gap-1 bg-ocean-950/70 p-1 rounded-xl border border-white/5 font-mono">
        <button
          onClick={() => handleTabClick('explore')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'explore'
              ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-300 border border-cyan-400/50 shadow-glow-cyan'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          Explore
        </button>
        <button
          onClick={() => handleTabClick('ask')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'ask'
              ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-300 border border-cyan-400/50 shadow-glow-cyan'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
          Ask
        </button>
        <button
          onClick={() => handleTabClick('analyze')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'analyze'
              ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-300 border border-cyan-400/50 shadow-glow-cyan'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
          Analyze
        </button>
        <button
          onClick={() => handleTabClick('forecast')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'forecast'
              ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-300 border border-cyan-400/50 shadow-glow-cyan'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
          Forecast
        </button>
      </nav>

      {/* Right Controls: Audio SFX, Cinema Mode & Tagline */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Audio Mute/Unmute */}
        <button
          onClick={toggleSound}
          className={`p-2 rounded-xl border transition-all ${
            !isMuted
              ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300 shadow-glow-cyan'
              : 'bg-ocean-950/80 border-white/10 text-slate-500 hover:text-slate-300'
          }`}
          title={isMuted ? 'Unmute Audio SFX' : 'Mute Audio SFX'}
        >
          {!isMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Cinema / Fullscreen Immersion Mode */}
        <button
          onClick={() => {
            playClickSound();
            onToggleCinemaMode();
          }}
          className={`p-2 rounded-xl border transition-all ${
            isCinemaMode
              ? 'bg-purple-500/25 border-purple-400/60 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
              : 'bg-ocean-950/80 border-white/10 text-slate-400 hover:text-white'
          }`}
          title={isCinemaMode ? 'Exit Cinema Mode' : 'Enter 4D Cinema Mode'}
        >
          {isCinemaMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Tagline Badge */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-xl bg-ocean-850 border border-cyan-500/20 text-cyan-300/90 shadow-sm">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="font-semibold">62 ARGO Floats Online</span>
        </div>
      </div>
    </header>
  );
};
