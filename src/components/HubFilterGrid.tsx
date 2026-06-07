import React from 'react';

export interface HubFilterOption<T extends string | number> {
  value: T;
  label: string;
}

interface HubFilterGridProps<T extends string | number> {
  label: string;
  options: HubFilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accent?: 'primary' | 'secondary';
  compact?: boolean;
}

export function HubFilterGrid<T extends string | number>({
  label,
  options,
  value,
  onChange,
  accent = 'primary',
  compact = false,
}: HubFilterGridProps<T>) {
  return (
    <div className="hub-filter-section">
      <span className="hub-filter-label">{label}</span>
      <div
        className={`hub-filter-grid ${compact ? 'hub-filter-grid--compact' : ''}`}
        role="tablist"
        aria-label={label}
      >
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            role="tab"
            aria-selected={value === opt.value}
            className={`hub-filter-chip accent-${accent} ${value === opt.value ? 'active' : ''}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface HubFilterStackProps {
  children: React.ReactNode;
}

export function HubFilterStack({ children }: HubFilterStackProps) {
  return <div className="hub-filter-stack glass-panel">{children}</div>;
}
