/**
 * Classify a day as 'green' | 'amber' | 'red' for the plan week strip.
 */
export function classifyDay(prediction) {
  if (!prediction) return 'red';
  const { predicted_full_charge_time, confidence, daily_gti_kwh } = prediction;

  if (!predicted_full_charge_time) return 'red';
  if (confidence === 'low') return 'red';
  if (daily_gti_kwh < 1.5) return 'red';

  const [h] = predicted_full_charge_time.split(':').map(Number);
  if (h < 12 && (confidence === 'high' || confidence === 'medium')) return 'green';
  return 'amber';
}

/**
 * Get the weather icon emoji for a given weather_icon string.
 */
export function weatherEmoji(icon) {
  const map = {
    sunny: '☀️',
    clear: '☀️',
    partly_cloudy: '⛅',
    cloudy: '🌥️',
    overcast: '☁️',
    rainy: '🌧️',
    stormy: '⛈️',
  };
  return map[icon] || '🌤️';
}

/**
 * Plain-English weather label.
 */
export function weatherLabel(icon) {
  const map = {
    sunny: 'Sunny',
    clear: 'Clear',
    partly_cloudy: 'Partly Cloudy',
    cloudy: 'Cloudy',
    overcast: 'Overcast',
    rainy: 'Rainy',
    stormy: 'Stormy',
  };
  return map[icon] || 'Variable';
}
