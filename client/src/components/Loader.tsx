export function Loader() {
  return (
    <div className="flex items-center justify-center gap-2.5 py-4 w-full">
      <div className="accent-spinner" />
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Working on it…</span>
    </div>
  );
}