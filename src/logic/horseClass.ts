import type { Horse, HorseClass } from "../types/horse";

export const horseClassOptions: HorseClass[] = ["general", "competition", "fei"];

export const horseClassLabels: Record<HorseClass, string> = {
  general: "一般",
  competition: "競技馬",
  fei: "FEI馬"
};

export function getHorseClass(horse?: Pick<Horse, "horseClass">): HorseClass {
  return horse?.horseClass ?? "general";
}

export function getHorseClassLabel(horse?: Pick<Horse, "horseClass">) {
  return horseClassLabels[getHorseClass(horse)];
}
