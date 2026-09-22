"""
FloatChat FastAPI Backend Service
Provides high-performance analytical ocean intelligence endpoints:
- Natural Language query understanding
- 4D Ocean data retrieval and anomaly calculations via DuckDB
- Float trajectories and vertical CTD profile retrieval
- Variable correlation, linear regression, and statistical time-series forecasting
"""

import os
import duckdb
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from nlp.parser import (
    StructuredQuery,
    OCEAN_REGIONS,
    parse_query_with_llm,
    rule_based_ocean_parser,
    validate_and_normalize_query,
    assess_marine_heatwave
)
from analysis.scientific import (
    calculate_anomalies,
    calculate_correlation,
    calculate_depth_profile,
    compute_forecast,
    generate_factual_insights,
    get_db_connection
)

app = FastAPI(
    title="FloatChat Ocean Intelligence API",
    description="Backend service for ARGO ocean profiling data exploration, 4D globe rendering, and AI intelligence.",
    version="1.0.0"
)

# Enable CORS for frontend dev and preview
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class NaturalLanguageQueryRequest(BaseModel):
    query: str
    depth: Optional[float] = None
    time_period: Optional[str] = None
    layer: Optional[str] = None
    context: Optional[dict] = None


class AnomalyRequest(BaseModel):
    latitude_min: float = 5.0
    latitude_max: float = 22.5
    longitude_min: float = 80.0
    longitude_max: float = 98.0
    depth_min: float = 1000.0
    depth_max: float = 1000.0
    start_date: str = "2020-01-01"
    end_date: str = "2025-12-31"
    variable: str = "temperature"


class CorrelationRequest(BaseModel):
    latitude_min: float = 5.0
    latitude_max: float = 22.5
    longitude_min: float = 80.0
    longitude_max: float = 98.0
    depth_min: float = 0.0
    depth_max: float = 2000.0
    start_date: str = "2020-01-01"
    end_date: str = "2025-12-31"
    var_x: str = "salinity"
    var_y: str = "temperature"


class ForecastRequest(BaseModel):
    latitude_min: float = 5.0
    latitude_max: float = 22.5
    longitude_min: float = 80.0
    longitude_max: float = 98.0
    depth_min: float = 1000.0
    depth_max: float = 1000.0
    start_date: str = "2020-01-01"
    end_date: str = "2025-12-31"
    variable: str = "temperature"
    horizon_months: int = 6


@app.get("/api/health")
def health_check():
    """Health status and dataset metadata."""
    try:
        con = get_db_connection()
        float_count = con.execute("SELECT count(*) FROM floats").fetchone()[0]
        profile_count = con.execute("SELECT count(*) FROM profiles").fetchone()[0]
        obs_count = con.execute("SELECT count(*) FROM measurements").fetchone()[0]
        con.close()
        return {
            "status": "healthy",
            "dataset": "Demo ARGO Dataset (Indian Ocean, Bay of Bengal, Arabian Sea)",
            "time_coverage": "2020-01-01 to 2025-12-31",
            "active_floats": float_count,
            "total_profiles": profile_count,
            "total_observations": obs_count,
            "depth_range_m": "0 - 2000m",
            "physics_calibrated": True
        }
    except Exception as e:
        return {
            "status": "warning",
            "message": f"Database not yet initialized or error: {str(e)}"
        }


@app.get("/api/regions")
def get_regions():
    """List predefined geographic bounds."""
    return OCEAN_REGIONS


@app.post("/api/parse-query")
def parse_query_endpoint(req: NaturalLanguageQueryRequest):
    """Parses natural language into structured parameters."""
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    parsed = parse_query_with_llm(req.query)
    return parsed


@app.post("/api/query")
def handle_unified_query(req: NaturalLanguageQueryRequest):
    """
    Main Natural Language Pipeline:
    Natural Language -> LLM/NLP Parser -> Parameter Validation -> DuckDB Query -> Scientific Analysis -> 4D UI Payload
    """
    query_text = req.query.strip()
    if not query_text:
        raise HTTPException(status_code=400, detail="Query string is empty")

    # 1. Parse structured parameters with conversational context memory
    structured: StructuredQuery = parse_query_with_llm(query_text, context=req.context)

    # Allow user slider overrides if provided in request
    if req.depth is not None:
        structured.depth_min = float(req.depth)
        structured.depth_max = float(req.depth)
    if req.layer is not None and req.layer.lower() in ["temperature", "salinity", "oxygen", "chlorophyll"]:
        structured.variable = req.layer.lower()

    # 2. Run Anomaly calculations
    anom_result = calculate_anomalies(
        lat_min=structured.latitude_min,
        lat_max=structured.latitude_max,
        lon_min=structured.longitude_min,
        lon_max=structured.longitude_max,
        depth_min=structured.depth_min,
        depth_max=structured.depth_max,
        start_date=structured.start_date,
        end_date=structured.end_date,
        variable=structured.variable
    )

    # 3. Run Correlation if intent asks or secondary variable is present
    corr_result = None
    if structured.intent in ["correlation_analysis", "comparison"] or structured.secondary_variable:
        sec = structured.secondary_variable or ("salinity" if structured.variable == "temperature" else "temperature")
        corr_result = calculate_correlation(
            lat_min=structured.latitude_min,
            lat_max=structured.latitude_max,
            lon_min=structured.longitude_min,
            lon_max=structured.longitude_max,
            depth_min=0.0,
            depth_max=2000.0,
            start_date=structured.start_date,
            end_date=structured.end_date,
            var_x=sec,
            var_y=structured.variable
        )

    # 4. Vertical Depth Profile for selected area
    depth_profiles = calculate_depth_profile(
        lat_min=structured.latitude_min,
        lat_max=structured.latitude_max,
        lon_min=structured.longitude_min,
        lon_max=structured.longitude_max,
        start_date=structured.start_date,
        end_date=structured.end_date
    )

    # 5. Forecast projection
    forecast_data = None
    if structured.intent == "forecast" or "forecast" in query_text.lower():
        forecast_data = compute_forecast(
            historical_series=anom_result["time_series"],
            horizon_months=structured.forecast_horizon_months
        )

    # 6. Marine Heatwave (MHW) Classification
    mhw_info = assess_marine_heatwave(
        avg_anomaly=anom_result["summary"]["average_anomaly"],
        max_anomaly=anom_result["summary"]["max_anomaly"],
        region=structured.region
    )

    # 7. Synthesize Factual Scientific Insights
    time_span = f"{structured.start_date[:4]}–{structured.end_date[:4]}"
    insights = generate_factual_insights(
        summary=anom_result["summary"],
        region_name=structured.region,
        depth=structured.depth_min,
        variable=structured.variable,
        time_period=time_span,
        correlation_data=corr_result
    )

    # 8. Formulate Checklist for UI
    checklist = [
        {"label": "Region", "value": structured.region, "checked": True},
        {"label": "Variable", "value": f"{structured.variable.capitalize()} ({'anomaly' if 'anomaly' in structured.intent else 'observed'})", "checked": True},
        {"label": "Depth", "value": f"{int(structured.depth_min)} m", "checked": True},
        {"label": "Time period", "value": time_span, "checked": True},
        {"label": "ARGO profiles", "value": f"{anom_result['summary']['total_profiles']} profiles", "checked": True},
        {"label": "Observations", "value": f"{anom_result['summary']['total_observations']:,} data points", "checked": True},
    ]

    # Scientific natural language summary response
    avg_anom = anom_result["summary"]["average_anomaly"]
    ai_response_text = (
        f"Here's the {structured.variable} anomaly analysis for {structured.region} ({time_span}) at {int(structured.depth_min)}m depth. "
        f"Fleet observations indicate an average anomaly of {avg_anom:+.2f}{anom_result['summary']['unit']} across {anom_result['summary']['total_floats']} active profiling floats."
    )

    return {
        "user_query": query_text,
        "ai_response": ai_response_text,
        "structured_parameters": structured.dict(),
        "parameter_checklist": checklist,
        "insights": insights,
        "summary_metrics": anom_result["summary"],
        "marine_heatwave": mhw_info,
        "time_series": anom_result["time_series"],
        "spatial_grid": anom_result["spatial_grid"],
        "contributing_floats": anom_result["contributing_floats"],
        "depth_profiles": depth_profiles,
        "correlation": corr_result,
        "forecast": forecast_data,
        "globe_camera_target": {
            "lat": (structured.latitude_min + structured.latitude_max) / 2.0,
            "lon": (structured.longitude_min + structured.longitude_max) / 2.0,
            "altitude": 1.6
        }
    }


@app.get("/api/floats")
def list_floats(
    region: Optional[str] = None,
    status: Optional[str] = None
):
    """Returns list of ARGO floats with current coordinates and health status."""
    con = get_db_connection()
    where_clauses = []
    if status:
        where_clauses.append(f"status = '{status.upper()}'")

    where_str = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
    query = f"""
    SELECT 
        float_id,
        wmo_id,
        platform_type,
        country,
        status,
        last_latitude,
        last_longitude,
        strftime(last_timestamp, '%Y-%m-%d') as last_update,
        total_profiles,
        transmission_system,
        sensor_suite
    FROM floats
    {where_str}
    ORDER BY wmo_id;
    """
    df = con.execute(query).df()
    con.close()
    return df.to_dict(orient="records")


@app.get("/api/floats/{float_id}")
def get_float_details(float_id: str):
    """Returns complete dossier for a single float, including 4D trajectory and latest depth profile."""
    con = get_db_connection()

    # Float metadata
    float_query = f"SELECT * FROM floats WHERE float_id = '{float_id}' OR wmo_id = '{float_id}';"
    float_row = con.execute(float_query).fetchone()
    if not float_row:
        con.close()
        raise HTTPException(status_code=404, detail="ARGO Float not found")

    col_names = [desc[0] for desc in con.description]
    float_dict = dict(zip(col_names, float_row))

    actual_float_id = float_dict["float_id"]

    # Trajectory path points
    traj_query = f"""
    SELECT 
        cycle_number,
        strftime(timestamp, '%Y-%m-%d') as date_str,
        latitude,
        longitude,
        max_depth
    FROM profiles
    WHERE float_id = '{actual_float_id}'
    ORDER BY cycle_number ASC;
    """
    traj_df = con.execute(traj_query).df()

    # Latest profile depth measurements
    latest_prof_query = f"""
    SELECT 
        depth,
        pressure,
        temperature,
        salinity,
        oxygen,
        chlorophyll,
        temp_anomaly
    FROM measurements
    WHERE float_id = '{actual_float_id}'
      AND profile_id = (SELECT max(profile_id) FROM profiles WHERE float_id = '{actual_float_id}')
    ORDER BY depth ASC;
    """
    profile_df = con.execute(latest_prof_query).df()
    con.close()

    return {
        "float_info": float_dict,
        "trajectory": traj_df.to_dict(orient="records"),
        "latest_profile": profile_df.to_dict(orient="records")
    }


@app.post("/api/anomaly")
def anomaly_endpoint(req: AnomalyRequest):
    """Direct anomaly calculation."""
    return calculate_anomalies(
        lat_min=req.latitude_min,
        lat_max=req.latitude_max,
        lon_min=req.longitude_min,
        lon_max=req.longitude_max,
        depth_min=req.depth_min,
        depth_max=req.depth_max,
        start_date=req.start_date,
        end_date=req.end_date,
        variable=req.variable
    )


@app.post("/api/correlation")
def correlation_endpoint(req: CorrelationRequest):
    """Direct correlation analysis."""
    return calculate_correlation(
        lat_min=req.latitude_min,
        lat_max=req.latitude_max,
        lon_min=req.longitude_min,
        lon_max=req.longitude_max,
        depth_min=req.depth_min,
        depth_max=req.depth_max,
        start_date=req.start_date,
        end_date=req.end_date,
        var_x=req.var_x,
        var_y=req.var_y
    )


@app.post("/api/forecast")
def forecast_endpoint(req: ForecastRequest):
    """Direct forecast endpoint."""
    anom = calculate_anomalies(
        lat_min=req.latitude_min,
        lat_max=req.latitude_max,
        lon_min=req.longitude_min,
        lon_max=req.longitude_max,
        depth_min=req.depth_min,
        depth_max=req.depth_max,
        start_date=req.start_date,
        end_date=req.end_date,
        variable=req.variable
    )
    return compute_forecast(
        historical_series=anom["time_series"],
        horizon_months=req.horizon_months
    )


@app.get("/api/llm/config")
def llm_config():
    return {
        "status": "active",
        "model": "FloatChat Hybrid Engine (DuckDB + DeepSeek-R1 / Qwen)",
        "context_window": 32768,
        "temperature": 0.1,
        "supported_variables": ["temperature", "salinity", "oxygen", "chlorophyll", "temp_anomaly"]
    }


@app.get("/api/tools")
def tools_list():
    return {
        "tools": [
            {"name": "query_ocean_data", "description": "SQL analytical queries on DuckDB ARGO fleet"},
            {"name": "calculate_anomaly", "description": "Hobday et al. (2016) marine heatwave & anomaly calculations"},
            {"name": "dive_cycle_simulator", "description": "10-day physical ARGO buoyancy and CTD profile simulator"},
            {"name": "generate_forecast", "description": "Statistical Holt-Winters oceanographic forecasting"}
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
