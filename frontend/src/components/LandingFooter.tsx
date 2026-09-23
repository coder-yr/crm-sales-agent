import React from 'react';

export const LandingFooter: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-100 pt-24 pb-12 px-8 lg:px-16">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 lg:gap-8 mb-20">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined text-white text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>apartment</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-on-surface">EstateFlow</span>
            </div>
            <p className="text-on-surface-variant/80 max-w-sm mb-8 text-sm font-normal leading-relaxed">
              The modern OS for high-performance real estate teams. Scale your portfolio with enterprise-grade precision.
            </p>
            <div className="flex gap-3">
              {['share', 'group', 'language'].map(icon => (
                <div key={icon} className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200/60 flex items-center justify-center text-on-surface-variant/70 hover:bg-primary hover:text-white hover:border-primary cursor-pointer transition-all duration-200">
                  <span className="material-symbols-outlined text-[18px]">{icon}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-1">
            <h4 className="font-mono text-xs uppercase tracking-widest text-on-surface/90 mb-6">Product</h4>
            <ul className="space-y-4 text-on-surface-variant/80 text-sm font-medium">
              {['Features', 'Solutions', 'Pricing', 'Enterprise', 'Changelog'].map(item => (
                <li key={item}><a href="#" className="hover:text-primary transition-colors block">{item}</a></li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-1">
            <h4 className="font-mono text-xs uppercase tracking-widest text-on-surface/90 mb-6">Company</h4>
            <ul className="space-y-4 text-on-surface-variant/80 text-sm font-medium">
              {['About Us', 'Careers', 'Blog', 'Contact', 'Partners'].map(item => (
                <li key={item}><a href="#" className="hover:text-primary transition-colors block">{item}</a></li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h4 className="font-mono text-xs uppercase tracking-widest text-on-surface/90 mb-6">Stay Connected</h4>
            <p className="text-on-surface-variant/80 text-sm mb-6 font-normal">Subscribe to our newsletter for exclusive market intel and product updates.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="flex-grow px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-normal text-sm w-full"
              />
              <button className="px-6 py-3 bg-on-surface text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-primary transition-colors whitespace-nowrap shadow-md w-full sm:w-auto">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6 text-xs font-normal text-on-surface-variant/60 text-center md:text-left">
          <p>© 2026 EstateFlow Inc. All rights reserved.</p>
          <div className="flex flex-wrap justify-center md:justify-end gap-6 md:gap-8">
            {['Privacy Policy', 'Terms of Service', 'Cookie Settings', 'Security'].map(item => (
              <span key={item} className="cursor-pointer hover:text-primary transition-colors">{item}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};
