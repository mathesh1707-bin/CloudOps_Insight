import type { ResourceStatus } from '../../types';

interface BadgeProps {
  status: ResourceStatus;
  className?: string;
}

const CONFIG: Record<ResourceStatus, { label: string; dot: string; text: string; bg: string; border: string }> = {
  running:    { label: 'Running',    dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
  stopped:    { label: 'Stopped',    dot: 'bg-slate-400',   text: 'text-slate-400',   bg: 'bg-slate-400/10',   border: 'border-slate-400/20'   },
  terminated: { label: 'Terminated', dot: 'bg-slate-600',   text: 'text-slate-500',   bg: 'bg-slate-600/10',   border: 'border-slate-600/20'   },
  warning:    { label: 'Warning',    dot: 'bg-amber-400',   text: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/20'   },
  critical:   { label: 'Critical',   dot: 'bg-red-400',     text: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/20'     },
};

export default function StatusBadge({ status, className = '' }: BadgeProps) {
  const c = CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${c.bg} ${c.text} ${c.border} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${status === 'running' ? 'animate-pulse' : ''}`} />
      {c.label}
    </span>
  );
}
