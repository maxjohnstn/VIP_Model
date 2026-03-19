const MODEL = {
  intercept: 10.072815533980583,
  features: [
    'soc_8am',
    'forecast_morn_gti',
    'forecast_morn_cs_ratio',
    'gti_std',
    'soc_deficit',
    'forecast_mean_gti',
    'bat_temp_morn',
  ],
  means: [
    65.51779935275081,
    141.11972115707127,
    0.46383934177507047,
    133.9933002845878,
    44.75728155339806,
    94.75221465247303,
    13.340996133506875,
  ],
  stds: [
    20.470441138906732,
    126.68579416347106,
    0.2539083299272435,
    71.45573994275193,
    6.798366479148161,
    63.30256564504041,
    5.5386620317703406,
  ],
  coefficients: [
    -1.440679054105104,
    0.7750471970521945,
    -0.7807648225487965,
    -0.36030721126950715,
    -0.05499512558681864,
    0.0745135986611796,
    0.2391379737276998,
  ],
};

function applyFallback(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

export function getPredictionConfidence(missing, currentHour) {
  if (missing.solcastFallbackAfter10) return 'early_estimate';
  if (currentHour >= 10 && !missing.soc && !missing.solcast) return 'high';
  if (currentHour >= 8 && !missing.soc) return 'moderate';
  return 'early_estimate';
}

export function predictFullChargeHour(inputs, currentHour = 12) {
  // Prediction model details and feature definitions are documented in DASHBOARD_CALCULATIONS.md.
  const missing = {
    soc: !Number.isFinite(inputs.soc_8am),
    solcast:
      !Number.isFinite(inputs.forecast_morn_gti) ||
      !Number.isFinite(inputs.forecast_morn_cs_ratio) ||
      !Number.isFinite(inputs.forecast_mean_gti),
  };

  const seasonTempDefault = inputs.month >= 4 && inputs.month <= 9 ? 16.0 : 10.0;

  const values = {
    soc_8am: applyFallback(inputs.soc_8am, applyFallback(inputs.current_soc, 50)),
    forecast_morn_gti: applyFallback(
      inputs.forecast_morn_gti,
      applyFallback(inputs.clearsky_morn_gti, 100) * 0.6
    ),
    forecast_morn_cs_ratio: applyFallback(inputs.forecast_morn_cs_ratio, 0.6),
    gti_std: applyFallback(inputs.gti_std, 80),
    soc_deficit: applyFallback(inputs.soc_deficit, 100 - applyFallback(inputs.start_soc, 50)),
    forecast_mean_gti: applyFallback(
      inputs.forecast_mean_gti,
      applyFallback(inputs.clearsky_mean_gti, 100) * 0.6
    ),
    bat_temp_morn: applyFallback(inputs.bat_temp_morn, seasonTempDefault),
  };

  let prediction = MODEL.intercept;
  const scaled = {};

  MODEL.features.forEach((feature, i) => {
    // Standard z-score scaling before applying linear coefficients.
    const scaledVal = (values[feature] - MODEL.means[i]) / MODEL.stds[i];
    scaled[feature] = scaledVal;
    prediction += MODEL.coefficients[i] * scaledVal;
  });

  prediction = Math.max(6, Math.min(20, prediction));

  const hour = Math.floor(prediction);
  const minute = Math.round((prediction - hour) * 60);

  return {
    predicted_hour: prediction,
    predicted_time_str: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    confidence: getPredictionConfidence(
      {
        ...missing,
        solcastFallbackAfter10: currentHour >= 10 && missing.solcast,
      },
      currentHour
    ),
    inputs_used: values,
    scaled_values: scaled,
  };
}

export function sampleStdDev(values) {
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length <= 1) return 0;
  const mean = clean.reduce((sum, v) => sum + v, 0) / clean.length;
  const variance = clean.reduce((sum, v) => sum + ((v - mean) ** 2), 0) / (clean.length - 1);
  return Math.sqrt(variance);
}

export function mean(values) {
  const clean = values.filter((v) => Number.isFinite(v));
  if (!clean.length) return NaN;
  return clean.reduce((sum, v) => sum + v, 0) / clean.length;
}
