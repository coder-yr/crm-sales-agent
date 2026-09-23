import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/auth.service';

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = isLogin 
        ? await authService.login({ email, password })
        : await authService.register({ email, password });
        
      if (response.success) {
        setSuccess(true);
        setAuth(response.data.user, response.data.accessToken, response.data.refreshToken);
        setTimeout(() => {
          navigate('/workspace-overview');
        }, 1000);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Brand Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 mx-auto mb-4">
          <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>apartment</span>
        </div>
        <h1 className="text-3xl font-black text-on-surface tracking-tighter">EstateFlow</h1>
        <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-[0.2em] mt-1">Elite Precision Workspace</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[460px] card overflow-hidden relative border-none shadow-[0_40px_100px_rgba(0,0,0,0.08)]"
      >
        <AnimatePresence mode="wait">
          {!success ? (
            <motion.div 
              key="auth-form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-10"
            >
              {/* Login/Signup Toggle */}
              <div className="flex p-1 rounded-2xl mb-10" style={{ background: 'var(--surface-container-low)' }}>
                <button 
                  type="button"
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${isLogin ? 'bg-white text-primary shadow-md' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  Sign In
                </button>
                <button 
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${!isLogin ? 'bg-white text-primary shadow-md' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  Create Account
                </button>
              </div>

              {/* Sub Navigation */}
              <div className="flex gap-8 border-b mb-10" style={{ borderColor: 'var(--surface-container)' }}>
                <button 
                  type="button"
                  onClick={() => setAuthMethod('email')}
                  className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${authMethod === 'email' ? 'text-primary' : 'text-outline'}`}
                >
                  Email Address
                  {authMethod === 'email' && <motion.div layoutId="auth-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
                </button>
                <button 
                  type="button"
                  onClick={() => setAuthMethod('phone')}
                  className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${authMethod === 'phone' ? 'text-primary' : 'text-outline'}`}
                >
                  Phone Access
                  {authMethod === 'phone' && <motion.div layoutId="auth-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
                </button>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-error-container text-error text-xs font-bold rounded-xl flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-outline uppercase tracking-widest">Official Email</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">mail</span>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alexander@estateflow.com"
                      className="w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-outline uppercase tracking-widest">Password</label>
                    <button type="button" className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest">Recover Access</button>
                  </div>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">lock</span>
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-12 py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded border-2 border-surface-container flex items-center justify-center cursor-pointer transition-all hover:border-primary group">
                    <input type="checkbox" id="remember" className="hidden" />
                    <div className="w-3 h-3 rounded-sm bg-primary opacity-0 transition-opacity peer-checked:opacity-100" />
                  </div>
                  <label htmlFor="remember" className="text-xs text-on-surface-variant font-semibold select-none cursor-pointer">Trust this device for 30 days</label>
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-5 bg-primary text-white rounded-2xl font-black text-sm shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                >
                  {loading ? 'Authenticating...' : isLogin ? 'Sign In to Workspace' : 'Initialize Account'}
                </button>
              </form>

              <div className="mt-10 flex items-center gap-4">
                <div className="flex-1 h-px bg-surface-container"></div>
                <span className="text-[10px] font-black text-outline uppercase tracking-[0.2em]">Institutional SSO</span>
                <div className="flex-1 h-px bg-surface-container"></div>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-4">
                <button type="button" onClick={handleSubmit} className="flex items-center justify-center gap-3 py-4 px-4 bg-surface-container-low rounded-2xl hover:bg-surface-container transition-all text-xs font-black uppercase tracking-wider text-on-surface">
                  <img src="https://www.google.com/favicon.ico" className="w-4 h-4 grayscale" alt="Google" />
                  Google
                </button>
                <button type="button" onClick={handleSubmit} className="flex items-center justify-center gap-3 py-4 px-4 bg-surface-container-low rounded-2xl hover:bg-surface-container transition-all text-xs font-black uppercase tracking-wider text-on-surface">
                  <span className="material-symbols-outlined text-xl grayscale">apple</span>
                  Apple ID
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="auth-success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-20 text-center flex flex-col items-center"
            >
              <div className="w-20 h-20 bg-secondary-container rounded-full flex items-center justify-center mb-8 shadow-xl shadow-secondary/10">
                <span className="material-symbols-outlined text-4xl text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              </div>
              <h2 className="text-2xl font-black text-on-surface mb-2 tracking-tight">Success</h2>
              <p className="text-on-surface-variant text-sm font-medium">Preparing your secure workspace...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <footer className="mt-20 text-center">
        <p className="text-xs text-on-surface-variant font-medium">
          Manage your high-performance team with <span className="text-primary font-black">EstateFlow Enterprise</span>
        </p>
        <div className="flex gap-8 justify-center mt-12 opacity-40">
          {['Security', 'Privacy', 'Compliance', 'Global Scale'].map(item => (
            <span key={item} className="text-[10px] font-black uppercase tracking-widest text-outline">{item}</span>
          ))}
        </div>
      </footer>
    </div>
  );
};

