import React from 'react';
import { motion } from 'framer-motion';

export const HelpCenter: React.FC = () => {
  return (
    <div className="p-8 space-y-8 max-w-[1400px] mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
      <motion.div 
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between border-b pb-8" 
        style={{ borderColor: 'var(--surface-container)' }}
      >
        <div>
          <h1 className="text-[30px] font-semibold leading-tight" style={{ color: 'var(--on-surface)', letterSpacing: '-0.02em' }}>
            Help Center
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
            Find answers, tutorials, and support for your Elite Workspace.
          </p>
        </div>
        <button className="bg-primary text-white px-8 py-3 rounded-xl font-bold text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
          Contact Support
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {[
          { title: 'Getting Started', desc: 'Setup your workspace, team, and pipelines.', icon: 'rocket_launch' },
          { title: 'Lead Management', desc: 'Import, assign, and convert your leads efficiently.', icon: 'group' },
          { title: 'Automations', desc: 'Configure powerful rules to streamline your workflows.', icon: 'bolt' },
          { title: 'Analytics & Reporting', desc: 'Understand your dashboards and generate reports.', icon: 'analytics' },
          { title: 'Integrations', desc: 'Connect with Google, Zillow, and other tools.', icon: 'extension' },
          { title: 'Account Settings', desc: 'Manage billing, roles, permissions, and security.', icon: 'settings' }
        ].map((item, i) => (
          <div key={i} className="card p-6 cursor-pointer hover:shadow-lg transition-all border border-transparent hover:border-primary/20">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 text-primary">
              <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
            </div>
            <h3 className="font-bold text-lg mb-2 text-on-surface">{item.title}</h3>
            <p className="text-sm text-on-surface-variant">{item.desc}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
};
