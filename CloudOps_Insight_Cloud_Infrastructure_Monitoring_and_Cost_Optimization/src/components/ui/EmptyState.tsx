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
      <div className="w-14 h-14 rounded-2xl bg-[#141d2e] border border-[#1a2540] flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-[#4a5e80]" />
      </div>
      <h3 className="text-sm font-semibold text-[#b8c9d9] mb-1">{title}</h3>
      <p className="text-xs text-[#4a5e80] max-w-xs">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
