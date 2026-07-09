type Severity = 'low' | 'medium' | 'high' | 'critical';

const STYLES: Record<Severity, { color: string; bg: string; border: string }> = {
  low:      { color: 'var(--text-tertiary)',   bg: 'var(--status-neutral-bg)',   border: 'var(--status-neutral-border)'   },
  medium:   { color: 'var(--status-warning)',  bg: 'var(--status-warning-bg)',   border: 'var(--status-warning-border)'   },
  high:     { color: 'var(--status-warning)',  bg: 'var(--status-warning-bg)',   border: 'var(--status-warning-border)'   },
  critical: { color: 'var(--status-critical)', bg: 'var(--status-critical-bg)',  border: 'var(--status-critical-border)'  },
};

export default function SeverityBadge({ severity }: { severity: Severity }) {
  const s = STYLES[severity];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize"
      style={{ color: s.color, background: s.bg, borderColor: s.border }}
    >
      {severity}
    </span>
  );
}
