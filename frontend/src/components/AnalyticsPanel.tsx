import React, { useState } from 'react';
import {
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts';
import {
  TrendingUp,
  Layers,
  ListFilter,
  BarChart2,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Info,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import {
  TimeSeriesPoint,
  DepthProfilePoint,
  ArgoFloat,
  CorrelationData,
  ForecastData
} from '../types';

interface AnalyticsPanelProps {
  title: string;
  timeSeries: TimeSeriesPoint[];
  depthProfiles: DepthProfilePoint[];
  floats: ArgoFloat[];
  correlation?: CorrelationData | null;
  forecast?: ForecastData | null;
  currentDepth: number;
  onSelectFloat: (fl: ArgoFloat) => void;
  externalTab?: 'timeseries' | 'profile' | 'floats' | 'forecast' | 'correlation';
  forceExpand?: boolean;
}

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({
  title,
  timeSeries,
  depthProfiles,
  floats,
  correlation,
  forecast,
  currentDepth,
  onSelectFloat,
  externalTab,
  forceExpand,
}) => {
  const [activeTab, setActiveTab] = useState<'timeseries' | 'profile' | 'floats' | 'forecast' | 'correlation'>('timeseries');
  const [showConfidence, setShowConfidence] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Sync external tab when clicked from navbar or quick actions
  React.useEffect(() => {
    if (externalTab) {
      setActiveTab(externalTab);
      setIsCollapsed(false);
    }
  }, [externalTab]);

  // Sync expanded state when user chooses full analytics mode
  React.useEffect(() => {
    if (forceExpand !== undefined) {
      setIsCollapsed(!forceExpand);
    }
  }, [forceExpand]);

  // Combine historical and forecast for seamless plotting
  const forecastSeries = forecast ? forecast.combined_series : timeSeries;

  return (
    <section className="border-t border-cyan-500/20 bg-ocean-900/80 backdrop-blur-xl z-20 transition-all duration-300">
      {/* Header & Tabs Bar */}
      <div className="px-4 py-2 border-b border-white/5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
            title={isCollapsed ? 'Expand Analytics Panel' : 'Collapse Analytics Panel'}
          >
            {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide uppercase font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-glow-cyan" />
              {title || `Temperature Anomaly at ${currentDepth}m (Bay of Bengal)`}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              Deterministic ARGO observation data &amp; physical calculations
            </p>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1 bg-ocean-950/80 p-1 rounded-lg border border-cyan-500/20 text-xs font-mono">
          <button
            onClick={() => { setActiveTab('timeseries'); setIsCollapsed(false); }}
            className={`px-2.5 py-1 rounded transition-all ${
              activeTab === 'timeseries'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Time Series
          </button>
          <button
            onClick={() => { setActiveTab('profile'); setIsCollapsed(false); }}
            className={`px-2.5 py-1 rounded transition-all ${
              activeTab === 'profile'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Depth Profile
          </button>
          <button
            onClick={() => { setActiveTab('floats'); setIsCollapsed(false); }}
            className={`px-2.5 py-1 rounded transition-all ${
              activeTab === 'floats'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Float Fleet ({floats.length})
          </button>
          <button
            onClick={() => { setActiveTab('forecast'); setIsCollapsed(false); }}
            className={`px-2.5 py-1 rounded transition-all ${
              activeTab === 'forecast'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Forecast (+6M)
          </button>
          <button
            onClick={() => { setActiveTab('correlation'); setIsCollapsed(false); }}
            className={`px-2.5 py-1 rounded transition-all ${
              activeTab === 'correlation'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Correlation (T vs S)
          </button>
        </div>

        {/* Confidence Interval Toggle */}
        <label className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showConfidence}
            onChange={(e) => setShowConfidence(e.target.checked)}
            className="accent-cyan-400 cursor-pointer"
          />
          <span>Show 95% CI</span>
        </label>
      </div>

      {/* Expandable Chart Workspace */}
      {!isCollapsed && (
        <div className="p-3 h-56 w-full">
          {/* 1. TIME SERIES TAB */}
          {activeTab === 'timeseries' && (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={timeSeries} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="ciGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#172c4e" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                  domain={['auto', 'auto']}
                  unit="°C"
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
                    `${typeof val === 'number' ? val.toFixed(2) : val}°C`,
                    name === 'anomaly' ? 'Temp Anomaly' : String(name || ''),
                  ]}
                />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'Baseline (0°C)', fill: '#94a3b8', fontSize: 10 }} />
                {showConfidence && (
                  <Area
                    type="monotone"
                    dataKey="ci_upper"
                    stroke="none"
                    fill="url(#ciGradient)"
                    name="95% Confidence Band"
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="anomaly"
                  stroke="#00f2fe"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#00f2fe', stroke: '#060d1d', strokeWidth: 1.5 }}
                  activeDot={{ r: 5, fill: '#ffffff' }}
                  name="Observed Anomaly"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}

          {/* 2. DEPTH PROFILE TAB */}
          {activeTab === 'profile' && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={depthProfiles} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
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
                    borderColor: '#38bdf8',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}
                  formatter={(val: any, name: any) => [
                    `${val} ${name === 'temperature' ? '°C' : 'PSU'}`,
                    name === 'temperature' ? 'Water Temp' : 'Salinity',
                  ]}
                />
                <ReferenceLine y={currentDepth} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: `Selected Slice (${currentDepth}m)`, fill: '#f59e0b', fontSize: 10 }} />
                <Line
                  type="monotone"
                  dataKey="temperature"
                  stroke="#f97316"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#f97316' }}
                  name="Temperature (°C)"
                />
                <Line
                  type="monotone"
                  dataKey="salinity"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 2, fill: '#10b981' }}
                  name="Salinity (PSU)"
                />
              </LineChart>
            </ResponsiveContainer>
          )}

          {/* 3. FLOAT FLEET TABLE TAB */}
          {activeTab === 'floats' && (
            <div className="h-full overflow-y-auto border border-white/5 rounded-lg bg-ocean-950/60 font-mono text-[11px]">
              <table className="w-full text-left">
                <thead className="bg-ocean-900/90 text-cyan-300 uppercase text-[10px] sticky top-0 border-b border-white/10">
                  <tr>
                    <th className="p-2">WMO ID</th>
                    <th className="p-2">Platform</th>
                    <th className="p-2">Country</th>
                    <th className="p-2">Coordinates</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Profiles</th>
                    <th className="p-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {floats.map((fl) => (
                    <tr
                      key={fl.float_id}
                      className="hover:bg-cyan-500/10 cursor-pointer transition-colors"
                      onClick={() => onSelectFloat(fl)}
                    >
                      <td className="p-2 font-bold text-white">{fl.wmo_id}</td>
                      <td className="p-2 text-slate-400">{fl.platform_type}</td>
                      <td className="p-2">{fl.country}</td>
                      <td className="p-2 text-cyan-300">
                        {fl.last_latitude.toFixed(2)}°N, {fl.last_longitude.toFixed(2)}°E
                      </td>
                      <td className="p-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {fl.status}
                        </span>
                      </td>
                      <td className="p-2">{fl.total_profiles}</td>
                      <td className="p-2 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectFloat(fl);
                          }}
                          className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 border border-cyan-400/30 transition-all text-[10px]"
                        >
                          Focus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 4. FORECAST TAB */}
          {activeTab === 'forecast' && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 pb-1">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-cyan-300">
                    <span className="w-3 h-0.5 bg-cyan-400" />
                    <strong>OBSERVED</strong>
                  </span>
                  <span className="flex items-center gap-1 text-amber-400">
                    <span className="w-3 h-0.5 bg-amber-400 border-b border-dashed" />
                    <strong>MODEL FORECAST (+6M)</strong>
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 bg-ocean-950 px-2 py-0.5 rounded border border-white/5">
                  Autoregressive Seasonal Model (95% CI)
                </span>
              </div>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={forecastSeries} margin={{ top: 5, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#172c4e" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }} />
                    <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }} unit="°C" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#060d1d',
                        borderColor: '#f59e0b',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                      }}
                      formatter={(val: any, name: any) => [
                        `${typeof val === 'number' ? val.toFixed(2) : val}°C`,
                        name === 'anomaly' ? 'Anomaly' : String(name || ''),
                      ]}
                    />
                    <ReferenceLine x="2025-10" stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Forecast Horizon', fill: '#f59e0b', fontSize: 10 }} />
                    <Area type="monotone" dataKey="ci_upper" stroke="none" fill="#f59e0b" fillOpacity={0.15} />
                    <Line
                      type="monotone"
                      dataKey="anomaly"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={{ r: 3, fill: '#f59e0b' }}
                      name="Forecast Anomaly"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 5. CORRELATION TAB */}
          {activeTab === 'correlation' && correlation && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between text-[11px] font-mono pb-1 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-300 font-bold">
                    Pearson r = {correlation.r.toFixed(2)}
                  </span>
                  <span className="text-slate-400">
                    (R² = {correlation.r_squared.toFixed(2)}, p &lt; 0.001)
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Sample Size: <strong>{correlation.sample_count}</strong> observations
                </div>
              </div>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#172c4e" />
                    <XAxis
                      dataKey="x"
                      name="Salinity"
                      unit=" PSU"
                      stroke="#64748b"
                      tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                      domain={['dataMin - 0.2', 'dataMax + 0.2']}
                    />
                    <YAxis
                      dataKey="y"
                      name="Temperature"
                      unit=" °C"
                      stroke="#64748b"
                      tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                      domain={['dataMin - 0.5', 'dataMax + 0.5']}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      contentStyle={{
                        backgroundColor: '#060d1d',
                        borderColor: '#00f2fe',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                      }}
                    />
                    <Scatter name="Observations" data={correlation.scatter_points} fill="#00f2fe" opacity={0.75} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
