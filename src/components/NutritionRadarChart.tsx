import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import type { AchievementRow } from "../types/nutrition";

export function NutritionRadarChart({ rows }: { rows: AchievementRow[] }) {
  const data = rows
    .filter((row) => row.key !== "caPRatio")
    .map((row) => ({ nutrient: row.label, percent: Math.min(Math.round(row.percent), 160) }));

  return (
    <div className="chart-box radar">
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart data={data} outerRadius={110}>
          <PolarGrid stroke="var(--chart-grid)" />
          <PolarAngleAxis dataKey="nutrient" tick={{ fill: "var(--chart-text)" }} />
          <PolarRadiusAxis angle={90} domain={[0, 160]} tick={{ fill: "var(--chart-muted-text)" }} axisLine={{ stroke: "var(--chart-grid)" }} tickFormatter={(v) => `${v}%`} />
          <Tooltip contentStyle={{ background: "var(--chart-tooltip-bg)", borderColor: "var(--chart-grid)", color: "var(--chart-text)" }} labelStyle={{ color: "var(--chart-text)" }} itemStyle={{ color: "var(--chart-text)" }} formatter={(value) => [`${value}%`, "達成率"]} />
          <Radar dataKey="percent" stroke="var(--chart-primary)" fill="var(--chart-primary)" fillOpacity={0.28} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
