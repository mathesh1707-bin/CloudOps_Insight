type Severity = 'low' | 'medium' | 'high' | 'critical';

const CONFIG: Record<Severity, { text: string; bg: string; border: string }> = {
  low:      { text: 'text-slate-400',  bg: 'bg-slate-400/10',  border: 'border-slate-400/20'  },
  medium:   { text: 'text-amber-400',  bg: 'bg-amber-400/10',  border: 'border-amber-400/20'  },
  high:     { text: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20' },
  critical: { text: 'text-red-400',    bg: 'bg-red-400/10',    border: 'border-red-400/20'    },
};

export default function SeverityBadge({ severity }: { severity: Severity }) {
  const c = CONFIG[severity];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${c.bg} ${c.text} ${c.border}`}>
      {severity}
    </span>
  );
}
