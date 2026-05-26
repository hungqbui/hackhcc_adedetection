type ChromaGridProps = {
  className?: string;
  columns?: number;
  gap?: number | string;
  colors?: string[];
};

export default function ChromaGrid({ className = '', columns = 4, gap = 8, colors = ['#06b6d4', '#8b5cf6', '#ef4444', '#f59e0b'] }: ChromaGridProps) {
  const cols = Array.from({ length: columns }).map((_, i) => i);

  return (
    <div className={`chroma-grid grid gap-${typeof gap === 'number' ? gap : 2} ${className}`} style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap }}>
      {cols.map((c, idx) => (
        <div key={idx} className="chroma-col" style={{ display: 'grid', gap, gridAutoRows: 'minmax(80px, 1fr)' }}>
          {Array.from({ length: 6 }).map((_, j) => (
            <div key={j} className="chroma-cell rounded-md shadow-md" style={{ background: colors[(idx + j) % colors.length], minHeight: 80 }} />
          ))}
        </div>
      ))}
    </div>
  );
}
