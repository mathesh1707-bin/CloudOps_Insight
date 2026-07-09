import { NavLink } from 'react-router-dom';
import {
  Cloud, LayoutDashboard, Activity, DollarSign,
  FileText, Lightbulb, Zap, X,
} from 'lucide-react';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { to: '/dashboard',       icon: LayoutDashboard, label: 'Dashboard'        },
  { to: '/monitoring',      icon: Activity,        label: 'Monitoring'       },
  { to: '/costs',           icon: DollarSign,      label: 'Cost Analysis'    },
  { to: '/reports',         icon: FileText,        label: 'Reports'          },
  { to: '/recommendations', icon: Lightbulb,       label: 'Recommendations'  },
  { to: '/anomalies',       icon: Zap,             label: 'Anomaly Detection'},
];

export default function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Backdrop (mobile) */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-0 left-0 z-30 h-full w-60 flex flex-col
          bg-[#0f1626] border-r border-[#1a2540]
          transition-transform duration-200 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-14 px-5 border-b border-[#1a2540] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
              <Cloud className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-white tracking-tight">CloudOps Insight</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-[#4a5e80] hover:text-[#8fa3bc] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          <p className="px-2 mb-2 text-[10px] font-semibold text-[#4a5e80] uppercase tracking-widest">
            Navigation
          </p>
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => onClose()}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                    : 'text-[#6b829e] hover:text-[#b8c9d9] hover:bg-[#141d2e]'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#1a2540] flex-shrink-0">
          <p className="text-[10px] text-[#334466]">CloudOps Insight v1.0</p>
          <p className="text-[10px] text-[#334466]">© 2026 Mock Environment</p>
        </div>
      </aside>
    </>
  );
}
