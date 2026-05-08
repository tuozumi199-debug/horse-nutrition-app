export function CsvExportButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className="secondary" onClick={onClick}>
      {children}
    </button>
  );
}
