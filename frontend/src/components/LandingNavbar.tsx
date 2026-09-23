import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const LandingNavbar: React.FC = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'py-4 bg-white/70 backdrop-blur-2xl border-b shadow-sm' : 'py-6 bg-transparent border-b border-transparent'
      }`}
      style={{ borderColor: scrolled ? 'var(--surface-container)' : 'transparent' }}
    >
      <div className="max-w-7xl mx-auto px-8 lg:px-16 flex items-center justify-between">
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:rotate-6 transition-transform duration-500">
              <span className="material-symbols-outlined text-white text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>apartment</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-on-surface tracking-tight leading-none">EstateFlow</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                <span className="text-[9px] font-mono uppercase tracking-widest text-primary/80">Broker Platform</span>
              </div>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center gap-8">
            {['Features', 'Solutions', 'Pricing', 'Resources'].map(item => (
              <a 
                key={item}
                href={`#${item.toLowerCase()}`} 
                className="text-sm font-semibold text-on-surface-variant/80 hover:text-primary transition-all duration-300 relative group"
              >
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/auth')} 
            className="text-sm font-semibold text-on-surface-variant/80 hover:text-on-surface transition-colors"
          >
            Log in
          </button>
          <button 
            onClick={() => navigate('/auth')} 
            className="px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-primary-dark transition-all duration-200 shadow-md shadow-primary/10"
          >
            Get Started
          </button>
        </div>
      </div>
    </nav>
  );
};
