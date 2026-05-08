import type { Horse } from "../types/horse";

export function HorseSelector({
  horses,
  selectedHorseId,
  onChange
}: {
  horses: Horse[];
  selectedHorseId?: string;
  onChange: (horseId: string) => void;
}) {
  return (
    <label className="field compact">
      <span>馬を選択</span>
      <select value={selectedHorseId ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled>
          馬を選択してください
        </option>
        {horses
          .filter((h) => h.isActive)
          .map((horse) => (
            <option key={horse.id} value={horse.id}>
              {horse.name} / {horse.weightKg}kg
            </option>
          ))}
      </select>
    </label>
  );
}
