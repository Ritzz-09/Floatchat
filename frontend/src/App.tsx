import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ChatPanel } from './components/ChatPanel';
import { GlobeView } from './components/GlobeView';
import { Controls } from './components/Controls';
import { AnalyticsPanel } from './components/AnalyticsPanel';
import { FloatDetailModal } from './components/FloatDetailModal';
import { AskModal } from './components/AskModal';
import { submitNaturalLanguageQuery, fetchFloatsList } from './services/api';
import { UnifiedQueryResponse, ArgoFloat } from './types';

export function App() {
  const [navTab, setNavTab] = useState<'explore' | 'ask' | 'analyze' | 'forecast'>('explore');
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  const [queryData, setQueryData] = useState<UnifiedQueryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');

  // 4D Dimension State
  const [currentYear, setCurrentYear] = useState(2024);
  const [currentDepth, setCurrentDepth] = useState(1000);
  const [activeLayer, setActiveLayer] = useState('anomaly');
  const [showTrajectories, setShowTrajectories] = useState(true);
  const [showFloats, setShowFloats] = useState(true);

  // Selected Float for inspection modal
  const [selectedFloat, setSelectedFloat] = useState<ArgoFloat | null>(null);
  const [inspectingFloat, setInspectingFloat] = useState<ArgoFloat | null>(null);

  // Camera flight coordinates
  const [cameraTarget, setCameraTarget] = useState<{ lat: number; lon: number; altitude?: number }>({
    lat: 13.5,
    lon: 88.0,
    altitude: 1.6,
  });

  // Cinema Mode State
  const [isCinemaMode, setIsCinemaMode] = useState(false);

  // Active Scientific Mission / Storyline
  const [activeMission, setActiveMission] = useState<any | null>(null);

  // Scientific Mission Selection Handler
  const handleSelectMission = (mission: any) => {
    setActiveMission(mission);
    setCameraTarget({ lat: mission.lat, lon: mission.lon, altitude: mission.altitude });
    setCurrentDepth(mission.depth);
    setCurrentYear(mission.year);
    setActiveLayer(mission.layer);
    handleExecuteQuery(mission.query);
  };

  // Region Shortcuts Handler
  const handleSelectRegion = (regionName: string) => {
    switch (regionName) {
      case 'Bay of Bengal':
        setCameraTarget({ lat: 14.0, lon: 88.0, altitude: 1.6 });
        handleExecuteQuery('Show temperature anomalies in the Bay of Bengal from 2020 to 2025 at 1000m depth.');
        break;
      case 'Chennai Hub':
        setCameraTarget({ lat: 13.08, lon: 80.27, altitude: 1.3 });
        handleExecuteQuery('Show ARGO floats near Chennai.');
        break;
      case 'Arabian Sea':
        setCameraTarget({ lat: 16.0, lon: 66.0, altitude: 1.7 });
        handleExecuteQuery('Show ARGO floats and temperature in the Arabian Sea from 2020 to 2025.');
        break;
      case 'Equatorial IO':
        setCameraTarget({ lat: 0.0, lon: 80.0, altitude: 2.0 });
        handleExecuteQuery('Show the trajectory of ARGO floats in the Indian Ocean.');
        break;
      default:
        break;
    }
  };

  // Execute Natural Language Query with Conversational Multi-Turn Context
  const handleExecuteQuery = async (queryText: string) => {
    setIsLoading(true);
    setLoadingStep('Understanding query...');

    setTimeout(() => {
      setLoadingStep('Finding ARGO observations...');
    }, 250);

    setTimeout(() => {
      setLoadingStep('Analyzing ocean data in DuckDB...');
    }, 500);

    setTimeout(() => {
      setLoadingStep('Updating 4D visualization...');
    }, 750);

    try {
      // Build conversational context from previous result
      const context = queryData?.structured_parameters
        ? {
            region: queryData.structured_parameters.region,
            depth_min: queryData.structured_parameters.depth_min,
            depth_max: queryData.structured_parameters.depth_max,
            variable: queryData.structured_parameters.variable,
            intent: queryData.structured_parameters.intent,
            start_date: queryData.structured_parameters.start_date,
            end_date: queryData.structured_parameters.end_date,
          }
        : undefined;

      const result = await submitNaturalLanguageQuery(
        queryText,
        currentDepth,
        `${currentYear}`,
        activeLayer,
        context
      );
      setQueryData(result);

      // AI controls the 4D visualization instruments
      if (result.structured_parameters) {
        if (result.structured_parameters.depth_min !== undefined) {
          setCurrentDepth(result.structured_parameters.depth_min);
        }
        if (result.structured_parameters.intent === 'anomaly_analysis') {
          setActiveLayer('anomaly');
        } else if (result.structured_parameters.variable) {
          setActiveLayer(result.structured_parameters.variable);
        }
      }

      // Fly globe to queried region
      if (result.globe_camera_target) {
        setCameraTarget(result.globe_camera_target);
      }
    } catch (err) {
      console.error('Failed to execute query:', err);
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  // Initial Boot: Load default Bay of Bengal Anomaly query
  useEffect(() => {
    handleExecuteQuery('Show temperature anomalies in the Bay of Bengal from 2020 to 2025 at 1000m depth.');
  }, []);

  // When depth or year slider changes, update ocean data slice
  const handleDepthChange = (newDepth: number) => {
    setCurrentDepth(newDepth);
    if (queryData) {
      submitNaturalLanguageQuery(queryData.user_query, newDepth, `${currentYear}`, activeLayer).then(
        (res) => setQueryData(res)
      );
    }
  };

  const handleYearChange = (newYear: number) => {
    setCurrentYear(newYear);
  };

  // Center camera on a specific float
  const handleFlyToFloat = (lat: number, lon: number) => {
    setCameraTarget({ lat, lon, altitude: 1.4 });
  };

  // Top Navigation Tab Selection Handler
  const handleTabChange = (tab: 'explore' | 'ask' | 'analyze' | 'forecast') => {
    setNavTab(tab);
    if (tab === 'ask') {
      setIsCinemaMode(false);
      setIsAskModalOpen(true);
    } else if (tab === 'forecast') {
      setIsCinemaMode(false);
      if (!queryData?.forecast) {
        handleExecuteQuery('Forecast temperature anomalies for the next 6 months.');
      }
    } else if (tab === 'analyze') {
      setIsCinemaMode(false);
    }
  };

  // Floating list from current response or fallback
  const displayFloats = showFloats ? (queryData?.contributing_floats || []) : [];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-ocean-950 font-sans text-slate-100">
      {/* 1. TOP NAVIGATION */}
      <Navbar
        activeTab={navTab}
        onTabChange={handleTabChange}
        onSelectRegion={handleSelectRegion}
        onSelectMission={handleSelectMission}
        isCinemaMode={isCinemaMode}
        onToggleCinemaMode={() => setIsCinemaMode(!isCinemaMode)}
      />

      {/* 2. MAIN CENTER WORKSPACE */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* LEFT: AI Chat & Reasoning Panel (hidden in cinema mode) */}
        {!isCinemaMode && (
          <ChatPanel
            currentData={queryData}
            isLoading={isLoading}
            loadingStep={loadingStep}
            onSubmitQuery={handleExecuteQuery}
            isFocused={navTab === 'ask'}
          />
        )}

        {/* CENTER: 4D Ocean Globe */}
        <main className="flex-1 h-full min-h-[350px] relative flex flex-col">
          <GlobeView
            floats={displayFloats}
            spatialGrid={queryData?.spatial_grid || []}
            selectedFloat={selectedFloat}
            onSelectFloat={(fl) => {
              setSelectedFloat(fl);
              if (fl) setInspectingFloat(fl);
            }}
            activeVariable={activeLayer}
            depth={currentDepth}
            timePeriod={`${currentYear}`}
            targetCoords={cameraTarget}
          />

          {/* Active Scientific Mission Banner */}
          {activeMission && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 rounded-2xl bg-ocean-950/90 backdrop-blur-md border border-amber-500/50 shadow-[0_0_25px_rgba(245,158,11,0.3)] animate-in fade-in slide-in-from-top-2">
              <span className="text-lg">{activeMission.icon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-amber-200 uppercase tracking-wider">
                    {activeMission.title}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold">
                    {activeMission.depth}m Depth
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 font-sans leading-tight">
                  {activeMission.subtitle}
                </p>
              </div>
              <button
                onClick={() => setActiveMission(null)}
                className="ml-2 text-[10px] font-mono px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-all"
                title="Dismiss Story Banner"
              >
                ✕
              </button>
            </div>
          )}

          {/* Cinema Mode Floating Exit Pill */}
          {isCinemaMode && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 rounded-2xl bg-ocean-950/85 backdrop-blur-md border border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
              <span className="text-xs font-mono text-purple-200 font-semibold tracking-wider uppercase">
                4D Cinema Immersion
              </span>
              <button
                onClick={() => setIsCinemaMode(false)}
                className="ml-2 text-[11px] font-mono px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 transition-all"
              >
                Exit Cinema
              </button>
            </div>
          )}
        </main>

        {/* RIGHT: 4D Time, Depth & Layer Controls (hidden in cinema mode) */}
        {!isCinemaMode && (
          <Controls
            currentYear={currentYear}
            onYearChange={handleYearChange}
            currentDepth={currentDepth}
            onDepthChange={handleDepthChange}
            activeLayer={activeLayer}
            onLayerChange={setActiveLayer}
            showTrajectories={showTrajectories}
            onToggleTrajectories={setShowTrajectories}
            showFloats={showFloats}
            onToggleFloats={setShowFloats}
            insights={queryData?.insights || []}
            summaryMetrics={queryData?.summary_metrics}
          />
        )}
      </div>

      {/* 3. BOTTOM SCIENTIFIC ANALYTICS PANEL */}
      <AnalyticsPanel
        title={
          queryData
            ? `${queryData.structured_parameters.variable.toUpperCase()} ${
                queryData.structured_parameters.intent.includes('anomaly') ? 'Anomaly' : 'Observed'
              } at ${currentDepth}m (${queryData.structured_parameters.region})`
            : `Temperature Anomaly at ${currentDepth}m (Bay of Bengal)`
        }
        timeSeries={queryData?.time_series || []}
        depthProfiles={queryData?.depth_profiles || []}
        floats={queryData?.contributing_floats || []}
        correlation={queryData?.correlation}
        forecast={queryData?.forecast}
        currentDepth={currentDepth}
        onSelectFloat={(fl) => {
          setSelectedFloat(fl);
          setInspectingFloat(fl);
        }}
        externalTab={navTab === 'forecast' ? 'forecast' : navTab === 'analyze' ? 'timeseries' : undefined}
        forceExpand={navTab === 'analyze' || navTab === 'forecast'}
      />

      {/* 4. FLOAT INSPECTION DOSSIER MODAL */}
      {inspectingFloat && (
        <FloatDetailModal
          float={inspectingFloat}
          onClose={() => setInspectingFloat(null)}
          onFlyToFloat={handleFlyToFloat}
        />
      )}

      {/* 5. ASK OCEAN AI PROMPT MODAL */}
      <AskModal
        isOpen={isAskModalOpen}
        onClose={() => setIsAskModalOpen(false)}
        onSubmitQuery={handleExecuteQuery}
        isLoading={isLoading}
        loadingStep={loadingStep}
        currentData={queryData}
        onSwitchTab={handleTabChange}
      />
    </div>
  );
}

export default App;
