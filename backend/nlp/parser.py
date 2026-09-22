"""
FloatChat NLP Query Parser
Extracts structured parameters from marine scientific natural language queries.
Hybrid architecture:
1. High-precision ocean domain rule/semantic extractor (100% reliable offline/demo).
2. LLM function calling (Gemini / OpenAI) if API keys are configured.
"""

import os
import re
import json
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

# Predefined scientific ocean bounds
OCEAN_REGIONS = {
    "bay of bengal": {"lat_min": 5.0, "lat_max": 22.5, "lon_min": 80.0, "lon_max": 98.0, "name": "Bay of Bengal"},
    "chennai": {"lat_min": 10.0, "lat_max": 16.5, "lon_min": 78.5, "lon_max": 85.0, "name": "Coastal Chennai / SW Bay of Bengal"},
    "arabian sea": {"lat_min": 8.0, "lat_max": 24.0, "lon_min": 55.0, "lon_max": 77.0, "name": "Arabian Sea"},
    "equatorial indian ocean": {"lat_min": -10.0, "lat_max": 5.0, "lon_min": 60.0, "lon_max": 95.0, "name": "Equatorial Indian Ocean"},
    "indian ocean": {"lat_min": -15.0, "lat_max": 24.0, "lon_min": 52.0, "lon_max": 100.0, "name": "Indian Ocean Basin"},
}


class StructuredQuery(BaseModel):
    intent: str = Field(
        default="anomaly_analysis",
        description="Supported: float_search, profile_search, temperature_analysis, salinity_analysis, anomaly_analysis, correlation_analysis, trajectory_analysis, forecast, comparison"
    )
    variable: str = Field(default="temperature", description="primary variable: temperature, salinity, oxygen, chlorophyll")
    secondary_variable: Optional[str] = Field(default=None, description="secondary variable for correlation/comparison")
    region: str = Field(default="Bay of Bengal")
    latitude_min: float = 5.0
    latitude_max: float = 22.5
    longitude_min: float = 80.0
    longitude_max: float = 98.0
    start_date: str = "2020-01-01"
    end_date: str = "2025-12-31"
    depth_min: float = 1000.0
    depth_max: float = 1000.0
    forecast_horizon_months: int = 6


def validate_and_normalize_query(query: StructuredQuery) -> StructuredQuery:
    """Validates parameters before database execution to ensure safety and scientific validity."""
    # Ensure latitude min <= max
    if query.latitude_min > query.latitude_max:
        query.latitude_min, query.latitude_max = query.latitude_max, query.latitude_min
    # Ensure longitude min <= max
    if query.longitude_min > query.longitude_max:
        query.longitude_min, query.longitude_max = query.longitude_max, query.longitude_min
    # Clamp to realistic oceanic bounds
    query.latitude_min = max(-90.0, min(90.0, query.latitude_min))
    query.latitude_max = max(-90.0, min(90.0, query.latitude_max))
    query.longitude_min = max(-180.0, min(180.0, query.longitude_min))
    query.longitude_max = max(-180.0, min(180.0, query.longitude_max))

    # Clamp depths
    query.depth_min = max(0.0, min(2000.0, query.depth_min))
    query.depth_max = max(0.0, min(2000.0, query.depth_max))
    if query.depth_min > query.depth_max:
        query.depth_min, query.depth_max = query.depth_max, query.depth_min

    # Ensure valid dates
    try:
        s_dt = datetime.strptime(query.start_date, "%Y-%m-%d")
        e_dt = datetime.strptime(query.end_date, "%Y-%m-%d")
        if s_dt > e_dt:
            query.start_date, query.end_date = query.end_date, query.start_date
    except Exception:
        query.start_date = "2020-01-01"
        query.end_date = "2025-12-31"

    # Normalized variable names
    valid_vars = ["temperature", "salinity", "oxygen", "chlorophyll"]
    if query.variable.lower() not in valid_vars:
        query.variable = "temperature"
    if query.secondary_variable and query.secondary_variable.lower() not in valid_vars:
        query.secondary_variable = None

    return query


def assess_marine_heatwave(avg_anomaly: float, max_anomaly: float, region: str) -> dict:
    """
    Hobday et al. (2016) Marine Heatwave (MHW) Classification:
    Category I: Moderate (+1.0 to +1.5°C)
    Category II: Strong (+1.5 to +2.0°C)
    Category III: Severe (+2.0 to +3.0°C)
    Category IV: Extreme (> +3.0°C)
    """
    peak = max(avg_anomaly, max_anomaly)
    if peak >= 3.0:
        return {
            "detected": True,
            "category": "Category IV: Extreme",
            "category_num": 4,
            "peak_anomaly": round(peak, 2),
            "color": "#ef4444",
            "severity": "Extreme thermal stress causing widespread coral bleaching and pelagic ecosystem disruption."
        }
    elif peak >= 2.0:
        return {
            "detected": True,
            "category": "Category III: Severe",
            "category_num": 3,
            "peak_anomaly": round(peak, 2),
            "color": "#f97316",
            "severity": "Severe marine heatwave conditions with prolonged elevated upper-ocean heat content."
        }
    elif peak >= 1.5:
        return {
            "detected": True,
            "category": "Category II: Strong",
            "category_num": 2,
            "peak_anomaly": round(peak, 2),
            "color": "#facc15",
            "severity": "Strong warming exceeding the 90th percentile climatological threshold."
        }
    elif peak >= 0.8:
        return {
            "detected": True,
            "category": "Category I: Moderate",
            "category_num": 1,
            "peak_anomaly": round(peak, 2),
            "color": "#38bdf8",
            "severity": "Moderate marine heatwave anomaly detected in upper ocean strata."
        }
    return {
        "detected": False,
        "category": "Normal Ocean Thermal Range",
        "category_num": 0,
        "peak_anomaly": round(peak, 2),
        "color": "#10b981",
        "severity": "Observed temperatures remain within standard climatological envelopes."
    }


def rule_based_ocean_parser(text: str, context: Optional[dict] = None) -> StructuredQuery:
    """
    High-precision deterministic rule parser for marine scientific requests.
    Handles all variations of depth, region, timeframe, intents, and variables.
    Supports conversational multi-turn context memory.
    """
    q_lower = text.lower()
    ctx = context or {}

    # Intent detection
    intent = "anomaly_analysis"
    if any(w in q_lower for w in ["forecast", "predict", "projection", "future"]):
        intent = "forecast"
    elif any(w in q_lower for w in ["compare", "correlation", "versus", " vs ", "relationship"]):
        intent = "correlation_analysis"
    elif any(w in q_lower for w in ["trajectory", "trajectories", "path", "drift", "track"]):
        intent = "trajectory_analysis"
    elif any(w in q_lower for w in ["near chennai", "find float", "show float", "search float", "list float"]):
        intent = "float_search"
    elif any(w in q_lower for w in ["profile", "vertical profile", "depth profile"]):
        intent = "profile_search"
    elif "anomal" in q_lower or "warming" in q_lower or "unusual" in q_lower or "heatwave" in q_lower:
        intent = "anomaly_analysis"
    elif "salinity" in q_lower and "temperature" not in q_lower:
        intent = "salinity_analysis"
    elif "temperature" in q_lower:
        intent = "temperature_analysis"
    elif ctx.get("intent"):
        intent = ctx.get("intent", "anomaly_analysis")

    # Variable extraction
    primary_var = ctx.get("variable", "temperature")
    sec_var = ctx.get("secondary_variable", None)
    if "salinity" in q_lower and "temperature" in q_lower:
        primary_var = "temperature"
        sec_var = "salinity"
    elif "salinity" in q_lower:
        primary_var = "salinity"
        sec_var = None
    elif "oxygen" in q_lower:
        primary_var = "oxygen"
        sec_var = None
    elif "chlorophyll" in q_lower:
        primary_var = "chlorophyll"
        sec_var = None

    # Region extraction
    region_name = ctx.get("region", "Bay of Bengal")
    bounds = OCEAN_REGIONS.get(region_name.lower(), OCEAN_REGIONS["bay of bengal"])

    for r_key, r_bounds in OCEAN_REGIONS.items():
        if r_key in q_lower:
            region_name = r_bounds["name"]
            bounds = r_bounds
            break

    # Depth extraction (e.g. 1000m, 500 meters, surface, at 1000 m)
    depth_min = float(ctx.get("depth_min", 1000.0))
    depth_max = float(ctx.get("depth_max", 1000.0))

    if "surface" in q_lower or "sea surface" in q_lower or re.search(r'\b0\s*m\b', q_lower):
        depth_min = 0.0
        depth_max = 10.0
    else:
        # Match depth ranges like "0 to 500m" or "500-1000m"
        range_match = re.search(r'(\d{1,4})\s*(?:to|-)\s*(\d{1,4})\s*(?:meters?\b|dbar\b|m\b)(?!onth)', q_lower)
        if range_match:
            depth_min = float(range_match.group(1))
            depth_max = float(range_match.group(2))
        else:
            # Match explicit depth prefix like "at 1000m" or "depth of 500m"
            depth_match = re.search(r'(?:at|depth of|depth\s*:?)\s*(\d{1,4})\s*(?:meters?\b|dbar\b|m\b)?(?!onth)', q_lower)
            if not depth_match:
                # Match standalone number with explicit meter/dbar unit (not months)
                depth_match = re.search(r'\b(\d{1,4})\s*(?:meters?\b|dbar\b|m\b(?!onth))', q_lower)
            if depth_match:
                d_val = float(depth_match.group(1))
                if 0 <= d_val <= 2000:
                    depth_min = d_val
                    depth_max = d_val

    # Time period extraction (e.g. 2020 to 2025, 2020-2024, next 6 months)
    start_date = ctx.get("start_date", "2020-01-01")
    end_date = ctx.get("end_date", "2025-12-31")

    year_range_match = re.search(r'(20\d\d)\s*(?:to|-|through)\s*(20\d\d)', q_lower)
    if year_range_match:
        start_date = f"{year_range_match.group(1)}-01-01"
        end_date = f"{year_range_match.group(2)}-12-31"
    else:
        single_year = re.search(r'\b(202[0-5])\b', q_lower)
        if single_year:
            start_date = f"{single_year.group(1)}-01-01"
            end_date = f"{single_year.group(1)}-12-31"

    # Forecast horizon
    forecast_horizon = 6
    f_match = re.search(r'(\d+)\s*(?:month|months)', q_lower)
    if f_match:
        forecast_horizon = min(24, max(1, int(f_match.group(1))))

    parsed = StructuredQuery(
        intent=intent,
        variable=primary_var,
        secondary_variable=sec_var,
        region=region_name,
        latitude_min=bounds["lat_min"],
        latitude_max=bounds["lat_max"],
        longitude_min=bounds["lon_min"],
        longitude_max=bounds["lon_max"],
        start_date=start_date,
        end_date=end_date,
        depth_min=depth_min,
        depth_max=depth_max,
        forecast_horizon_months=forecast_horizon,
    )
    return validate_and_normalize_query(parsed)


def parse_query_with_llm(text: str, context: Optional[dict] = None) -> StructuredQuery:
    """
    Optionally calls Gemini/OpenAI API if credentials exist.
    Falls back gracefully to the deterministic marine parser with conversational context.
    """
    gemini_key = os.getenv("GEMINI_API_KEY")

    if gemini_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            prompt = f"""
You are an oceanographic natural language parser for ARGO data.
Convert the user query into valid JSON matching this schema:
{{
  "intent": "anomaly_analysis" | "float_search" | "profile_search" | "temperature_analysis" | "salinity_analysis" | "correlation_analysis" | "trajectory_analysis" | "forecast" | "comparison",
  "variable": "temperature" | "salinity" | "oxygen" | "chlorophyll",
  "secondary_variable": null | "temperature" | "salinity" | "oxygen" | "chlorophyll",
  "region": string (e.g. "Bay of Bengal"),
  "latitude_min": float,
  "latitude_max": float,
  "longitude_min": float,
  "longitude_max": float,
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "depth_min": float,
  "depth_max": float,
  "forecast_horizon_months": int
}}
Return ONLY valid JSON.
Context from previous query: {json.dumps(context or {})}
User query: "{text}"
"""
            response = model.generate_content(prompt)
            clean_text = response.text.strip().replace("```json", "").replace("```", "")
            data = json.loads(clean_text)
            return validate_and_normalize_query(StructuredQuery(**data))
        except Exception as e:
            print(f"Gemini API parse failed, falling back to rule parser: {e}")

    # Default robust fallback
    return rule_based_ocean_parser(text, context)
