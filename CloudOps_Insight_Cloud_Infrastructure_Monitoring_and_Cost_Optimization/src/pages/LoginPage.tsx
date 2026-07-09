import { useState, FormEvent } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Cloud, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (session) {
    navigate(from, { replace: true });
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error ?? 'Login failed.');
    }
  }

  function fillDemo(role: 'admin' | 'viewer') {
    setEmail(role === 'admin' ? 'admin@cloudops.io' : 'viewer@cloudops.io');
    setPassword(role === 'admin' ? 'admin123' : 'viewer123');
    setError('');
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--bg-base)' }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent-red)' }}
          >
            <Cloud className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            CloudOps Insight
          </span>
        </div>

        <div
          className="border rounded-lg p-8"
          style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-hairline)' }}
        >
          <h1 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            Sign in to your account
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Monitor your infrastructure. Optimize your costs.
          </p>

          {error && (
            <div
              className="flex items-center gap-2 p-3 rounded-lg text-sm mb-5 border"
              style={{
                background: 'var(--status-critical-bg)',
                borderColor: 'var(--status-critical-border)',
                color: 'var(--status-critical)',
              }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-xs font-medium mb-1.5 uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}
              >
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@company.com"
                className="w-full px-3 py-2.5 rounded-lg text-sm transition-colors"
                style={{
                  background: 'var(--bg-panel-hover)',
                  border: '1px solid var(--border-hairline)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-red)'; }}
                onBlur={e =>  { e.currentTarget.style.borderColor = 'var(--border-hairline)'; }}
              />
            </div>

            <div>
              <label
                className="block text-xs font-medium mb-1.5 uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 pr-10 rounded-lg text-sm transition-colors"
                  style={{
                    background: 'var(--bg-panel-hover)',
                    border: '1px solid var(--border-hairline)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-red)'; }}
                  onBlur={e =>  { e.currentTarget.style.borderColor = 'var(--border-hairline)'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-white text-sm font-medium transition-colors mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: loading ? 'var(--accent-red)' : 'var(--accent-red)' }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* Demo accounts */}
          <div
            className="mt-6 pt-5 border-t"
            style={{ borderColor: 'var(--border-hairline)' }}
          >
            <p className="text-xs mb-3 text-center" style={{ color: 'var(--text-tertiary)' }}>
              Demo accounts
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fillDemo('admin')}
                className="flex-1 py-2 rounded-lg text-xs transition-colors border"
                style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)', background: 'transparent' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-red)'; e.currentTarget.style.background = 'var(--accent-red-tint)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-hairline)'; e.currentTarget.style.background = 'transparent'; }}
              >
                Admin user
              </button>
              <button
                onClick={() => fillDemo('viewer')}
                className="flex-1 py-2 rounded-lg text-xs transition-colors border"
                style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)', background: 'transparent' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-red)'; e.currentTarget.style.background = 'var(--accent-red-tint)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-hairline)'; e.currentTarget.style.background = 'transparent'; }}
              >
                Viewer user
              </button>
            </div>
          </div>

          <p className="text-center text-xs mt-5" style={{ color: 'var(--text-tertiary)' }}>
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="transition-colors"
              style={{ color: 'var(--accent-red)' }}
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
