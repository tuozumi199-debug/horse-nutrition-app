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
          <PolarGrid />
          <PolarAngleAxis dataKey="nutrient" />
          <PolarRadiusAxis angle={90} domain={[0, 160]} tickFormatter={(v) => `${v}%`} />
          <Tooltip formatter={(value) => [`${value}%`, "達成率"]} />
          <Radar dataKey="percent" fillOpacity={0.25} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
