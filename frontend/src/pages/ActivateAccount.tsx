import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authService } from '../services/auth.service';

export const ActivateAccount: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await authService.activateAccount(token!, password);
      if (response.success) {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setError(response.message || 'Activation failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-container-low p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card p-10 max-w-md w-full text-center space-y-6"
        >
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-[40px]">check_circle</span>
          </div>
          <h2 className="text-3xl font-black text-on-surface">Account Activated!</h2>
          <p className="text-outline font-medium">Your password has been set. Redirecting to login...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-container-low p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-10 max-w-md w-full space-y-8"
      >
        <header className="text-center">
          <h1 className="text-3xl font-black text-on-surface tracking-tight">Activate Account</h1>
          <p className="text-sm text-outline mt-2 font-medium">Set your secure password to begin using EstateFlow CRM.</p>
        </header>

        <form onSubmit={handleActivate} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-outline">New Password</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">lock</span>
              <input 
                type="password" 
                required 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium focus:border-primary transition-all" 
                placeholder="••••••••" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-outline">Confirm Password</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">lock</span>
              <input 
                type="password" 
                required 
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium focus:border-primary transition-all" 
                placeholder="••••••••" 
              />
            </div>
          </div>

          {error && (
            <p className="text-xs font-bold text-error bg-error/10 p-3 rounded-xl">{error}</p>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? 'Activating...' : 'Set Password & Activate'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
