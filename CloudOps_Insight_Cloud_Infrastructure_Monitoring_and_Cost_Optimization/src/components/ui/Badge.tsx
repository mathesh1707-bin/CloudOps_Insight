import type { ResourceStatus } from '../../types';

interface BadgeProps {
  status: ResourceStatus;
  className?: string;
}

export default function StatusBadge({ status, className = '' }: BadgeProps) {
  const styles: Record<ResourceStatus, { label: string; color: string; bg: string; border: string; pulse: boolean }> = {
    running:    { label: 'Running',    color: 'var(--status-success)',  bg: 'var(--status-success-bg)',  border: 'var(--status-success-border)',  pulse: true  },
    stopped:    { label: 'Stopped',    color: 'var(--status-neutral)',  bg: 'var(--status-neutral-bg)',  border: 'var(--status-neutral-border)',  pulse: false },
    terminated: { label: 'Terminated', color: 'var(--text-tertiary)',   bg: 'var(--status-neutral-bg)',  border: 'var(--status-neutral-border)',  pulse: false },
    warning:    { label: 'Warning',    color: 'var(--status-warning)',  bg: 'var(--status-warning-bg)',  border: 'var(--status-warning-border)',  pulse: true  },
    critical:   { label: 'Critical',   color: 'var(--status-critical)', bg: 'var(--status-critical-bg)', border: 'var(--status-critical-border)', pulse: true  },
  };

  const s = styles[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}
      style={{ color: s.color, background: s.bg, borderColor: s.border }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.pulse ? 'animate-pulse' : ''}`}
        style={{ backgroundColor: s.color }}
      />
      {s.label}
    </span>
  );
}
