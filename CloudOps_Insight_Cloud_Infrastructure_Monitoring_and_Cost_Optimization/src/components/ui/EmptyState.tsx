import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div
        className="w-14 h-14 rounded-lg border flex items-center justify-center mb-4"
        style={{ background: 'var(--bg-panel-hover)', borderColor: 'var(--border-hairline)' }}
      >
        <Icon className="w-6 h-6" style={{ color: 'var(--text-tertiary)' }} />
      </div>
      <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <p className="text-xs max-w-xs" style={{ color: 'var(--text-tertiary)' }}>
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
