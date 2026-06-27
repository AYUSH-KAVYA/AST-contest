'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { user, userRole, loading: authLoading, login } = useAuth();

  useEffect(() => {
    if (!authLoading && user && userRole) {
      router.replace(userRole === 'admin' ? '/dashboard' : '/portal');
    }
  }, [user, userRole, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const role = await login(email, password);
      if (role === 'admin') {
        router.push('/dashboard');
      } else if (role === 'student') {
        router.push('/portal');
      } else {
        setError('No role assigned to this account. Contact admin.');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.includes('user-not-found') || err.message.includes('wrong-password') || err.message.includes('invalid-credential')) {
          setError('Invalid email or password.');
        } else if (err.message.includes('too-many-requests')) {
          setError('Too many attempts. Please try again later.');
        } else {
          setError(`Login error: ${err.message}`);
        }
      } else {
        setError('An unexpected error occurred.');
      }
    }
    setLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Premium Dark Orbs with Brown & Pink Glow */}
      <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-pink-600/10 rounded-full blur-3xl animate-[float_8s_ease-in-out_infinite]" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-amber-900/20 rounded-full blur-3xl animate-[float_10s_ease-in-out_infinite_1s]" />
      <div className="absolute top-[40%] right-[15%] w-[300px] h-[300px] bg-rose-500/10 rounded-full blur-3xl animate-[float_12s_ease-in-out_infinite_2s]" />

      <div className="w-full max-w-md relative z-10 animate-[slideUp_0.6s_ease-out]">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-pink-500 via-rose-600 to-amber-800 flex items-center justify-center shadow-lg shadow-pink-500/20 rotate-3 hover:rotate-0 transition-transform duration-300 border border-white/10">
            <span className="text-2xl font-bold text-white">A</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">
            Akkiyu School of Technology
          </h1>
          <p className="text-slate-400 text-sm">Examination Portal</p>
        </div>

        {/* Login Card */}
        <div className="bg-[#141a2b]/80 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl shadow-black/50">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Sign In</h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20 font-semibold">RBAC Secured</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-3.5 pl-11 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 focus:bg-white/10 transition-all text-sm font-medium"
                />
                <svg className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3.5 pl-11 pr-11 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 focus:bg-white/10 transition-all text-sm font-medium"
                />
                <svg className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-rose-400 text-sm animate-[slideUp_0.2s_ease-out]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-pink-600 via-rose-600 to-amber-700 hover:from-pink-500 hover:to-amber-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-pink-600/20 disabled:opacity-50 text-sm"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign In to Examination Portal'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6 font-medium">
          Akkiyu School of Technology &bull; SSC CGL Platform &copy; 2026
        </p>
      </div>
    </div>
  );
}
