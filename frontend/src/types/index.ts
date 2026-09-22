export interface ArgoFloat {
  float_id: string;
  wmo_id: string;
  platform_type: string;
  country: string;
  status: string;
  last_latitude: number;
  last_longitude: number;
  last_update: string;
  total_profiles: number;
  transmission_system?: string;
  sensor_suite?: string;
}

export interface SpatialGridPoint {
  lat: number;
  lon: number;
  value: number;
  anomaly: number;
  count: number;
}

export interface TimeSeriesPoint {
  date: string;
  observed: number | null;
  anomaly: number;
  baseline: number;
  ci_lower?: number;
  ci_upper?: number;
  count?: number;
  is_forecast: boolean;
}

export interface DepthProfilePoint {
  depth: number;
  temperature: number;
  temp_min: number;
  temp_max: number;
  salinity: number;
  sal_min: number;
  sal_max: number;
  oxygen: number;
  chlorophyll: number;
  count: number;
}

export interface ScatterPoint {
  x: number;
  y: number;
  depth: number;
}

export interface CorrelationData {
  var_x: string;
  var_y: string;
  r: number;
  r_squared: number;
  p_value: number;
  slope: number;
  intercept: number;
  std_err: number;
  sample_count: number;
  scatter_points: ScatterPoint[];
  regression_line: {
    x_min: number;
    x_max: number;
    y_at_min: number;
    y_at_max: number;
  };
  scientific_interpretation: string;
}

export interface ForecastData {
  forecast_series: TimeSeriesPoint[];
  combined_series: TimeSeriesPoint[];
  model_details: {
    model_type: string;
    horizon_months: number;
    rmse: number;
    confidence_level: string;
    disclaimer: string;
  };
}

export interface InsightCard {
  title: string;
  stat: string;
  description: string;
}

export interface ParameterChecklistItem {
  label: string;
  value: string;
  checked: boolean;
}

export interface StructuredParameters {
  intent: string;
  variable: string;
  secondary_variable?: string | null;
  region: string;
  latitude_min: number;
  latitude_max: number;
  longitude_min: number;
  longitude_max: number;
  start_date: string;
  end_date: string;
  depth_min: number;
  depth_max: number;
  forecast_horizon_months: number;
}

export interface MarineHeatwaveData {
  detected: boolean;
  category: string;
  category_num: number;
  peak_anomaly: number;
  color: string;
  severity: string;
}

export interface UnifiedQueryResponse {
  user_query: string;
  ai_response: string;
  structured_parameters: StructuredParameters;
  parameter_checklist: ParameterChecklistItem[];
  insights: InsightCard[];
  summary_metrics: {
    total_observations: number;
    total_profiles: number;
    total_floats: number;
    mean_observed: number;
    average_anomaly: number;
    max_anomaly: number;
    min_anomaly: number;
    std_anomaly: number;
    unit: string;
  };
  marine_heatwave?: MarineHeatwaveData;
  time_series: TimeSeriesPoint[];
  spatial_grid: SpatialGridPoint[];
  contributing_floats: ArgoFloat[];
  depth_profiles: DepthProfilePoint[];
  correlation?: CorrelationData | null;
  forecast?: ForecastData | null;
  globe_camera_target: {
    lat: number;
    lon: number;
    altitude: number;
  };
}

export interface FloatDossier {
  float_info: ArgoFloat;
  trajectory: {
    cycle_number: number;
    date_str: string;
    latitude: number;
    longitude: number;
    max_depth: number;
  }[];
  latest_profile: {
    depth: number;
    pressure: number;
    temperature: number;
    salinity: number;
    oxygen: number;
    chlorophyll: number;
    temp_anomaly: number;
  }[];
}
