export function formatNumber(value: number | undefined, digits = 1) {
  if (value === undefined || Number.isNaN(value)) return "-";
  return value.toLocaleString("ja-JP", { maximumFractionDigits: digits });
}

export async function imageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function monthRange(month: string) {
  const start = `${month}-01`;
  const [year, m] = month.split("-").map(Number);
  const next = new Date(year, m, 1).toISOString().slice(0, 10);
  return { start, next };
}
