import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import type { AchievementRow } from "../types/nutrition";

export function NutritionBarChart({ rows }: { rows: AchievementRow[] }) {
  const data = rows.map((r) => ({
    name: r.label,
    percent: Math.round(r.percent),
    status: r.status
  }));

  if (data.length === 0) {
    return <div className="empty">要求量データがありません。設定画面で要求量を登録してください。</div>;
  }

  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height={Math.max(280, data.length * 42)}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 28, left: 24, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" domain={[0, 160]} tickFormatter={(v) => `${v}%`} />
          <YAxis dataKey="name" type="category" width={86} />
          <Tooltip formatter={(value) => [`${value}%`, "達成率"]} />
          <ReferenceLine x={100} strokeDasharray="4 4" />
          <Bar dataKey="percent" radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
