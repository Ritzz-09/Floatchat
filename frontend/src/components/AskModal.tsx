import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  X,
  Compass,
  TrendingUp,
  Activity,
  MapPin,
  BarChart3,
  Layers,
  ArrowRight,
  Lightbulb
} from 'lucide-react';
import { UnifiedQueryResponse } from '../types';
import { playClickSound, playSuccessChime } from '../utils/audio';

interface AskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitQuery: (query: string) => void;
  isLoading: boolean;
  loadingStep: string;
  currentData: UnifiedQueryResponse | null;
  onSwitchTab?: (tab: 'explore' | 'ask' | 'analyze' | 'forecast') => void;
}

export const AskModal: React.FC<AskModalProps> = ({
  isOpen,
  onClose,
  onSubmitQuery,
  isLoading,
  loadingStep,
  currentData,
  onSwitchTab,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim() && !isLoading) {
      playClickSound();
      onSubmitQuery(inputVal.trim());
      setInputVal('');
      onClose();
    }
  };

  const handleSelectPrompt = (prompt: string) => {
    if (!isLoading) {
      playClickSound();
      onSubmitQuery(prompt);
      onClose();
    }
  };

  // Web Speech API Voice Dictation
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

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const promptCategories = [
    {
      category: 'Thermal Anomalies & Warming',
      icon: <Activity className="w-4 h-4 text-amber-400" />,
      prompts: [
        'Show temperature anomalies in the Bay of Bengal from 2020 to 2025 at 1000m depth.',
        'Which areas have experienced unusual warming?',
      ],
    },
    {
      category: 'Float Telemetry & Locations',
      icon: <MapPin className="w-4 h-4 text-sky-400" />,
      prompts: [
        'Show ARGO floats near Chennai.',
        'Show active profiling floats in the Arabian Sea.',
      ],
    },
    {
      category: 'CTD Correlation & Stratification',
      icon: <BarChart3 className="w-4 h-4 text-emerald-400" />,
      prompts: [
        'Compare temperature and salinity at 1000m depth.',
        'Show vertical CTD depth profiles in the Indian Ocean.',
      ],
    },
    {
      category: 'Trajectories & Monsoon Circulation',
      icon: <Compass className="w-4 h-4 text-cyan-400" />,
      prompts: [
        'Show the trajectory of ARGO floats in the Indian Ocean.',
      ],
    },
    {
      category: 'Autoregressive Forecasting',
      icon: <TrendingUp className="w-4 h-4 text-purple-400" />,
      prompts: [
        'Forecast temperature anomalies for the next 6 months.',
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ocean-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-ocean-900/95 border border-cyan-500/40 rounded-3xl shadow-[0_0_50px_rgba(0,242,254,0.25)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-cyan-500/20 flex items-center justify-between bg-ocean-850/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 shadow-glow-cyan text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white font-mono tracking-wide flex items-center gap-2">
                Ask FloatChat Ocean AI
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-cyan-400/40 bg-cyan-950/70 text-cyan-300">
                  ARGO Natural Language
                </span>
              </h2>
              <p className="text-xs text-cyan-300/80 font-sans">
                Query 62 active profiling floats, 223,000+ observations & physical ocean models
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Query Input Bar */}
        <form onSubmit={handleSubmit} className="p-5 border-b border-cyan-500/15 bg-ocean-950/50">
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              disabled={isLoading}
              placeholder={
                isListening
                  ? 'Listening to speech query...'
                  : 'Type your question (e.g. Compare salinity & temp at 1000m depth, or Show floats near Chennai)'
              }
              className={`w-full bg-ocean-900 border rounded-2xl pl-4 pr-24 py-3.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition-all shadow-inner ${
                isListening
                  ? 'border-red-500 ring-2 ring-red-400 animate-pulse'
                  : 'border-cyan-500/40 focus:border-cyan-400 focus:ring-cyan-400/40 shadow-glow-cyan'
              }`}
            />

            {/* Voice Dictation Button */}
            <button
              type="button"
              onClick={handleToggleVoice}
              disabled={isLoading}
              className={`absolute right-12 p-2 rounded-xl transition-all ${
                isListening
                  ? 'bg-red-500 text-white shadow-[0_0_12px_#ef4444]'
                  : 'text-slate-400 hover:text-cyan-300 hover:bg-white/5'
              }`}
              title={isListening ? 'Stop listening' : 'Voice Search (Web Speech API)'}
            >
              {isListening ? <MicOff className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Submit Query Button */}
            <button
              type="submit"
              disabled={isLoading || !inputVal.trim()}
              className="absolute right-2 p-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-glow-cyan transition-all"
              title="Submit Query"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Loading Progress State */}
        {isLoading && (
          <div className="p-4 mx-5 my-3 rounded-2xl bg-cyan-950/40 border border-cyan-400/40 shadow-glow-cyan flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-cyan-400 animate-spin" />
              <div>
                <p className="text-xs font-bold font-mono text-cyan-300">
                  {loadingStep || 'Executing scientific query in DuckDB...'}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  Synthesizing observational data & physical models
                </p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 animate-pulse">
              Computing
            </span>
          </div>
        )}

        {/* Scrollable Questions & Prompts Directory */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase tracking-wider font-semibold">
            <span>Verified Scientific Ocean Queries</span>
            <span className="text-cyan-400">Click any query to execute</span>
          </div>

          <div className="space-y-4">
            {promptCategories.map((cat, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-300">
                  {cat.icon}
                  <span>{cat.category}</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {cat.prompts.map((p, pIdx) => (
                    <button
                      key={pIdx}
                      onClick={() => handleSelectPrompt(p)}
                      disabled={isLoading}
                      className="w-full text-left p-3 rounded-xl bg-ocean-950/60 hover:bg-cyan-500/15 border border-white/5 hover:border-cyan-500/30 text-slate-200 hover:text-cyan-100 transition-all text-xs font-mono flex items-center justify-between group"
                    >
                      <span className="truncate pr-4">"{p}"</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-300 group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Previous Query Quick Return */}
          {currentData && (
            <div className="mt-4 p-4 rounded-2xl bg-ocean-800/40 border border-cyan-500/20 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-cyan-300 font-bold">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-cyan-400" />
                  <span>Current Active Analysis:</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
                  {currentData.structured_parameters.region}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {currentData.ai_response}
              </p>
              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    playClickSound();
                    onSwitchTab?.('explore');
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-mono flex items-center gap-1.5 transition-all"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>View on 4D Globe</span>
                </button>
                <button
                  onClick={() => {
                    playClickSound();
                    onSwitchTab?.('analyze');
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-mono flex items-center gap-1.5 transition-all"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Open Analytics</span>
                </button>
                <button
                  onClick={() => {
                    playClickSound();
                    onSwitchTab?.('forecast');
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs font-mono flex items-center gap-1.5 transition-all"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>6M Forecast</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-6 py-3 border-t border-white/5 bg-ocean-950/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Press Enter to submit • Esc to close</span>
          <span className="text-cyan-400/80 font-semibold">DuckDB Columnar Analytical Engine</span>
        </div>
      </div>
    </div>
  );
};
