# FloatChat — AI-Powered ARGO Ocean Intelligence Platform

> **Talk to the Ocean**  
> *For a healthier ocean, a brighter tomorrow.*

FloatChat is an AI-powered natural-language interface and 4D spatiotemporal ocean intelligence platform for exploring and analyzing global ARGO profiling float observations.

---

## 1. Problem Statement

The international ARGO program maintains thousands of robotic profiling floats that drift through the world's oceans, descending to 2,000 meters every 10 days to record temperature, salinity, oxygen, and biogeochemical data. While this creates a rich archive of planetary ocean state observations, accessing and analyzing this data traditionally requires complex NetCDF processing scripts, domain-specific oceanographic tools, and manual SQL or data-frame slicing.

FloatChat bridges this gap by enabling marine researchers, climate scientists, and policymakers to query multi-dimensional ocean data in plain English:

> *"Show temperature anomalies in the Bay of Bengal from 2020 to 2025 at 1000m depth."*  
> *"Compare salinity and temperature."*  
> *"Forecast temperature anomalies for the next 6 months."*

---

## 2. Architecture

FloatChat uses a strict **deterministic scientific architecture**. The LLM acts solely as an intelligent query parser and semantic interface; all statistical calculations, anomaly assessments, and forecasting are performed deterministically on verified observation data.

```text
                                User Natural Language Query
                                             │
                                             ▼
                             ┌───────────────────────────────┐
                             │ React 18 + TypeScript + Vite  │
                             │  • Interactive 4D WebGL Globe │
                             │  • 2020-2025 Time Slider (4D) │
                             │  • 0-2000m Depth Stratum (4D) │
                             │  • Scientific Analytics Panel │
                             └───────────────┬───────────────┘
                                             │ HTTP / JSON API
                                             ▼
                             ┌───────────────────────────────┐
                             │        FastAPI Backend        │
                             │  ┌─────────────────────────┐  │
                             │  │ Hybrid Query Parser     │  │
                             │  │ (LLM API / Rule Engine) │  │
                             │  └────────────┬────────────┘  │
                             │               ▼               │
                             │  ┌─────────────────────────┐  │
                             │  │ Pydantic Query Validator│  │
                             │  └────────────┬────────────┘  │
                             │               ▼               │
                             │  ┌─────────────────────────┐  │
                             │  │ DuckDB Analytical SQL   │  │
                             │  │ (Sub-10ms Columnar Qry) │  │
                             │  └────────────┬────────────┘  │
                             │               ▼               │
                             │  ┌─────────────────────────┐  │
                             │  │ Scientific Calculation: │  │
                             │  │ • Climatological Anomaly│  │
                             │  │ • Pearson Correlation r │  │
                             │  │ • Harmonic 6M Forecast  │  │
                             │  │ • CTD Profile Slicing   │  │
                             │  └─────────────────────────┘  │
                             └───────────────────────────────┘
```

---

## 3. Tech Stack

- **Frontend**:
  - React 18 & TypeScript
  - Vite
  - Tailwind CSS (Dark Ocean mission-control theme)
  - Three.js (WebGL 4D interactive ocean globe with planetary auto-rotation)
  - Recharts (Scientific time-series, depth profile, forecast with 95% CI, and correlation scatter plots)
  - Lucide React (Oceanographic iconography)
- **Backend**:
  - Python 3.12+
  - FastAPI & Uvicorn
  - DuckDB (High-speed embedded columnar database)
  - Pandas, NumPy, SciPy (Linear regression, seasonal harmonic autoregression)
  - Pydantic v2 (Validation schemas)
- **AI & NLP**:
  - Hybrid engine: Supports Gemini 1.5 / OpenAI GPT-4 function calling, with built-in high-precision deterministic ocean semantic parser for 100% reliable offline/demo operation.

---

## 4. Dataset: Realistic ARGO Indian Ocean & Bay of Bengal Archive

Per product requirements, FloatChat is loaded with a representative, physically calibrated **Demo ARGO Dataset**:
- **Geographic Extent**: Bay of Bengal ($5^\circ\text{N} - 22.5^\circ\text{N}$, $80^\circ\text{E} - 98^\circ\text{E}$), Arabian Sea ($8^\circ\text{N} - 24^\circ\text{N}$, $55^\circ\text{E} - 77^\circ\text{E}$), and Equatorial Indian Ocean.
- **Time Span**: 2020-01-01 to 2025-12-31.
- **Scale**: 62 active WMO profiling floats (e.g. WMO 2902100+), 13,130 profiles, and **223,210 depth observations**.
- **Depth Layers**: 17 standard ARGO isobars: $0, 10, 25, 50, 75, 100, 150, 200, 300, 400, 500, 750, 1000, 1250, 1500, 1750, 2000\text{ meters}$.
- **Physics Calibration**:
  - **Thermocline**: Mixed layer ($27^\circ - 30.5^\circ\text{C}$), steep thermocline dropping to $\sim 4.5^\circ\text{C}$ at $1000\text{m}$, asymptotic deep water at $2.4^\circ\text{C}$ at $2000\text{m}$.
  - **Halocline**: Fresh river discharge in Bay of Bengal ($31.5 - 33.5\text{ PSU}$) vs intense evaporative saline cap in the Arabian Sea ($36.5\text{ PSU}$).
  - **Oxygen Minimum Zone (OMZ)**: Severe hypoxia ($<25\ \mu\text{mol/kg}$) at $150-700\text{m}$ characteristic of the northern Indian Ocean.
  - **Drift Dynamics**: Monsoonal current reversals (SW Monsoon eastward drift, NE Monsoon westward drift) driving realistic float trajectories.
  - **Anomaly Signal**: Embedded 2023-2024 marine heatwave / Indian Ocean Dipole thermal anomaly event.

*Transparency note: Clearly labelled as "Demo ARGO Dataset" within the UI.*

---

## 5. Key Features & 4D Visualization

### A. True 4D Interactive Ocean Globe
- **Dimensions**:
  - **X & Y**: Longitude & Latitude coordinates
  - **Z (Depth)**: $0\text{m}$ to $2000\text{m}$ vertical depth slicing
  - **T (Time)**: 2020–2025 time evolution
- **Planetary Auto-Rotation**: Cinematic continuous planetary rotation with Play/Pause toggle, speed controls, and smooth camera fly-to animations when targeting ocean regions.
- **Ocean Anomaly Field**: Smooth diverging color scale from cooling ($-2.0^\circ\text{C}$ deep blue) through neutral to warming ($+2.0^\circ\text{C}$ bright red).
- **Float Trajectories**: 3D ribbons rendering 10-day drift pathways across the water column.
- **Float Tooltips & Dossier**: Hover over any float to view live coordinates, battery/transmission status, and click to inspect full vertical CTD profiles.

### B. Natural Language Dialogue & Understanding
- Real-time reasoning sequence:
  `Understanding query...` $\to$ `Finding ARGO observations...` $\to$ `Analyzing ocean data in DuckDB...` $\to$ `Updating 4D visualization...`
- Parsed parameter checklist displaying extracted Region, Variable, Depth, Timeframe, Active Floats, and Observation count.
- Clickable suggestion chips for rapid exploration.

### C. Scientific Analytics Panel
1. **Time Series**: Historical observations vs baseline with zero reference line and shaded 95% confidence interval.
2. **Depth Profile**: Inverted Y-axis ($0\text{m} \to 2000\text{m}$) comparing Temperature, Salinity, and Oxygen across the water column.
3. **Float Fleet Table**: Paginated list of contributing ARGO floats with "Focus on Globe" actions.
4. **Statistical Forecast**: 6-month forward projection with expanding uncertainty bands ($\pm 1.96\sigma$).
5. **Correlation (T vs S)**: Scatter plot with OLS linear regression and Pearson $r$, emphasizing non-causal physical stratification.

---

## 6. Quickstart & Installation

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### Backend Setup
```bash
cd backend
pip install -r requirements.txt

# Generate DuckDB database (already bundled or generated via:)
python data/generate_dataset.py

# Launch FastAPI server
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Open your browser at: `http://localhost:5173`

---

## 7. API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/query` | Unified Natural Language Query handler returning 4D payload |
| `POST` | `/api/parse-query` | Returns structured parameters extracted from query string |
| `GET` | `/api/floats` | List all ARGO floats with latest coordinates & telemetry |
| `GET` | `/api/floats/{float_id}` | Complete float dossier, trajectory cycles, & latest profile |
| `POST` | `/api/anomaly` | Anomaly calculations for spatial bounding box and depth slice |
| `POST` | `/api/correlation` | Pearson correlation & linear regression fit |
| `POST` | `/api/forecast` | Autoregressive seasonal 6-month forward projections |
| `GET` | `/api/regions` | Predefined ocean basin bounding boxes |
| `GET` | `/api/health` | Health check & fleet metadata |

---

Outcome*: Focuses camera on the Coromandel coast, filtering local floats. Clicking a float displays its full vertical CTD curve.

---

## 9. Scientific Integrity & Limitations

- **Statistical Forecasting vs GCMs**: FloatChat uses harmonic autoregressive linear-seasonal regression on historical ARGO observations. It is intended for exploratory trajectory analysis, not operational numerical weather prediction.
- **Correlation vs Causation**: FloatChat explicitly avoids asserting causal claims from correlation metrics.
- **Production Archive Replacement**: The DuckDB schema directly maps to standard ARGO GDAC (Global Data Assembly Centre) NetCDF variables (`TEMP`, `PSAL`, `DOXY`, `CHLA`, `PRES`), allowing replacement with the global NetCDF archive without changing frontend contracts.
