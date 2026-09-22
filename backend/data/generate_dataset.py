"""
FloatChat ARGO Dataset Generator
Generates a realistic, physically-sound oceanographic dataset for the Indian Ocean,
Bay of Bengal, and Arabian Sea spanning 2020-2025.
Saves data into DuckDB database (argo_data.duckdb).
"""

import math
import os
import duckdb
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

DATA_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(DATA_DIR, "argo_data.duckdb")

# Standard ARGO observation depth levels (meters)
DEPTH_LEVELS = [0, 10, 25, 50, 75, 100, 150, 200, 300, 400, 500, 750, 1000, 1250, 1500, 1750, 2000]

REGIONS = {
    "bay_of_bengal": {"lat_min": 5.0, "lat_max": 22.5, "lon_min": 80.0, "lon_max": 98.0, "count": 24},
    "arabian_sea": {"lat_min": 8.0, "lat_max": 24.0, "lon_min": 55.0, "lon_max": 77.0, "count": 20},
    "equatorial_indian": {"lat_min": -12.0, "lat_max": 5.0, "lon_min": 60.0, "lon_max": 95.0, "count": 18},
}

PLATFORMS = ["APEX", "PROVOR", "ARVOR", "NAVIS", "SOLO-II"]
COUNTRIES = ["India (INCOIS)", "USA (NOAA)", "France (Ifremer)", "Australia (CSIRO)", "Japan (JAMSTEC)"]


def is_ocean(lat: float, lon: float) -> bool:
    """Accurate oceanographic land-mask check."""
    if lat > 26.0 and 65.0 < lon < 100.0:
        return False
    if 7.8 <= lat <= 26.0:
        w = 77.5 - (lat - 7.8) * ((77.5 - 68.8) / (24.0 - 7.8))
        e = 77.5 + (lat - 7.8) * ((89.0 - 77.5) / (22.5 - 7.8))
        if (w - 0.5) <= lon <= (e + 0.5):
            return False
    if 5.5 <= lat <= 10.2 and 79.2 <= lon <= 82.2:
        return False
    if 12.0 <= lat <= 30.0 and 34.0 <= lon <= 60.0:
        return False
    if lat > 9.5 and lon > 98.2:
        return False
    return True


def get_current_velocity(lat: float, lon: float, month: int) -> tuple[float, float]:
    """
    Realistic monsoonal surface/intermediate current velocities (degrees/day).
    Southwest Monsoon (June - September): strong eastward flow in Bay of Bengal/Arabian Sea.
    Northeast Monsoon (November - February): westward flow.
    Transition months (March-May, Oct): slower eddy-driven drift.
    """
    if lat > 0:
        if 6 <= month <= 9:  # SW Monsoon
            u = 0.04 + 0.02 * math.cos(math.radians(lat * 3))  # eastward
            v = 0.015 * math.sin(math.radians(lon * 2))
        elif month in [11, 12, 1, 2]:  # NE Monsoon
            u = -0.035 - 0.015 * math.cos(math.radians(lat * 2))  # westward
            v = -0.01 * math.sin(math.radians(lon))
        else:
            u = 0.01 * math.sin(math.radians(lon * 4))
            v = 0.01 * math.cos(math.radians(lat * 4))
    else:  # Southern equatorial current
        u = -0.05 + 0.01 * math.sin(month * math.pi / 6)  # westward SEC
        v = 0.005 * math.cos(month * math.pi / 6)

    # Add small turbulent eddy diffusion
    u += np.random.normal(0, 0.008)
    v += np.random.normal(0, 0.008)
    return u, v


def ocean_profile_physics(depth: float, lat: float, lon: float, year: int, month: int, day: int) -> dict:
    """
    Computes realistic oceanographic variables based on physical depth curves:
    - Thermocline: mixed layer -> main thermocline -> abyssal deep water
    - Halocline: Bay of Bengal river plume freshness vs Arabian Sea high evaporation
    - Oxygen Minimum Zone (OMZ): severe hypoxia at 150-700m depth in northern Indian Ocean
    - Chlorophyll-a: euphotic layer peak around 20-50m
    - Climate Anomaly: warming signal especially in 2023-2024 (Indian Ocean Dipole + global marine heatwave)
    """
    # Base surface temperature
    is_bay_of_bengal = (lat > 5 and lon >= 80)
    is_arabian_sea = (lat > 8 and lon < 78)

    # Seasonal SST cycle
    seasonal_temp_var = 1.8 * math.cos((month - 5) * 2 * math.pi / 12)
    surface_temp = 29.2 + seasonal_temp_var + (0.3 if is_bay_of_bengal else 0.0) - 0.08 * abs(lat)

    # Deep water asymptotic temperature (~2.2°C at 2000m)
    deep_temp = 2.4 + 0.2 * math.cos(math.radians(lat))

    # Thermocline parameters
    thermocline_depth = 110.0 + 20.0 * math.sin(month * math.pi / 6)
    scale_h = 160.0

    # Temperature profile using modified sigmoid thermocline
    temp_unperturbed = deep_temp + (surface_temp - deep_temp) / (1.0 + math.exp((depth - thermocline_depth) / scale_h))

    # Realistic climate warming anomaly (observed +1.1 to +1.8°C anomaly in 2023-2024)
    time_factor = (year - 2020) + (month - 1) / 12.0  # 0 to 6
    warming_trend = 0.22 * time_factor  # secular warming
    
    # 2023-2024 strong Marine Heatwave / positive IOD event in Bay of Bengal
    mhw_factor = 0.0
    if year in [2023, 2024]:
        mhw_factor = 0.9 + 0.5 * math.sin((month - 4) * math.pi / 6)
        if is_bay_of_bengal:
            mhw_factor *= 1.35

    # Depth attenuation of anomaly: highest at surface/upper 500m, but still detectable at 1000m (~0.6 - 1.2°C)
    depth_anomaly_attenuation = math.exp(-depth / 850.0)
    temp_anomaly = (warming_trend + mhw_factor - 0.35) * depth_anomaly_attenuation + np.random.normal(0, 0.06)
    
    # Final observed temperature
    temperature = round(temp_unperturbed + temp_anomaly, 3)

    # Salinity
    if is_bay_of_bengal:
        # Ganges-Brahmaputra discharge lowers surface salinity in late monsoon (Aug-Oct)
        river_runoff = 1.8 if (8 <= month <= 11 and lat > 12) else 0.6
        surf_sal = 32.2 - river_runoff + 0.05 * lat
        deep_sal = 34.82
    elif is_arabian_sea:
        # Intense evaporation creates high salinity water mass
        surf_sal = 36.4 + 0.3 * math.cos(month * math.pi / 6)
        deep_sal = 34.88
    else:
        surf_sal = 34.4
        deep_sal = 34.78

    sal_anomaly = round(np.random.normal(0, 0.08), 3)
    salinity = round(deep_sal + (surf_sal - deep_sal) * math.exp(-depth / 320.0) + sal_anomaly, 3)

    # Dissolved Oxygen (umol/kg)
    # Surface saturation ~210-230 umol/kg. Intense OMZ at 150-600m depth (<25 umol/kg in northern IO)
    if depth < 40:
        oxygen = 215.0 - depth * 0.5 + np.random.normal(0, 3.0)
    elif depth <= 700:
        # OMZ trough
        omz_core = 12.0 if (is_bay_of_bengal or is_arabian_sea) else 65.0
        oxygen = omz_core + 40.0 * abs(depth - 350) / 350.0 + np.random.normal(0, 2.0)
    else:
        # Recovery in deep abyssal water
        oxygen = 75.0 + (depth - 700) * 0.045 + np.random.normal(0, 2.0)
    oxygen = max(3.5, round(oxygen, 1))

    # Chlorophyll-a (mg/m³)
    # Confined to euphotic zone (0 - 150m) with deep chlorophyll maximum (DCM) at ~35-50m
    if depth <= 120:
        dcm_peak = 1.4 if is_bay_of_bengal else 0.9
        chlorophyll = dcm_peak * math.exp(-((depth - 40) ** 2) / 600.0) + np.random.normal(0, 0.04)
        chlorophyll = max(0.01, round(chlorophyll, 3))
    else:
        chlorophyll = 0.0

    # Pressure in decibars (approx 1 dbar per meter)
    pressure = round(depth * 1.025, 1)

    return {
        "temperature": temperature,
        "salinity": salinity,
        "oxygen": oxygen,
        "chlorophyll": chlorophyll,
        "temp_anomaly": round(temp_anomaly, 3),
        "sal_anomaly": sal_anomaly,
        "pressure": pressure,
    }


def generate_argo_dataset():
    """Builds the comprehensive ARGO DuckDB database."""
    print("Initializing FloatChat realistic ARGO dataset generation...")
    if os.path.exists(DB_PATH):
        try:
            os.remove(DB_PATH)
        except Exception:
            pass

    con = duckdb.connect(DB_PATH)

    # Create tables
    con.execute("""
    CREATE TABLE floats (
        float_id VARCHAR PRIMARY KEY,
        wmo_id VARCHAR UNIQUE,
        platform_type VARCHAR,
        country VARCHAR,
        status VARCHAR,
        deployment_date DATE,
        total_profiles INTEGER,
        last_latitude DOUBLE,
        last_longitude DOUBLE,
        last_timestamp TIMESTAMP,
        transmission_system VARCHAR,
        sensor_suite VARCHAR
    );
    """)

    con.execute("""
    CREATE TABLE profiles (
        profile_id VARCHAR PRIMARY KEY,
        float_id VARCHAR,
        cycle_number INTEGER,
        timestamp TIMESTAMP,
        latitude DOUBLE,
        longitude DOUBLE,
        max_depth DOUBLE,
        data_mode VARCHAR,
        qc_flag INTEGER
    );
    """)

    con.execute("""
    CREATE TABLE measurements (
        profile_id VARCHAR,
        float_id VARCHAR,
        timestamp TIMESTAMP,
        latitude DOUBLE,
        longitude DOUBLE,
        depth DOUBLE,
        pressure DOUBLE,
        temperature DOUBLE,
        salinity DOUBLE,
        oxygen DOUBLE,
        chlorophyll DOUBLE,
        temp_anomaly DOUBLE,
        sal_anomaly DOUBLE
    );
    """)

    float_records = []
    profile_records = []
    measurement_records = []

    np.random.seed(42)
    start_date = datetime(2020, 1, 1)
    end_date = datetime(2025, 12, 31)
    total_days = (end_date - start_date).days

    wmo_counter = 2902100

    for region_name, reg in REGIONS.items():
        for i in range(reg["count"]):
            wmo_counter += 1
            float_id = f"ARGO-{wmo_counter}"
            wmo_id = str(wmo_counter)
            platform = np.random.choice(PLATFORMS)
            country = np.random.choice(COUNTRIES)
            status = "ACTIVE" if np.random.rand() > 0.12 else "INACTIVE"
            deploy_offset = np.random.randint(0, 180)
            deploy_date = start_date + timedelta(days=deploy_offset)

            # Initial position (Strictly oceanic, never on land)
            while True:
                cur_lat = np.random.uniform(reg["lat_min"] + 1.0, reg["lat_max"] - 1.0)
                cur_lon = np.random.uniform(reg["lon_min"] + 1.0, reg["lon_max"] - 1.0)
                if is_ocean(cur_lat, cur_lon):
                    break

            cur_time = deploy_date
            cycle_num = 1

            while cur_time <= end_date:
                profile_id = f"{float_id}-{cycle_num:04d}"
                profile_records.append((
                    profile_id,
                    float_id,
                    cycle_num,
                    cur_time,
                    round(cur_lat, 4),
                    round(cur_lon, 4),
                    2000.0,
                    "D" if cur_time.year <= 2024 else "A",  # Delayed-mode vs Real-time
                    1  # Good QC flag
                ))

                # Generate observations across all depth levels
                for d in DEPTH_LEVELS:
                    obs = ocean_profile_physics(d, cur_lat, cur_lon, cur_time.year, cur_time.month, cur_time.day)
                    measurement_records.append((
                        profile_id,
                        float_id,
                        cur_time,
                        round(cur_lat, 4),
                        round(cur_lon, 4),
                        float(d),
                        obs["pressure"],
                        obs["temperature"],
                        obs["salinity"],
                        obs["oxygen"],
                        obs["chlorophyll"],
                        obs["temp_anomaly"],
                        obs["sal_anomaly"]
                    ))

                # Advance float position according to ocean circulation drift (10-day cycle)
                u, v = get_current_velocity(cur_lat, cur_lon, cur_time.month)
                next_lon = cur_lon + u * 10.0
                next_lat = cur_lat + v * 10.0

                # Deflection away from coastline / land boundary
                if not is_ocean(next_lat, next_lon):
                    # Deflect offshore back into deep water
                    cur_lon -= u * 12.0
                    cur_lat -= v * 12.0
                else:
                    cur_lon = next_lon
                    cur_lat = next_lat

                # Bounding bounce
                cur_lat = max(reg["lat_min"], min(reg["lat_max"], cur_lat))
                cur_lon = max(reg["lon_min"], min(reg["lon_max"], cur_lon))

                cur_time += timedelta(days=10)
                cycle_num += 1

            float_records.append((
                float_id,
                wmo_id,
                platform,
                country,
                status,
                deploy_date.date(),
                cycle_num - 1,
                round(cur_lat, 4),
                round(cur_lon, 4),
                cur_time - timedelta(days=10),
                "Iridium / Argos-3",
                "CTD (SBE-41CP) + Aanderaa Optode + ECO Puck"
            ))

    print(f"Generated {len(float_records)} floats, {len(profile_records)} profiles, {len(measurement_records)} observations.")

    # Batch insert into DuckDB
    con.executemany("INSERT INTO floats VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", float_records)
    con.executemany("INSERT INTO profiles VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", profile_records)
    con.executemany("INSERT INTO measurements VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", measurement_records)

    # Create high-performance indexes
    con.execute("CREATE INDEX idx_meas_depth ON measurements(depth);")
    con.execute("CREATE INDEX idx_meas_time ON measurements(timestamp);")
    con.execute("CREATE INDEX idx_meas_float ON measurements(float_id);")
    con.execute("CREATE INDEX idx_prof_float ON profiles(float_id);")

    print("DuckDB database created and indexed successfully at:", DB_PATH)
    con.close()


if __name__ == "__main__":
    generate_argo_dataset()
