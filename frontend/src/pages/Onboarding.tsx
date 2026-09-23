import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    companyName: '',
    industry: 'Real Estate',
    teamSize: '1-10',
    fullName: '',
    role: '',
    pipelineStages: [
      { name: "New Lead", label: "INITIAL", desc: "First point of contact with potential client" },
      { name: "Property Qualification", label: null, desc: "Reviewing property details and budget alignment" },
      { name: "Negotiation & Contract", label: null, desc: "Back-and-forth offers and legal review" },
      { name: "Closing", label: "FINAL", desc: "Finalizing sale and handing over keys" },
    ]
  });

  const nextStep = () => setStep(s => Math.min(s + 1, 4));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleComplete = () => {
    navigate('/workspace-overview');
  };

  const steps = [
    { id: 1, name: 'Company', icon: 'apartment' },
    { id: 2, name: 'Profile', icon: 'person' },
    { id: 3, name: 'Pipeline', icon: 'view_kanban' },
    { id: 4, name: 'Team', icon: 'groups' },
  ];

  return (
    <div className="min-h-screen flex items-stretch bg-white w-full" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Left Side: Visual/Branding */}
      <div className="hidden lg:flex w-[400px] bg-primary relative flex-col justify-between p-12 overflow-hidden shrink-0">
        <div className="absolute inset-0 z-0 opacity-10">
          <img
            className="w-full h-full object-cover grayscale brightness-0 invert"
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80"
            alt="Architecture"
          />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>domain</span>
            </div>
            <div>
              <span className="text-xl font-black text-white tracking-tight leading-none block">EstateFlow</span>
              <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mt-1">Elite CRM</span>
            </div>
          </div>
          <h1 className="text-4xl font-black text-white mb-6 leading-[1.1]">Precision. Performance. Prestige.</h1>
          <p className="text-indigo-100 text-lg opacity-80 leading-relaxed font-medium">
            Join the elite circle of real estate professionals. Let's configure your workspace for high-velocity growth.
          </p>
        </div>

        <div className="relative z-10 mt-auto">
          <div className="p-8 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
            <p className="text-[10px] font-bold text-indigo-200 mb-6 uppercase tracking-widest">Configuration Progress</p>
            <div className="space-y-6">
              {steps.map((s) => (
                <div key={s.id} className={`flex items-center gap-4 transition-all ${step >= s.id ? 'opacity-100' : 'opacity-30'}`}>
                  <div className={`w-2 h-2 rounded-full ${step >= s.id ? 'bg-secondary-fixed shadow-[0_0_12px_rgba(111,251,190,0.5)]' : 'bg-white'}`}></div>
                  <span className="text-sm font-bold text-white">{s.name} Setup</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Stepper Content */}
      <div className="flex-1 flex flex-col bg-surface overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full px-12 py-16 flex-1 flex flex-col">
          {/* Stepper Navigation */}
          <nav className="flex justify-between items-center mb-16 relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-surface-container-highest -translate-y-1/2 -z-0"></div>
            
            {steps.map((s) => (
              <div key={s.id} className="flex items-center gap-3 bg-surface px-4 z-10 transition-all">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold transition-all ${
                  step === s.id 
                    ? 'bg-primary text-white ring-4 ring-primary-container scale-110 shadow-lg' 
                    : step > s.id 
                      ? 'bg-secondary text-white' 
                      : 'bg-surface-container-highest text-outline'
                }`}>
                  {step > s.id ? <span className="material-symbols-outlined text-sm">check</span> : s.id}
                </div>
                <span className={`text-xs font-black uppercase tracking-widest hidden md:block ${step === s.id ? 'text-primary' : 'text-outline'}`}>
                  {s.name}
                </span>
              </div>
            ))}
          </nav>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-10"
            >
              {step === 1 && (
                <div className="space-y-8">
                  <header className="space-y-2">
                    <h2 className="text-3xl font-black text-on-surface">Company Profile</h2>
                    <p className="text-on-surface-variant font-medium">Tell us about your brokerage or agency.</p>
                  </header>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-outline">Company Name</label>
                      <input 
                        className="w-full px-5 py-4 bg-white border border-outline-variant rounded-2xl focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all font-medium"
                        placeholder="e.g. Skyline Real Estate"
                        value={formData.companyName}
                        onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-outline">Team Size</label>
                      <select 
                        className="w-full px-5 py-4 bg-white border border-outline-variant rounded-2xl focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all font-medium appearance-none"
                        value={formData.teamSize}
                        onChange={(e) => setFormData({...formData, teamSize: e.target.value})}
                      >
                        <option>1-10 agents</option>
                        <option>11-50 agents</option>
                        <option>51-200 agents</option>
                        <option>200+ agents</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8">
                  <header className="space-y-2">
                    <h2 className="text-3xl font-black text-on-surface">Your Professional Identity</h2>
                    <p className="text-on-surface-variant font-medium">This is how you'll appear to your team and clients.</p>
                  </header>
                  <div className="flex flex-col items-center gap-8 py-4">
                    <div className="relative group">
                      <div className="w-32 h-32 rounded-3xl bg-surface-container-high overflow-hidden border-4 border-white shadow-xl">
                        <img className="w-full h-full object-cover" src="https://i.pravatar.cc/300?img=12" alt="Avatar" />
                      </div>
                      <button className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary text-white rounded-xl shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-sm">photo_camera</span>
                      </button>
                    </div>
                    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-outline">Full Name</label>
                        <input className="w-full px-5 py-4 bg-white border border-outline-variant rounded-2xl focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all font-medium" placeholder="Alexander Wright" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-outline">Primary Role</label>
                        <input className="w-full px-5 py-4 bg-white border border-outline-variant rounded-2xl focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all font-medium" placeholder="Principal Owner" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-8">
                  <header className="space-y-2">
                    <h2 className="text-3xl font-black text-on-surface">Setup Pipeline Stages</h2>
                    <p className="text-on-surface-variant font-medium">Define the workflow for your property deals.</p>
                  </header>
                  <div className="space-y-3">
                    {formData.pipelineStages.map((stage, idx) => (
                      <div
                        key={idx}
                        className="group bg-white border border-outline-variant p-5 rounded-2xl shadow-sm flex items-center gap-4 hover:border-primary transition-all cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">drag_indicator</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-on-surface">{stage.name}</span>
                            {stage.label && (
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full tracking-widest ${
                                stage.label === 'INITIAL' ? 'bg-secondary-container text-secondary' : 'bg-primary-container text-primary'
                              }`}>
                                {stage.label}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-outline font-medium">{stage.desc}</p>
                        </div>
                      </div>
                    ))}
                    <button className="w-full py-5 border-2 border-dashed border-outline-variant rounded-2xl text-outline hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2 group font-bold text-sm bg-white/50">
                      <span className="material-symbols-outlined group-hover:rotate-90 transition-transform">add</span>
                      Add New Stage
                    </button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-8">
                  <header className="space-y-2">
                    <h2 className="text-3xl font-black text-on-surface">Invite Your Elite Team</h2>
                    <p className="text-on-surface-variant font-medium">Add your high-performing agents and administrative staff.</p>
                  </header>
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="flex gap-4">
                        <div className="flex-1">
                          <input className="w-full px-5 py-4 bg-white border border-outline-variant rounded-2xl outline-none font-medium text-sm" placeholder="agent@company.com" />
                        </div>
                        <div className="w-40">
                          <select className="w-full px-5 py-4 bg-white border border-outline-variant rounded-2xl outline-none font-medium text-sm appearance-none">
                            <option>Agent</option>
                            <option>Manager</option>
                            <option>Admin</option>
                          </select>
                        </div>
                      </div>
                    ))}
                    <button className="text-sm font-bold text-primary flex items-center gap-2 hover:opacity-80 transition-opacity">
                      <span className="material-symbols-outlined text-sm">add</span>
                      Add another invitation
                    </button>
                  </div>
                  <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10">
                    <p className="text-xs font-semibold text-primary mb-2">Pro Tip</p>
                    <p className="text-xs text-on-surface-variant leading-relaxed font-medium">
                      You can also import your entire team via CSV or sync directly from G-Suite in your team settings later.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between pt-10 mt-auto border-t border-surface-container-highest">
            <button 
              onClick={prevStep}
              className={`flex items-center gap-2 text-sm font-bold text-outline hover:text-on-surface transition-colors ${step === 1 ? 'invisible' : 'visible'}`}
            >
              <span className="material-symbols-outlined">arrow_back</span>
              Back
            </button>
            <div className="flex gap-4">
              <button onClick={handleComplete} className="px-6 py-3 text-sm font-bold text-outline hover:text-on-surface transition-colors">
                Skip for now
              </button>
              <button 
                onClick={step === 4 ? handleComplete : nextStep}
                className="bg-primary text-white px-10 py-3 rounded-xl font-black text-sm shadow-xl shadow-primary/20 hover:scale-[1.05] active:scale-95 transition-all"
              >
                {step === 4 ? 'Launch Workspace' : 'Continue'}
              </button>
            </div>
          </div>
        </div>

        <footer className="bg-white/50 backdrop-blur-sm border-t border-outline-variant py-6 px-12">
          <div className="max-w-3xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <img
                className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-md"
                src="https://i.pravatar.cc/100?img=44"
                alt="Sarah"
              />
              <div>
                <p className="text-xs font-bold text-on-surface">Need help setting up?</p>
                <p className="text-xs text-outline font-medium">Chat with Sarah, your EstateFlow guide.</p>
              </div>
            </div>
            <div className="flex gap-8">
              <button className="text-[11px] font-bold text-outline hover:text-primary transition-colors">Privacy Policy</button>
              <button className="text-[11px] font-bold text-outline hover:text-primary transition-colors">Documentation</button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
