import React from 'react';

type MagicBentoProps = {
  className?: string;
  items?: { title: string; subtitle?: string }[];
};

export default function MagicBento({ className = '', items = [] }: MagicBentoProps) {
  const columns = ['w-1/3', 'w-1/3', 'w-1/3'];

  const sampleItems = items.length
    ? items
    : [
        { title: 'Plan A', subtitle: 'Balanced' },
        { title: 'Plan B', subtitle: 'Aggressive' },
        { title: 'Plan C', subtitle: 'Conservative' }
      ];

  return (
    <div className={`magic-bento grid grid-cols-3 gap-4 ${className}`}>
      {sampleItems.map((it, idx) => (
        <div key={idx} className="bento-card p-4 rounded-lg shadow-lg bg-white/5 border border-white/10">
          <h3 className="text-lg font-semibold">{it.title}</h3>
          <p className="text-sm opacity-70">{it.subtitle}</p>
        </div>
      ))}
    </div>
  );
}
