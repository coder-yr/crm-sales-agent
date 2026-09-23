import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export const Pricing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="pt-24 pb-20 px-6 lg:px-12 max-w-7xl mx-auto w-full">
      {/* Hero Section */}
      <header className="text-center mb-16 space-y-4">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-h1 text-h1 text-on-surface"
        >
          Precision Pricing for High-Velocity Real Estate
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto"
        >
          Scale your portfolio with AI-driven lead management and architectural-grade analytics.
        </motion.p>

        {/* Toggle Component */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center items-center gap-4 pt-6"
        >
          <span className="font-label-md text-label-md text-on-surface-variant">Monthly</span>
          <button className="relative w-12 h-6 bg-surface-container-highest rounded-full p-1 transition-colors">
            <div className="w-4 h-4 bg-primary-container rounded-full translate-x-6"></div>
          </button>
          <span className="font-label-md text-label-md text-on-surface">Yearly</span>
          <span className="bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Save 20%</span>
        </motion.div>
      </header>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
        {/* Basic Plan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-8 rounded-xl border border-outline-variant shadow-sm flex flex-col h-full hover:shadow-md transition-shadow"
        >
          <div className="mb-8">
            <h3 className="font-h3 text-h3 mb-2">Basic</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-6">Perfect for individual agents.</p>
            <div className="flex items-baseline gap-1">
              <span className="font-h2 text-h2">₹2,499</span>
              <span className="text-on-surface-variant font-body-md">/mo</span>
            </div>
          </div>
          <ul className="space-y-4 mb-8 flex-grow">
            <li className="flex items-center gap-3 text-body-md font-body-md">
              <span className="material-symbols-outlined text-secondary text-lg">check_circle</span>
              Up to 500 Leads
            </li>
            <li className="flex items-center gap-3 text-body-md font-body-md">
              <span className="material-symbols-outlined text-secondary text-lg">check_circle</span>
              Basic Pipeline View
            </li>
            <li className="flex items-center gap-3 text-body-md font-body-md">
              <span className="material-symbols-outlined text-secondary text-lg">check_circle</span>
              Property Inventory (50)
            </li>
            <li className="flex items-center gap-3 text-on-surface-variant/50 text-body-md font-body-md line-through">
              <span className="material-symbols-outlined text-lg opacity-30">cancel</span>
              Advanced Analytics
            </li>
          </ul>
          <button onClick={() => navigate('/auth')} className="w-full py-3 border border-outline text-on-surface font-button text-button rounded-xl hover:bg-surface-container-high transition-colors">Start for Free</button>
        </motion.div>

        {/* Pro Plan (Recommended) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative glass-card p-8 rounded-xl border-2 border-primary-container shadow-xl shadow-indigo-500/10 flex flex-col h-full transform scale-105 z-10"
        >
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary-container text-white px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase">Recommended</div>
          <div className="mb-8">
            <h3 className="font-h3 text-h3 mb-2">Pro</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-6">For high-performance teams.</p>
            <div className="flex items-baseline gap-1">
              <span className="font-h2 text-h2">₹6,499</span>
              <span className="text-on-surface-variant font-body-md">/mo</span>
            </div>
          </div>
          <ul className="space-y-4 mb-8 flex-grow">
            <li className="flex items-center gap-3 text-body-md font-body-md">
              <span className="material-symbols-outlined text-secondary text-lg">check_circle</span>
              Unlimited Leads
            </li>
            <li className="flex items-center gap-3 text-body-md font-body-md">
              <span className="material-symbols-outlined text-secondary text-lg">check_circle</span>
              Kanban &amp; List Pipelines
            </li>
            <li className="flex items-center gap-3 text-body-md font-body-md">
              <span className="material-symbols-outlined text-secondary text-lg">check_circle</span>
              Advanced Property CRM
            </li>
            <li className="flex items-center gap-3 text-body-md font-body-md">
              <span className="material-symbols-outlined text-secondary text-lg">check_circle</span>
              Analytics Dashboard
            </li>
            <li className="flex items-center gap-3 text-body-md font-body-md">
              <span className="material-symbols-outlined text-secondary text-lg">check_circle</span>
              Email Integration
            </li>
          </ul>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/auth')}
            className="w-full py-3 bg-primary-container text-white font-button text-button rounded-xl shadow-lg shadow-indigo-500/25 transition-all"
          >
            Upgrade to Pro
          </motion.button>
        </motion.div>

        {/* Enterprise Plan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-8 rounded-xl border border-outline-variant shadow-sm flex flex-col h-full hover:shadow-md transition-shadow"
        >
          <div className="mb-8">
            <h3 className="font-h3 text-h3 mb-2">Enterprise</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-6">Custom architectural solutions.</p>
            <div className="flex items-baseline gap-1">
              <span className="font-h2 text-h2">Contact</span>
            </div>
          </div>
          <ul className="space-y-4 mb-8 flex-grow">
            <li className="flex items-center gap-3 text-body-md font-body-md">
              <span className="material-symbols-outlined text-secondary text-lg">check_circle</span>
              Multi-Team Hierarchy
            </li>
            <li className="flex items-center gap-3 text-body-md font-body-md">
              <span className="material-symbols-outlined text-secondary text-lg">check_circle</span>
              Dedicated Account Manager
            </li>
            <li className="flex items-center gap-3 text-body-md font-body-md">
              <span className="material-symbols-outlined text-secondary text-lg">check_circle</span>
              Custom API Access
            </li>
            <li className="flex items-center gap-3 text-body-md font-body-md">
              <span className="material-symbols-outlined text-secondary text-lg">check_circle</span>
              White-label Client Portal
            </li>
          </ul>
          <button className="w-full py-3 border border-outline text-on-surface font-button text-button rounded-xl hover:bg-surface-container-high transition-colors">Contact Sales</button>
        </motion.div>
      </div>

      {/* Comparison Table */}
      <section className="mt-32">
        <div className="text-center mb-12">
          <h2 className="font-h2 text-h2 text-on-surface">The Full Feature Matrix</h2>
          <p className="text-on-surface-variant font-body-md mt-2">Deep dive into the precision tools we offer across plans.</p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-outline-variant bg-white shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="p-6 font-label-md text-label-md uppercase tracking-wider text-on-surface-variant border-b border-outline-variant">Features</th>
                <th className="p-6 font-label-md text-label-md uppercase tracking-wider text-on-surface-variant border-b border-outline-variant">Basic</th>
                <th className="p-6 font-label-md text-label-md uppercase tracking-wider text-indigo-600 border-b border-outline-variant">Pro</th>
                <th className="p-6 font-label-md text-label-md uppercase tracking-wider text-on-surface-variant border-b border-outline-variant">Enterprise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {/* CRM Category */}
              <tr className="bg-surface-container/30">
                <td className="px-6 py-3 font-button text-button text-primary" colSpan={4}>Core CRM Features</td>
              </tr>
              <tr className="hover:bg-gray-50/50 transition-colors">
                <td className="p-6 font-body-md text-body-md">Lead Management</td>
                <td className="p-6 font-body-md">500 Leads</td>
                <td className="p-6 font-body-md font-semibold">Unlimited</td>
                <td className="p-6 font-body-md">Unlimited</td>
              </tr>
              <tr className="hover:bg-gray-50/50 transition-colors">
                <td className="p-6 font-body-md text-body-md">Custom Pipeline Stages</td>
                <td className="p-6"><span className="material-symbols-outlined text-on-surface-variant/30">remove</span></td>
                <td className="p-6"><span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check</span></td>
                <td className="p-6"><span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check</span></td>
              </tr>
              <tr className="hover:bg-gray-50/50 transition-colors">
                <td className="p-6 font-body-md text-body-md">Automation Engine</td>
                <td className="p-6"><span className="material-symbols-outlined text-on-surface-variant/30">remove</span></td>
                <td className="p-6 font-body-md">10 Active Flows</td>
                <td className="p-6 font-body-md">Unlimited</td>
              </tr>

              {/* Analytics Category */}
              <tr className="bg-surface-container/30">
                <td className="px-6 py-3 font-button text-button text-primary" colSpan={4}>Intelligence &amp; Analytics</td>
              </tr>
              <tr className="hover:bg-gray-50/50 transition-colors">
                <td className="p-6 font-body-md text-body-md">Monthly Performance Reports</td>
                <td className="p-6"><span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check</span></td>
                <td className="p-6"><span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check</span></td>
                <td className="p-6"><span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check</span></td>
              </tr>
              <tr className="hover:bg-gray-50/50 transition-colors">
                <td className="p-6 font-body-md text-body-md">AI Predictive Valuation</td>
                <td className="p-6"><span className="material-symbols-outlined text-on-surface-variant/30">remove</span></td>
                <td className="p-6"><span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check</span></td>
                <td className="p-6"><span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check</span></td>
              </tr>
              <tr className="hover:bg-gray-50/50 transition-colors">
                <td className="p-6 font-body-md text-body-md">Real-time Activity Logs</td>
                <td className="p-6"><span className="material-symbols-outlined text-on-surface-variant/30">remove</span></td>
                <td className="p-6"><span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check</span></td>
                <td className="p-6"><span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Bento Grid Trust Section */}
      <section className="mt-32">
        <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-4 h-auto md:h-[400px]">
          <div className="md:col-span-2 md:row-span-2 glass-card rounded-2xl border border-outline-variant p-8 flex flex-col justify-end bg-gradient-to-br from-indigo-50/50 to-white relative overflow-hidden group min-h-[300px]">
            <img className="absolute inset-0 w-full h-full object-cover opacity-10 group-hover:scale-105 transition-transform duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCaVTvjEIKpNpcn3uM-pYeEIXl8tI7LlaP2o-8mas3N2Bn0mJ_zuzyKXKpz1SJCVitRvDuRa_2wwybEqdVfAuYsxn7_vKRevgPtNzmMcyG662y38Ha1LuOqEm6HvRohxyK6fp55bXLyYm7-YLOFuT74wImEW8AsZ6ltxrDl1SFExh5FBjHL5O3Mg1PRHpkuy6HpZkbaBXNcbm1SC-N-2SWbwk8Hm3qxYYd5sj2Gy8roIgdHyObbiyJOuWEK-lLRb4gxl_pQbZkOFCU" alt="Architecture" />
            <div className="relative z-10">
              <span className="text-indigo-600 font-bold uppercase tracking-widest text-[10px]">Built for Excellence</span>
              <h3 className="font-h2 text-h2 mt-2">Trusted by 2,000+ Brokerages</h3>
              <p className="font-body-md text-on-surface-variant mt-2 max-w-sm">Our platform delivers the precision required for high-stakes luxury real estate operations.</p>
            </div>
          </div>
          <div className="md:col-span-2 glass-card rounded-2xl border border-outline-variant p-6 flex items-center gap-6 min-h-[150px]">
            <div className="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-on-secondary-container text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
            </div>
            <div>
              <h4 className="font-h3 text-h3 leading-none">Bank-Level Security</h4>
              <p className="font-body-sm text-on-surface-variant mt-1">256-bit encryption for all lead data.</p>
            </div>
          </div>
          <div className="glass-card rounded-2xl border border-outline-variant p-6 flex flex-col justify-center text-center min-h-[150px]">
            <div className="text-indigo-600 font-black text-2xl">99.9%</div>
            <div className="text-on-surface-variant text-[10px] uppercase font-bold tracking-widest">Uptime</div>
          </div>
          <div className="glass-card rounded-2xl border border-outline-variant p-6 flex flex-col justify-center text-center min-h-[150px]">
            <div className="text-indigo-600 font-black text-2xl">24/7</div>
            <div className="text-on-surface-variant text-[10px] uppercase font-bold tracking-widest">Global Support</div>
          </div>
        </div>
      </section>
    </div>
  );
};
