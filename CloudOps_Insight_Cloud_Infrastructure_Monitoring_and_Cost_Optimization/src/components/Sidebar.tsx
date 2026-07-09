import { NavLink } from 'react-router-dom';
import {
  Cloud, LayoutDashboard, Activity, DollarSign,
  FileText, Lightbulb, Zap, X,
} from 'lucide-react';
import { MOCK_RESOURCES } from '../data/mockData';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { to: '/dashboard',       icon: LayoutDashboard, label: 'Dashboard'         },
  { to: '/monitoring',      icon: Activity,        label: 'Monitoring'        },
  { to: '/costs',           icon: DollarSign,      label: 'Cost Analysis'     },
  { to: '/reports',         icon: FileText,        label: 'Reports'           },
  { to: '/recommendations', icon: Lightbulb,       label: 'Recommendations'   },
  { to: '/anomalies',       icon: Zap,             label: 'Anomaly Detection' },
];

/** Derive overall infra health from mock resource statuses */
function useInfraHealth(): 'critical' | 'warning' | 'healthy' {
  const critical = MOCK_RESOURCES.filter(r => r.status === 'critical').length;
  const warning  = MOCK_RESOURCES.filter(r => r.status === 'warning').length;
  if (critical > 0) return 'critical';
  if (warning  > 0) return 'warning';
  return 'healthy';
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const health = useInfraHealth();

  const healthColor =
    health === 'critical' ? 'var(--status-critical)' :
    health === 'warning'  ? 'var(--status-warning)'  :
                            'var(--status-success)';

  const healthLabel =
    health === 'critical' ? 'Critical issues' :
    health === 'warning'  ? 'Warnings present' :
                            'All systems healthy';

  return (
    <>
      {/* Backdrop (mobile) */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-0 left-0 z-30 h-full w-60 flex flex-col
          border-r
          transition-transform duration-200 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
        style={{
          background: 'var(--bg-panel)',
          borderColor: 'var(--border-hairline)',
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center justify-between h-14 px-5 flex-shrink-0 border-b"
          style={{ borderColor: 'var(--border-hairline)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--accent-red)' }}
            >
              <Cloud className="w-3.5 h-3.5 text-white" />
            </div>
            <span
              className="text-sm font-semibold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              CloudOps Insight
            </span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden transition-colors p-1 rounded"
            style={{ color: 'var(--text-tertiary)' }}
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          <p
            className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Navigation
          </p>
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => onClose()}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative"
              style={({ isActive }) => ({
                color:      isActive ? 'var(--accent-red)'      : 'var(--text-secondary)',
                background: isActive ? 'var(--accent-red-tint)' : 'transparent',
                borderLeft: isActive ? '2px solid var(--accent-red)' : '2px solid transparent',
              })}
              onMouseEnter={e => {
                const el = e.currentTarget;
                if (!el.getAttribute('aria-current')) {
                  el.style.color      = 'var(--text-primary)';
                  el.style.background = 'var(--bg-panel-hover)';
                }
              }}
              onMouseLeave={e => {
                const el = e.currentTarget;
                if (!el.getAttribute('aria-current')) {
                  el.style.color      = 'var(--text-secondary)';
                  el.style.background = 'transparent';
                }
              }}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Health dot + footer */}
        <div
          className="px-4 py-3 border-t flex-shrink-0 space-y-2"
          style={{ borderColor: 'var(--border-hairline)' }}
        >
          {/* Live infra health indicator */}
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full health-dot-pulse flex-shrink-0"
              style={{ backgroundColor: healthColor }}
              title={healthLabel}
            />
            <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              {healthLabel}
            </span>
          </div>
          <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            CloudOps Insight v1.0
          </p>
          <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            © 2026 Mock Environment
          </p>
        </div>
      </aside>
    </>
  );
}
