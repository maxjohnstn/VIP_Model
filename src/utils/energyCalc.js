/**
 * energyCalc.js
 * -------------
 * All times are in minutes-since-midnight UTC to match ISO timestamp rows.
 * Uses getUTCHours() throughout — NOT getHours() — to avoid BST timezone shifts.
 */

function rowMinutesUTC(row) {
  const ts = new Date(row.timestamp);
  return ts.getUTCHours() * 60 + ts.getUTCMinutes();
}

/**
 * Calculate energy available for a load starting at simulatedTime.
 *
 * Returns:
 *   currentBatteryWh     – battery energy above DoD floor at arrival
 *   pvDuringLoadWh       – PV energy generated during the load's runtime
 *   immediateAvailableWh – battery + PV during load (true "right now" budget)
 *   totalAvailableWh     – battery + all remaining solar today (end-of-day budget)
 *   minSocWh             – DoD floor in Wh
 *   endBatteryWh         – projected battery state at end of day
 *   batteryCostWh        – portion of load that must come from battery
 */
export function calcAvailableEnergy(
  hourlyRows,
  simulatedTime,       // minutes since midnight UTC
  siteConfig,
  currentSoc,          // EPEVER SOC % (0-100 of total capacity)
  appliances = [],
  selectedCounts = {},
  ridgePredictionHour = null
) {
  const site        = siteConfig?.site ?? siteConfig ?? {};
  const physics     = siteConfig?.physicsConstants ?? {};
  const energyConfig = siteConfig?.energy ?? {};

  const batteryCapacityWh = Number.isFinite(physics.batteryCapacityWh)
    ? physics.batteryCapacityWh
    : (Number.isFinite(site.battery_capacity_wh) ? site.battery_capacity_wh : 9600);

  // min_soc is 50% for AGM 50% DoD — never discharge below this
  const minSoc    = Number.isFinite(energyConfig.min_soc) ? energyConfig.min_soc : 50;
  const minSocWh  = batteryCapacityWh * (minSoc / 100);

  const maxChargePowerW      = Number.isFinite(physics.maxChargePowerW) ? physics.maxChargePowerW : Infinity;
  const intervalHoursFallback = Number.isFinite(physics.intervalHours) ? physics.intervalHours : 1.0;
  const avgChargeRateW        = Number.isFinite(physics.avgChargeRateW) ? physics.avgChargeRateW : 294;

  // Battery energy at arrival, clamped between DoD floor and full
  const currentBatteryWhRaw = (currentSoc / 100) * batteryCapacityWh;
  const currentBatteryWh    = Math.max(minSocWh, Math.min(batteryCapacityWh, currentBatteryWhRaw));
  // Usable energy above DoD floor right now
  const batteryAboveFloor   = Math.max(0, currentBatteryWh - minSocWh);

  // ── Appliance profiles ──────────────────────────────────────────────────
  const toEnergyWh = (a) => {
    if (Number.isFinite(a.energyWh)) return a.energyWh;
    if (Number.isFinite(a.wh)) return a.wh;
    if (Number.isFinite(a.watts) && Number.isFinite(a.durationMinutes))
      return a.watts * (a.durationMinutes / 60);
    return 0;
  };

  const toDurationHours = (a) => {
    if (Number.isFinite(a.durationMinutes) && a.durationMinutes > 0) return a.durationMinutes / 60;
    const wh = toEnergyWh(a);
    if (Number.isFinite(a.watts) && a.watts > 0 && wh > 0) return wh / a.watts;
    return 1;
  };

  const toWatts = (a) => {
    if (Number.isFinite(a.watts) && a.watts >= 0) return a.watts;
    const dh = toDurationHours(a);
    const wh = toEnergyWh(a);
    return dh > 0 ? wh / dh : 0;
  };

  const backgroundLoadW = appliances
    .filter((a) => a.isBackground)
    .reduce((s, a) => s + toWatts(a), 0);

  const activeProfiles = appliances
    .filter((a) => a.userSelectable !== false)
    .map((a) => ({
      id:            a.id,
      count:         Math.max(0, Number(selectedCounts[a.id] ?? 0)),
      watts:         toWatts(a),
      durationHours: toDurationHours(a),
    }))
    .filter((p) => p.count > 0 && p.watts > 0);

  // Total load runtime in hours (longest single appliance * count)
  const loadDurationHours = activeProfiles.length > 0
    ? Math.max(...activeProfiles.map((p) => p.durationHours))
    : 0;
  const loadEndMinutes = simulatedTime + loadDurationHours * 60;

  const activeLoadWattsAt = (mins) => activeProfiles.reduce((s, p) => {
    const endMin = simulatedTime + p.durationHours * 60;
    return mins < endMin ? s + p.watts * p.count : s;
  }, 0);

  // ── Walk future rows ────────────────────────────────────────────────────
  const sortedRows = [...hourlyRows].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp)
  );
  const futureRows = sortedRows.filter((r) => rowMinutesUTC(r) > simulatedTime);

  let runningWh        = currentBatteryWh;
  let pvDuringLoadWh   = 0;   // PV generated while load is running
  let remainingSolarWh = 0;
  let batteryDischargeWh = 0;
  let batteryCostWh    = 0;

  for (let i = 0; i < futureRows.length; i++) {
    const row     = futureRows[i];
    const rowMins = rowMinutesUTC(row);
    const nextMins = futureRows[i + 1]
      ? rowMinutesUTC(futureRows[i + 1])
      : 24 * 60;
    const deltaHours = Math.max(0, (Math.min(24 * 60, nextMins) - rowMins) / 60);
    if (deltaHours <= 0) continue;

    const pvW          = row.pv_power_w ?? 0;
    const activeW      = activeLoadWattsAt(rowMins);
    const totalLoadW   = backgroundLoadW + activeW;

    // PV contribution during load window
    if (rowMins < loadEndMinutes) {
      pvDuringLoadWh += pvW * deltaHours;
    }

    // Battery cost: portion of load that PV can't cover
    const pvToActiveW   = Math.min(pvW, activeW);
    batteryCostWh      += Math.max(0, activeW - pvToActiveW) * deltaHours;

    // Net battery change
    let netW = pvW - totalLoadW;
    if (netW > 0) netW = Math.min(netW, maxChargePowerW);

    const nextWh     = Math.max(minSocWh, Math.min(batteryCapacityWh, runningWh + netW * deltaHours));
    const appliedWh  = nextWh - runningWh;

    if (appliedWh > 0)  remainingSolarWh  += appliedWh;
    if (appliedWh < 0)  batteryDischargeWh += Math.abs(appliedWh);

    runningWh = nextWh;
  }

  // ── Totals ──────────────────────────────────────────────────────────────
  // Immediate budget = battery above DoD floor + PV generating during load runtime
  // (PV serves load directly — doesn't need to go through battery first)
  const immediateAvailableWh =
    (Number.isFinite(batteryAboveFloor) ? batteryAboveFloor : 0) +
    (Number.isFinite(pvDuringLoadWh)    ? pvDuringLoadWh    : 0);

  // Total remaining solar today — including curtailed PV.
  // When pv_power_w = 0 and soc >= 99, the Python sim curtailed generation
  // because the battery was full. That PV *is* available to power loads directly.
  // Estimate curtailed PV from site peak capacity × derating.
  const remainingPvTotalWh = futureRows.reduce((sum, row, i) => {
    const rowMins  = rowMinutesUTC(row);
    const nextMins = futureRows[i + 1] ? rowMinutesUTC(futureRows[i + 1]) : 24 * 60;
    const dh       = Math.max(0, (Math.min(24 * 60, nextMins) - rowMins) / 60);
    // pv_available_w = uncurtailed PV from Python sim (present after re-run)
    // Falls back to pv_power_w if not available
    const effectivePvW = row.pv_available_w ?? row.pv_power_w ?? 0;
    return sum + effectivePvW * dh;
  }, 0);

  // End-of-day budget = battery above floor + all remaining solar
  // Because loads can draw from PV directly, the true ceiling is both combined
  const totalAvailableWh = Math.max(0,
    (Number.isFinite(batteryAboveFloor)   ? batteryAboveFloor   : 0) +
    (Number.isFinite(remainingPvTotalWh)  ? remainingPvTotalWh  : 0)
  );

  const delayHours = avgChargeRateW > 0 ? batteryCostWh / avgChargeRateW : 0;
  const updatedFullChargeHour = Number.isFinite(ridgePredictionHour)
    ? ridgePredictionHour + delayHours
    : null;

  return {
    currentBatteryWh,
    batteryAboveFloor,
    pvDuringLoadWh,
    immediateAvailableWh,
    minSocWh,
    remainingSolarWh,
    backgroundLoadWatts: backgroundLoadW,
    batteryDischargeWh,
    batteryCostWh,
    delayHours,
    updatedFullChargeHour,
    endBatteryWh: runningWh,
    totalAvailableWh,
  };
}

/**
 * Determine feasibility.
 *
 * Logic:
 *   immediateAvailableWh = battery above DoD floor + PV generating during load runtime
 *   totalAvailableWh     = battery + all remaining solar today (end-of-day)
 *
 *   go          → immediate budget covers load (can start now)
 *   wait        → total budget covers load but not yet (solar will charge enough)
 *   insufficient → even total budget won't cover it
 */
export function calcFeasibility(requestedWh, energyStats, hourlyRows, simulatedTime) {
  const {
    immediateAvailableWh,
    batteryAboveFloor,
    pvDuringLoadWh,
    totalAvailableWh,
    minSocWh,
    currentBatteryWh,
    endBatteryWh,
  } = energyStats;
  const batteryCapacityWh = currentBatteryWh / Math.max(0.01, (energyStats.currentBatteryWh / (energyStats.endBatteryWh || currentBatteryWh)));
  // Simpler: just use a large cap — battery won't exceed physical limit anyway
  const _batCap = currentBatteryWh + (totalAvailableWh ?? 0) + minSocWh;

  if (requestedWh === 0) {
    return {
      status: 'idle',
      message: 'Select appliances above to check what you can charge.',
      readyHour: null,
    };
  }

  // Can start right now — battery + PV during runtime covers it
  if (requestedWh <= immediateAvailableWh) {
    return { status: 'go', message: 'You can do this right now.', readyHour: null };
  }

  // Will be possible later today — find when battery will have enough
  if (requestedWh <= totalAvailableWh) {
    // Walk rows accumulating battery SOC until it crosses the threshold
    const sortedRows = [...hourlyRows]
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      .filter((r) => rowMinutesUTC(r) > simulatedTime);

    let runningWh   = currentBatteryWh;
    let readyTime   = null;

    for (let i = 0; i < sortedRows.length; i++) {
      const row     = sortedRows[i];
      const rowMins = rowMinutesUTC(row);
      const nextMins = sortedRows[i + 1] ? rowMinutesUTC(sortedRows[i + 1]) : rowMins + 60;
      const dh      = Math.max(0, (nextMins - rowMins) / 60);

      // Use pv_available_w (uncurtailed) to track how much energy will accumulate
      const pvW = row.pv_available_w ?? row.pv_power_w ?? 0;
      runningWh = Math.min(_batCap, runningWh + pvW * dh);

      const usableNow = Math.max(0, runningWh - minSocWh);
      if (usableNow >= requestedWh) {
        readyTime = new Date(row.timestamp);
        break;
      }
    }

    const timeStr = readyTime
      ? `${String(readyTime.getUTCHours()).padStart(2, '0')}:${String(readyTime.getUTCMinutes()).padStart(2, '0')}`
      : 'later today';

    return {
      status: 'wait',
      message: `Come back after ${timeStr} — the sun will have charged enough by then.`,
      readyHour: readyTime ? readyTime.getUTCHours() : null,
    };
  }

  return {
    status: 'insufficient',
    message: "Today's sun won't cover this — try fewer items or visit on a sunnier day.",
    readyHour: null,
  };
}

/**
 * Derive current battery status for the status banner.
 */
export function deriveStatus(currentHourData, site) {
  if (!currentHourData) return 'offline';
  const { soc, voltage, pv_power_w } = currentHourData;
  const chargeThreshold = site.charge_threshold_voltage ?? 57.6;
  const minSoc = 50;
  if (soc >= 99 || (voltage != null && voltage >= chargeThreshold)) return 'curtailment';
  if (pv_power_w > 0 && soc < minSoc + 5) return 'low';
  if (pv_power_w > 0) return 'charging';
  if (soc < minSoc) return 'critical';
  if (soc < minSoc + 5) return 'low';
  return 'idle';
}