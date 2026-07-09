import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, LogOut, User as UserIcon, Shield, ChevronDown, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MOCK_RESOURCES } from '../data/mockData';
import { useTheme } from '../context/ThemeContext';

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { session, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const user = session?.user;

  // Search results
  const searchResults = searchQuery.trim().length > 1
    ? MOCK_RESOURCES.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.region.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5)
    : [];

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="h-14 bg-[var(--bg-panel)] border-b border-[var(--border-hairline)] flex items-center gap-3 px-4 flex-shrink-0">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Global search */}
      <div ref={searchRef} className="relative flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Search resources…"
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[var(--bg-panel-hover)] border border-[var(--border-hairline)] text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-red)]/50 focus:ring-1 focus:ring-[var(--accent-red)]/30 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setSearchOpen(false); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {searchOpen && searchResults.length > 0 && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-[var(--bg-panel-hover)] border border-[var(--border-hairline)] rounded-xl shadow-2xl overflow-hidden z-50">
            {searchResults.map(r => (
              <button
                key={r.id}
                onClick={() => {
                  navigate('/monitoring');
                  setSearchQuery('');
                  setSearchOpen(false);
                }}
                className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-[var(--bg-base)] transition-colors text-left"
              >
                <div>
                  <span className="text-sm text-[var(--text-primary)] font-medium">{r.name}</span>
                  <span className="text-xs text-[var(--text-secondary)] ml-2">{r.type}</span>
                </div>
                <span className="text-[10px] text-[var(--text-tertiary)] font-mono">{r.region}</span>
              </button>
            ))}
          </div>
        )}

        {searchOpen && searchQuery.trim().length > 1 && searchResults.length === 0 && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-[var(--bg-panel-hover)] border border-[var(--border-hairline)] rounded-xl shadow-2xl p-3 z-50">
            <p className="text-xs text-[var(--text-secondary)] text-center">No resources found for "{searchQuery}"</p>
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors rounded-lg hover:bg-[var(--bg-panel-hover)]"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* Notification bell */}
        <button className="relative p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors rounded-lg hover:bg-[var(--bg-panel-hover)]">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--status-critical)]" />
        </button>

        {/* User menu */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => setUserMenuOpen(o => !o)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-panel-hover)] transition-colors"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ backgroundColor: user?.avatarColor ?? 'var(--accent-red)' }}
            >
              {user?.avatarInitials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-medium text-[var(--text-primary)] leading-none">{user?.name}</p>
              <p className="text-[10px] text-[var(--text-secondary)] capitalize leading-none mt-0.5">{user?.role}</p>
            </div>
            <ChevronDown className="w-3 h-3 text-[var(--text-secondary)]" />
          </button>

          {userMenuOpen && (
            <div className="absolute top-full right-0 mt-1 w-52 bg-[var(--bg-panel-hover)] border border-[var(--border-hairline)] rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-[var(--border-hairline)]">
                <p className="text-sm font-medium text-[var(--text-primary)]">{user?.name}</p>
                <p className="text-xs text-[var(--text-secondary)]">{user?.email}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  {isAdmin
                    ? <><Shield className="w-3 h-3 text-[var(--accent-red)]" /><span className="text-xs text-[var(--accent-red)]">Admin</span></>
                    : <><UserIcon className="w-3 h-3 text-[var(--text-secondary)]" /><span className="text-xs text-[var(--text-secondary)]">Viewer</span></>
                  }
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--status-critical)] hover:bg-[var(--status-critical-bg)] transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}