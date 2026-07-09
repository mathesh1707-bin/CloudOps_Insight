import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Cloud, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
  const { signup, session } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (session) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Please enter your full name.'); return; }
    setLoading(true);
    const result = await signup(name, email.trim(), password);
    setLoading(false);
    if (result.success) {
      navigate('/dashboard', { replace: true });
    } else {
      setError(result.error ?? 'Signup failed.');
    }
  }

  const inputStyle = {
    background: 'var(--bg-panel-hover)',
    border: '1px solid var(--border-hairline)',
    color: 'var(--text-primary)',
    outline: 'none',
  };
  const focusIn  = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = 'var(--accent-red)'; };
  const focusOut = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = 'var(--border-hairline)'; };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--bg-base)' }}
    >
      <div className="w-full max-w-md">
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
            Create an account
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            New accounts are assigned Viewer role by default.
          </p>

          {error && (
            <div
              className="flex items-center gap-2 p-3 rounded-lg text-sm mb-5 border"
              style={{ background: 'var(--status-critical-bg)', borderColor: 'var(--status-critical-border)', color: 'var(--status-critical)' }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: 'Full name',     id: 'name',     type: 'text',     val: name,     set: setName,     ac: 'name',             ph: 'Jane Smith' },
              { label: 'Email address', id: 'email',    type: 'email',    val: email,    set: setEmail,    ac: 'email',            ph: 'you@company.com' },
            ].map(({ label, id, type, val, set, ac, ph }) => (
              <div key={id}>
                <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  {label}
                </label>
                <input
                  type={type}
                  value={val}
                  onChange={e => set(e.target.value)}
                  required
                  autoComplete={ac}
                  placeholder={ph}
                  className="w-full px-3 py-2.5 rounded-lg text-sm transition-colors"
                  style={inputStyle}
                  onFocus={focusIn}
                  onBlur={focusOut}
                />
              </div>
            ))}

            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Min. 6 characters"
                  className="w-full px-3 py-2.5 pr-10 rounded-lg text-sm transition-colors"
                  style={inputStyle}
                  onFocus={focusIn}
                  onBlur={focusOut}
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
              style={{ background: 'var(--accent-red)' }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-xs mt-5" style={{ color: 'var(--text-tertiary)' }}>
            Already have an account?{' '}
            <Link to="/login" className="transition-colors" style={{ color: 'var(--accent-red)' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
