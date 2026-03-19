import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-white/10 rounded-xl px-3 py-2 text-xs">
      <p className="text-slate-400">{label}</p>
      <p className="text-brand-green font-bold">{payload[0]?.value}%</p>
    </div>
  );
}

export default function SOCChart({ hourlyRows, simulatedTime }) {
  const data = hourlyRows.map((row) => ({
    time: `${String(new Date(row.timestamp).getHours()).padStart(2, '0')}:${String(new Date(row.timestamp).getMinutes()).padStart(2, '0')}`,
    soc: row.soc,
  }));

  const currentLabel = `${String(Math.floor(simulatedTime / 60)).padStart(2, '0')}:${String(simulatedTime % 60).padStart(2, '0')}`;

  return (
    <div style={{ height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="time"
            tick={{ fill: '#475569', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={17}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#475569', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            x={currentLabel}
            stroke="rgba(255,255,255,0.3)"
            strokeDasharray="3 3"
            label={{ value: 'Now', fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
          />
          <Line
            type="monotone"
            dataKey="soc"
            stroke="#00d4aa"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#00d4aa', strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
