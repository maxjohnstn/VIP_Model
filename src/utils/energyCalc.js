/**
 * Calculate total energy available from current moment to end of day.
 * Formula reference: DASHBOARD_CALCULATIONS.md (Sections 2 and 3).
 */
export function calcAvailableEnergy(
  hourlyRows,
  simulatedTime,
  siteConfig,
  currentSoc,
  appliances = [],
  selectedCounts = {},
  ridgePredictionHour = null
) {
  const site = siteConfig?.site ?? siteConfig ?? {};
  const physics = siteConfig?.physicsConstants ?? {};
  const energyConfig = siteConfig?.energy ?? {};

  const panelFactor = Number.isFinite(physics.panelFactor) ? physics.panelFactor : 0.9968;
  const mpptEfficiency = Number.isFinite(physics.mpptEfficiency) ? physics.mpptEfficiency : 0.998;
  const intervalHoursFallback = Number.isFinite(physics.intervalHours) ? physics.intervalHours : (10 / 60);
  const maxChargePowerW = Number.isFinite(physics.maxChargePowerW) ? physics.maxChargePowerW : Number.POSITIVE_INFINITY;
  const avgChargeRateW = Number.isFinite(physics.avgChargeRateW) ? physics.avgChargeRateW : 294;
  const batteryCapacityWh = Number.isFinite(physics.batteryCapacityWh)
    ? physics.batteryCapacityWh
    : (Number.isFinite(site.battery_capacity_wh) ? site.battery_capacity_wh : 0);
  const minSoc = Number.isFinite(energyConfig.min_soc) ? energyConfig.min_soc : 20;
  const minSocWh = batteryCapacityWh * (minSoc / 100);

  const currentBatteryWhRaw = (currentSoc / 100) * batteryCapacityWh;
  const currentBatteryWh = Math.max(minSocWh, Math.min(batteryCapacityWh, currentBatteryWhRaw));

  const sortedRows = [...hourlyRows].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const futureRows = sortedRows.filter((row) => {
    const ts = new Date(row.timestamp);
    const rowMins = ts.getHours() * 60 + ts.getMinutes();
    return rowMins > simulatedTime;
  });

  const toEnergyWh = (appliance) => {
    if (Number.isFinite(appliance.energyWh)) return appliance.energyWh;
    if (Number.isFinite(appliance.wh)) return appliance.wh;
    if (Number.isFinite(appliance.watts) && Number.isFinite(appliance.durationMinutes)) {
      return appliance.watts * (appliance.durationMinutes / 60);
    }
    return 0;
  };

  const toDurationHours = (appliance) => {
    if (Number.isFinite(appliance.durationMinutes) && appliance.durationMinutes > 0) {
      return appliance.durationMinutes / 60;
    }

    const energyWh = toEnergyWh(appliance);
    if (Number.isFinite(appliance.watts) && appliance.watts > 0 && energyWh > 0) {
      return energyWh / appliance.watts;
    }

    return 1;
  };

  const toWatts = (appliance) => {
    if (Number.isFinite(appliance.watts) && appliance.watts >= 0) return appliance.watts;

    const durationHours = toDurationHours(appliance);
    const energyWh = toEnergyWh(appliance);
    if (durationHours > 0) return energyWh / durationHours;
    return 0;
  };

  const backgroundLoadWatts = appliances
    .filter((appliance) => appliance.isBackground)
    .reduce((sum, appliance) => sum + toWatts(appliance), 0);

  const activeApplianceProfiles = appliances
    .filter((appliance) => appliance.userSelectable !== false)
    .map((appliance) => {
      const count = Math.max(0, Number(selectedCounts[appliance.id] ?? 0));
      return {
        id: appliance.id,
        count,
        watts: toWatts(appliance),
        durationHours: toDurationHours(appliance),
      };
    })
    .filter((profile) => profile.count > 0 && profile.watts > 0);

  let runningWh = currentBatteryWh;
  let remainingSolarWh = 0;
  let batteryDischargeWh = 0;
  let pvWhUsedForLoad = 0;
  let batteryCostWh = 0;

  const endOfDayMinutes = 24 * 60;

  const activeLoadWattsAtMinute = (minuteOfDay) => activeApplianceProfiles.reduce((sum, profile) => {
    const endMinute = simulatedTime + (profile.durationHours * 60);
    return minuteOfDay < endMinute ? sum + (profile.watts * profile.count) : sum;
  }, 0);

  for (let i = 0; i < futureRows.length; i += 1) {
    const row = futureRows[i];
    const ts = new Date(row.timestamp);
    const nextTs = futureRows[i + 1] ? new Date(futureRows[i + 1].timestamp) : null;
    const rowMins = ts.getHours() * 60 + ts.getMinutes();
    const nextMinutesRaw = nextTs ? (nextTs.getHours() * 60 + nextTs.getMinutes()) : endOfDayMinutes;
    const nextMins = Math.min(endOfDayMinutes, nextMinutesRaw);
    const fallbackMins = Math.min(endOfDayMinutes, rowMins + (intervalHoursFallback * 60));
    const deltaHours = Math.max(0, ((nextMins > rowMins ? nextMins : fallbackMins) - rowMins) / 60);
    if (deltaHours <= 0) continue;

    const grossPvW = Number.isFinite(row.pv_power_w)
      ? row.pv_power_w
      : ((Number.isFinite(row.gti) ? row.gti : 0) * panelFactor * mpptEfficiency);

    const activeApplianceWatts = activeLoadWattsAtMinute(rowMins);
    const totalLoadWatts = backgroundLoadWatts + activeApplianceWatts;

    const pvToLoadW = Math.min(grossPvW, totalLoadWatts);
    pvWhUsedForLoad += pvToLoadW * deltaHours;

    const pvOffsetToActiveW = Math.min(grossPvW, activeApplianceWatts);
    const batteryCostW = Math.max(0, activeApplianceWatts - pvOffsetToActiveW);
    batteryCostWh += batteryCostW * deltaHours;

    // Net power into/out of the battery after serving loads from PV first.
    let netBatteryW = grossPvW - totalLoadWatts;
    if (netBatteryW > 0) {
      netBatteryW = Math.min(netBatteryW, maxChargePowerW);
    }

    const deltaWh = netBatteryW * deltaHours;
    // Battery state is clamped to reserve floor and physical capacity ceiling.
    const nextBatteryWh = Math.max(minSocWh, Math.min(batteryCapacityWh, runningWh + deltaWh));
    const appliedDeltaWh = nextBatteryWh - runningWh;

    if (appliedDeltaWh > 0) {
      remainingSolarWh += appliedDeltaWh;
    } else if (appliedDeltaWh < 0) {
      batteryDischargeWh += Math.abs(appliedDeltaWh);
    }

    runningWh = nextBatteryWh;
  }

  const totalAvailableWh = Math.max(0, runningWh - minSocWh);
  const delayHours = avgChargeRateW > 0 ? (batteryCostWh / avgChargeRateW) : 0;
  const updatedFullChargeHour = Number.isFinite(ridgePredictionHour)
    ? ridgePredictionHour + delayHours
    : null;

  return {
    currentBatteryWh,
    minSocWh,
    remainingSolarWh,
    backgroundLoadWatts,
    batteryDischargeWh,
    pvWhUsedForLoad,
    batteryCostWh,
    delayHours,
    updatedFullChargeHour,
    endBatteryWh: runningWh,
    totalAvailableWh,
  };
}

/**
 * Determine feasibility of a requested load.
 * Returns { status, message, readyHour }
 * status: 'idle' | 'go' | 'wait' | 'insufficient'
 * Decision logic reference: DASHBOARD_CALCULATIONS.md (Section 3).
 */
export function calcFeasibility(requestedWh, energyStats, hourlyRows, simulatedTime) {
  const { currentBatteryWh, minSocWh = 0, totalAvailableWh } = energyStats;
  const immediateAvailableWh = Math.max(0, currentBatteryWh - minSocWh);

  if (requestedWh === 0) {
    return { status: 'idle', message: 'Select appliances above to check what you can charge.', readyHour: null };
  }

  if (requestedWh <= immediateAvailableWh) {
    return { status: 'go', message: 'You can do this right now.', readyHour: null };
  }

  if (requestedWh <= totalAvailableWh) {
    // Find the earliest future timestamp where cumulative energy reaches requestedWh
    let cumulative = immediateAvailableWh;
    let readyTimestamp = null;

    for (let i = 0; i < hourlyRows.length; i += 1) {
      const row = hourlyRows[i];
      const ts = new Date(row.timestamp);
      const rowMins = ts.getHours() * 60 + ts.getMinutes();
      if (rowMins <= simulatedTime) continue;

      const nextTs = hourlyRows[i + 1] ? new Date(hourlyRows[i + 1].timestamp) : null;
      const deltaHours = nextTs ? Math.max(0, (nextTs - ts) / (1000 * 60 * 60)) : (10 / 60);
      cumulative += row.pv_power_w * deltaHours;
      if (cumulative >= requestedWh) {
        readyTimestamp = ts;
        break;
      }
    }

    const timeStr = readyTimestamp
      ? `${String(readyTimestamp.getHours()).padStart(2, '0')}:${String(readyTimestamp.getMinutes()).padStart(2, '0')}`
      : 'later today';

    return {
      status: 'wait',
      message: `Come back after ${timeStr} — the sun will have charged enough by then.`,
      readyHour: readyTimestamp ? readyTimestamp.getHours() : null,
    };
  }

  return {
    status: 'insufficient',
    message: "Today's sun won't cover this — try fewer items.",
    readyHour: null,
  };
}

/**
 * Derive current battery status for the status banner.
 * Rule table reference: DASHBOARD_CALCULATIONS.md (Section 4).
 */
export function deriveStatus(currentHourData, site) {
  if (!currentHourData) return 'offline';
  const { soc, voltage, pv_power_w } = currentHourData;
  if (soc >= 99 || voltage >= site.charge_threshold_voltage) return 'curtailment';
  if (pv_power_w > 0 && soc < 20) return 'low';
  if (pv_power_w > 0) return 'charging';
  if (soc < 10) return 'critical';
  if (soc < 20) return 'low';
  return 'idle';
}
