import React, { useState } from 'react';
import {
  Send,
  CheckCircle2,
  Sparkles,
  MapPin,
  TrendingUp,
  Activity,
  Lightbulb,
  Compass,
  Mic,
  MicOff,
  Download,
  Share2,
  Check,
  Flame
} from 'lucide-react';
import { UnifiedQueryResponse } from '../types';
import { playClickSound, playSuccessChime } from '../utils/audio';

interface ChatPanelProps {
  currentData: UnifiedQueryResponse | null;
  isLoading: boolean;
  loadingStep: string;
  onSubmitQuery: (query: string) => void;
  isFocused?: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  currentData,
  isLoading,
  loadingStep,
  onSubmitQuery,
  isFocused,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Auto-focus when prompted from Navbar "Ask"
  React.useEffect(() => {
    if (isFocused) {
      inputRef.current?.focus();
    }
  }, [isFocused]);

  const sampleQueries = [
    'Show temperature anomalies in the Bay of Bengal from 2020 to 2025 at 1000m depth.',
    'Compare salinity and temperature',
    'Show float trajectories in the Indian Ocean',
    'Forecast temperature anomalies for the next 6 months',
    'Show ARGO floats near Chennai',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim() && !isLoading) {
      playClickSound();
      onSubmitQuery(inputVal.trim());
      setInputVal('');
    }
  };

  const handleChipClick = (q: string) => {
    if (!isLoading) {
      playClickSound();
      onSubmitQuery(q);
    }
  };

  // Web Speech API Voice Recognition
  const handleToggleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        playClickSound();
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputVal(transcript);
        setIsListening(false);
        playSuccessChime();
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  // Export Scientific Report as JSON Dossier
  const handleExportDossier = () => {
    if (!currentData) return;
    playClickSound();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(currentData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `FloatChat_ARGO_Report_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <aside className="w-full lg:w-[380px] xl:w-[420px] flex flex-col h-full bg-ocean-900/70 backdrop-blur-2xl border-r border-cyan-500/15 overflow-hidden">
      {/* Header */}
      <div className="p-3.5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-gradient-to-tr from-cyan-500/30 to-blue-500/20 border border-cyan-400/40 text-cyan-300 shadow-glow-cyan">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold tracking-wider uppercase text-slate-100 font-mono">
              Ocean Intelligence AI
            </h2>
            <p className="text-[10px] text-cyan-400/80 font-mono">
              Natural Language → Multi-Tier Ocean Science
            </p>
          </div>
        </div>

        {/* Export Report Action */}
        {currentData && (
          <button
            onClick={handleExportDossier}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-ocean-850 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono text-[10px] transition-all"
            title="Export Scientific JSON Dossier"
          >
            {hasCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Download className="w-3 h-3" />}
            <span>{hasCopied ? 'Exported' : 'Export'}</span>
          </button>
        )}
      </div>

      {/* Main Conversation & Intelligence Stream */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
        {/* Loading Animated State */}
        {isLoading && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-ocean-850 to-ocean-900 border border-cyan-400/40 shadow-glow-cyan space-y-3">
            <div className="flex items-center justify-between text-cyan-300 font-mono text-xs">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 animate-spin text-cyan-400" />
                <span className="font-bold">{loadingStep || 'Processing query...'}</span>
              </div>
              <span className="text-[10px] text-cyan-400 animate-pulse">Computing</span>
            </div>
            <div className="w-full bg-ocean-950 rounded-full h-1.5 overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 h-full w-3/4 animate-pulse" />
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Filtering columnar ARGO profiling float records in DuckDB...
            </p>
          </div>
        )}

        {/* User Query Card */}
        {currentData && (
          <div className="p-3.5 rounded-2xl bg-ocean-800/40 border border-cyan-400/25 shadow-sm space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-300 font-semibold">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>RESEARCHER PROMPT</span>
            </div>
            <p className="text-slate-100 font-medium text-xs leading-relaxed">
              "{currentData.user_query}"
            </p>
          </div>
        )}

        {/* AI Synthesis & Color-Coded Parameter Checklist */}
        {currentData && (
          <div className="p-4 rounded-2xl bg-ocean-850/70 border border-white/10 space-y-3 shadow-md">
            <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>SCIENTIFIC OBSERVATION SUMMARY</span>
            </div>

            <p className="text-slate-200 text-xs leading-relaxed">
              {currentData.ai_response}
            </p>

            {/* Checklist of Parsed Parameters with Distinct High-Contrast Colors */}
            <div className="pt-2.5 border-t border-white/10 space-y-1.5 font-mono text-[11px]">
              <div className="text-[10px] tracking-wider uppercase text-slate-400 font-bold mb-1">
                Validated Parameters
              </div>
              {currentData.parameter_checklist.map((item, idx) => {
                let badgeColor = 'text-cyan-300';
                let iconColor = 'text-cyan-400';
                if (item.label.includes('Region')) {
                  badgeColor = 'text-sky-300';
                  iconColor = 'text-sky-400';
                } else if (item.label.includes('Variable')) {
                  badgeColor = 'text-amber-300';
                  iconColor = 'text-amber-400';
                } else if (item.label.includes('Depth')) {
                  badgeColor = 'text-purple-300';
                  iconColor = 'text-purple-400';
                } else if (item.label.includes('Time')) {
                  badgeColor = 'text-emerald-300';
                  iconColor = 'text-emerald-400';
                } else if (item.label.includes('profiles') || item.label.includes('ARGO')) {
                  badgeColor = 'text-yellow-300';
                  iconColor = 'text-yellow-400';
                } else if (item.label.includes('Observations')) {
                  badgeColor = 'text-cyan-300';
                  iconColor = 'text-cyan-400';
                }
                return (
                  <div key={idx} className="flex items-center justify-between text-slate-300 py-0.5">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${iconColor} flex-shrink-0`} />
                      <span className="text-slate-400">{item.label}:</span>
                    </div>
                    <span className={`${badgeColor} font-bold font-mono`}>{item.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Mini Analytics Cards */}
        {currentData && (
          <div className="grid grid-cols-2 gap-2.5">
            {/* Card 1: Geographic Bounding Box */}
            <div className="p-3 rounded-2xl bg-ocean-850/60 border border-white/5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] text-sky-400 font-mono font-bold">
                <MapPin className="w-3.5 h-3.5" />
                <span>Geographic Sector</span>
              </div>
              <div className="text-xs font-bold text-slate-100 truncate">
                {currentData.structured_parameters.region}
              </div>
              <div className="text-[10px] text-sky-300/80 font-mono">
                {currentData.structured_parameters.latitude_min.toFixed(1)}°–
                {currentData.structured_parameters.latitude_max.toFixed(1)}°N,{' '}
                {currentData.structured_parameters.longitude_min.toFixed(1)}°–
                {currentData.structured_parameters.longitude_max.toFixed(1)}°E
              </div>
            </div>

            {/* Card 2: Mean Anomaly */}
            <div className="p-3 rounded-2xl bg-ocean-850/60 border border-white/5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-mono font-bold">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Mean Anomaly</span>
              </div>
              <div className="text-base font-extrabold text-amber-400 font-mono">
                {currentData.summary_metrics.average_anomaly > 0 ? '+' : ''}
                {currentData.summary_metrics.average_anomaly.toFixed(2)}
                {currentData.summary_metrics.unit}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                vs. 2020 Climatology
              </div>
            </div>
          </div>
        )}

        {/* Marine Heatwave (MHW) Event Card */}
        {currentData?.marine_heatwave && currentData.marine_heatwave.detected && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-red-950/30 to-ocean-900/80 border border-amber-500/40 shadow-sm space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between font-mono text-[10px]">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider">
                <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>Marine Heatwave Alert</span>
              </div>
              <span
                className="px-2 py-0.5 rounded font-bold"
                style={{
                  backgroundColor: `${currentData.marine_heatwave.color}25`,
                  color: currentData.marine_heatwave.color,
                  border: `1px solid ${currentData.marine_heatwave.color}50`,
                }}
              >
                {currentData.marine_heatwave.category}
              </span>
            </div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-300 font-sans">Peak Thermal Anomaly:</span>
              <span
                className="text-sm font-extrabold font-mono"
                style={{ color: currentData.marine_heatwave.color }}
              >
                +{currentData.marine_heatwave.peak_anomaly.toFixed(2)}°C
              </span>
            </div>
            <p className="text-[11px] text-slate-300/90 leading-relaxed font-sans">
              {currentData.marine_heatwave.severity}
            </p>
          </div>
        )}

        {/* Highlighted Insight Card */}
        {currentData && currentData.insights.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-ocean-900/70 to-blue-950/40 border border-cyan-500/30 shadow-sm relative overflow-hidden">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 mt-0.5">
                <Lightbulb className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-extrabold text-cyan-300 tracking-wide uppercase font-mono">
                  {currentData.insights[0].title}
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {currentData.insights[0].description}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Prompt Chips */}
      <div className="p-3 border-t border-white/5 bg-ocean-950/60 space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-mono flex items-center justify-between font-semibold">
          <span>Explore Scenarios:</span>
          <span className="text-cyan-400/80">Click to run</span>
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
          {sampleQueries.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleChipClick(q)}
              disabled={isLoading}
              className="text-left text-[11px] px-2.5 py-1 rounded-lg bg-ocean-850 hover:bg-cyan-500/25 text-slate-300 hover:text-cyan-200 border border-white/5 hover:border-cyan-500/30 transition-all truncate max-w-full font-mono"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Prompt Box with Speech-to-Text Microphone */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-cyan-500/20 bg-ocean-900/90">
        <div className="relative flex items-center gap-1.5">
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={isLoading}
            placeholder={isListening ? 'Listening to voice query...' : 'Ask FloatChat (e.g. Compare salinity & temp at 500m)'}
            className={`w-full bg-ocean-950/90 border rounded-xl pl-3.5 pr-20 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 transition-all shadow-inner ${
              isListening
                ? 'border-red-500 ring-1 ring-red-400 animate-pulse'
                : isFocused
                ? 'border-cyan-400 ring-2 ring-cyan-400/40 shadow-glow-cyan'
                : 'border-cyan-500/30 focus:border-cyan-400 focus:ring-cyan-400'
            }`}
          />

          {/* Voice Microphone Toggle */}
          <button
            type="button"
            onClick={handleToggleVoice}
            disabled={isLoading}
            className={`absolute right-10 p-1.5 rounded-lg transition-all ${
              isListening
                ? 'bg-red-500 text-white shadow-[0_0_12px_#ef4444]'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-white/5'
            }`}
            title={isListening ? 'Stop listening' : 'Voice search (Web Speech API)'}
          >
            {isListening ? <MicOff className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !inputVal.trim()}
            className="absolute right-1.5 p-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-glow-cyan transition-all"
            title="Submit query"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </aside>
  );
};
