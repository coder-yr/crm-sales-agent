import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LandingNavbar } from '../components/LandingNavbar';
import { LandingFooter } from '../components/LandingFooter';

const faqs = [
  {
    q: "Can I import leads from other CRMs?",
    a: "Yes, EstateFlow supports one-click imports from all major CRMs including Salesforce, HubSpot, and Zillow. Our data migration team can also assist with custom data sets."
  },
  {
    q: "Is there a mobile app for agents on the go?",
    a: "Absolutely. Our mobile app for iOS and Android keeps your pipeline at your fingertips with real-time push notifications and GPS tracking for showings."
  },
  {
    q: "How secure is my data?",
    a: "We use bank-level 256-bit AES encryption. Your data is stored on secure, redundant servers with 99.9% uptime guaranteed by our Service Level Agreement."
  },
  {
    q: "Do you offer white-labeling for teams?",
    a: "Yes, our Enterprise plan includes full white-labeling options, allowing you to brand the client portal and reports with your own logo and colors."
  }
];

const testimonials = [
  {
    name: "Sarah Jenkins",
    role: "Senior Broker @ Vanguard",
    text: "EstateFlow transformed our team's velocity. We've seen a 40% increase in conversion within the first quarter.",
    img: "https://i.pravatar.cc/100?img=32"
  },
  {
    name: "Marcus Thorne",
    role: "Principal @ Skyline",
    text: "The definitive tool for modern real estate. The clinical precision of the analytics is unmatched in the industry.",
    img: "https://i.pravatar.cc/100?img=44"
  },
  {
    name: "Elena Ross",
    role: "Director @ Nexus RE",
    text: "Scaling our global operations was a nightmare until we integrated EstateFlow. It's now the heart of our firm.",
    img: "https://i.pravatar.cc/100?img=47"
  }
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isYearly, setIsYearly] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.8, ease: 'easeOut' as any }
    }
  };

  return (
    <div className="mesh-bg min-h-screen flex flex-col relative overflow-hidden" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="grain-overlay" />
      
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none -z-10">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            x: [0, 50, 0],
            y: [0, -50, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square bg-primary/5 rounded-full blur-[160px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            x: [0, -30, 0],
            y: [0, 40, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] right-[-5%] w-[50%] aspect-square bg-secondary/5 rounded-full blur-[140px]" 
        />
      </div>

      <LandingNavbar />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative pt-28 lg:pt-32 pb-32 lg:pb-44 overflow-visible">
          <div className="max-w-7xl mx-auto px-8 lg:px-16 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: "backOut" }}
              className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-white/50 backdrop-blur-md border border-white shadow-2xl mb-12"
            >
              <div className="flex -space-x-2">
                {[12, 45, 33].map(i => (
                  <img key={i} src={`https://i.pravatar.cc/100?img=${i}`} className="w-7 h-7 rounded-full border-2 border-white shadow-sm" alt="Verified Real Estate Professional" />
                ))}
              </div>
              <span className="text-sm font-medium text-on-surface-variant">Trusted by over 10,000 real estate professionals</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="text-5xl md:text-6xl lg:text-[80px] font-bold mb-8 tracking-tight text-on-surface leading-tight max-w-5xl mx-auto"
            >
              The intelligent CRM for <br className="hidden md:block" />
              <span className="text-primary">top-producing agents.</span>
            </motion.h1>

            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="text-on-surface-variant max-w-3xl mx-auto mb-12 text-lg md:text-xl font-normal leading-relaxed opacity-90"
            >
              EstateFlow is the all-in-one platform to manage your pipeline, automate follow-ups, and build lasting client relationships. Built for teams that want to close more deals with less effort.
            </motion.h2>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <div className="relative group">
                <div className="absolute -inset-1 bg-primary blur-xl opacity-10 group-hover:opacity-20 transition-opacity" />
                <button 
                  onClick={() => navigate('/auth')} 
                  className="relative px-8 py-4 bg-primary text-white rounded-xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary-dark active:scale-[0.98] transition-all duration-200"
                >
                  Get Started Free
                </button>
              </div>
              <button className="px-8 py-4 bg-white/80 backdrop-blur-md border border-gray-200/85 text-on-surface rounded-xl font-bold text-sm uppercase tracking-widest flex items-center gap-2 hover:bg-white active:scale-[0.98] transition-all duration-200 shadow-sm">
                <span className="material-symbols-outlined text-primary text-[18px]">play_circle</span>
                Watch Demo
              </button>
            </motion.div>

            {/* Product Mockup with Floating Elements */}
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.8, ease: "easeOut" }}
              className="mt-32 relative max-w-6xl mx-auto px-4"
            >
              {/* Floating Glass Image */}
              <motion.img 
                src="/images/glassy_shape.png" 
                alt="Glass Shape"
                className="absolute top-[-100px] left-[-150px] w-[350px] pointer-events-none -z-10 opacity-60 mix-blend-multiply filter blur-sm"
                animate={{ y: [0, -30, 0], rotate: [0, 10, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.img 
                src="/images/glassy_shape.png" 
                alt="Glass Shape"
                className="absolute bottom-[-100px] right-[-150px] w-[400px] pointer-events-none -z-10 opacity-40 mix-blend-multiply scale-x-[-1]"
                animate={{ y: [0, 40, 0], rotate: [0, -15, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              />

              <div className="relative group">
                <div className="absolute -inset-4 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 rounded-[40px] blur-3xl opacity-50" />
                <div className="relative bg-white/40 backdrop-blur-3xl border-[12px] border-white/50 rounded-[40px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)] overflow-hidden">
                  <img
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-[1.02]"
                    src="/images/dashboard.png"
                    alt="EstateFlow Real Estate CRM Dashboard Analytics"
                  />
                  
                  {/* Floating Metric Card */}
                  <motion.div
                    animate={{ y: [0, -15, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-12 left-12 p-5 bg-white/80 backdrop-blur-2xl border border-white/40 rounded-3xl shadow-2xl w-56 hidden lg:block"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                        <span className="material-symbols-outlined text-[20px]">trending_up</span>
                      </div>
                      <span className="text-[10px] font-mono text-on-surface-variant tracking-wider uppercase">Lead Velocity</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-on-surface">+128%</span>
                      <span className="text-[10px] font-semibold text-emerald-600">vs LW</span>
                    </div>
                  </motion.div>

                  <motion.div
                    animate={{ y: [0, 15, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute bottom-12 right-12 p-5 bg-white/80 backdrop-blur-2xl border border-white/40 rounded-3xl shadow-2xl w-64 hidden lg:block"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-primary/20">
                        <img src="https://i.pravatar.cc/100?img=12" alt="Real Estate Agent Profile" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-on-surface">Alex Wright</span>
                        <span className="text-[9px] font-mono text-on-surface-variant/65 uppercase tracking-wider">Principal Broker</span>
                      </div>
                    </div>
                    <p className="text-[11px] font-normal text-on-surface-variant/80 italic leading-snug">
                      "Just closed the ₹100 Cr Penthouse deal. Thanks to the automated pipeline tracking!"
                    </p>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="py-24 border-y border-surface-container/50 bg-white/30 backdrop-blur-md overflow-hidden relative flex flex-col items-center">
          <div className="w-full">
            <p className="text-[10px] font-mono text-on-surface-variant/60 uppercase tracking-[0.2em] text-center mb-12">The operating system for modern brokerages</p>
            <div className="flex w-full overflow-hidden [mask-image:_linear-gradient(to_right,transparent_0,_black_128px,_black_calc(100%-128px),transparent_100%)]">
              <motion.div 
                className="flex items-center gap-16 lg:gap-32 whitespace-nowrap opacity-40 hover:opacity-100 transition-opacity duration-500"
                animate={{ x: ["0%", "-50%"] }}
                transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
              >
                {[...Array(2)].map((_, idx) => (
                  <React.Fragment key={idx}>
                    {['VANGUARD', 'SKYLINE', 'NEXUS RE', 'PRISM', 'ESTATE.CO', 'LUMINA', 'APEX', 'ZENITH'].map(brand => (
                      <span key={brand + idx} className="text-2xl md:text-3xl font-bold tracking-tight text-on-surface-variant/50 inline-block">{brand}</span>
                    ))}
                  </React.Fragment>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Bento */}
        <section id="features" className="py-44 px-8 lg:px-16 relative">
          <div className="max-w-7xl mx-auto">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={containerVariants}
              className="text-center mb-28"
            >
              <motion.h2 variants={itemVariants} className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 tracking-tight text-on-surface leading-tight">Everything you need to scale your brokerage.</motion.h2>
              <motion.p variants={itemVariants} className="text-on-surface-variant max-w-2xl mx-auto text-lg font-normal leading-relaxed opacity-90">
                Stop using generic tools. EstateFlow is engineered specifically for the unique workflows of the modern real estate professional.
              </motion.p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              <motion.div 
                whileHover={{ y: -5 }}
                className="md:col-span-8 group relative rounded-3xl p-10 bg-white border border-gray-200/80 shadow-sm overflow-hidden transition-all duration-300"
              >
                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-8">
                    <span className="text-[10px] font-mono tracking-widest text-on-surface-variant/60">MODULE // PIPELINES</span>
                    <span className="text-[10px] font-mono bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded">Core Feature</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-4 tracking-tight">Clinical Deal Pipelines</h3>
                  <p className="text-on-surface-variant/80 mb-8 max-w-md text-sm leading-relaxed font-normal">
                    Proprietary drag-and-drop mechanics with automated triggers. Manage thousands of deals without a single misstep.
                  </p>
                  <div className="rounded-2xl overflow-hidden border border-surface-container-high shadow-2xl group-hover:scale-[1.01] transition-transform duration-700 bg-white">
                    {/* Browser Chrome */}
                    <div className="bg-surface-container px-4 py-3 border-b border-surface-container-high flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
                      <span className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
                      <span className="text-[10px] font-mono text-on-surface-variant/40 ml-4">estateflow.co/pipelines</span>
                    </div>
                    <img className="w-full h-80 object-cover" src="/images/pipeline.png" alt="Pipeline" />
                  </div>
                </div>
              </motion.div>

              <motion.div 
                whileHover={{ y: -5 }}
                className="md:col-span-4 rounded-3xl p-10 bg-indigo-950 text-white shadow-xl flex flex-col transition-all duration-500 border border-indigo-900 justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-8">
                    <span className="text-[10px] font-mono tracking-widest text-indigo-300">COLLABORATION // ROUTING</span>
                    <span className="text-[10px] font-mono bg-indigo-900/50 text-indigo-200 border border-indigo-800 px-2 py-0.5 rounded">Active</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-4 tracking-tight">Team Intelligence</h3>
                  <p className="text-indigo-200/80 mb-8 text-sm leading-relaxed font-normal">
                    Global leaderboards, territory management, and automated lead routing for high-performance teams.
                  </p>
                </div>
                <div className="pt-6 border-t border-indigo-900/60">
                  <div className="flex -space-x-2.5 mb-6">
                    {[32, 44, 47, 51].map(i => (
                      <div key={i} className="w-10 h-10 rounded-full border-2 border-indigo-950 bg-white/10 overflow-hidden shadow-lg">
                        <img src={`https://i.pravatar.cc/100?img=${i}`} alt="Agent" />
                      </div>
                    ))}
                    <div className="w-10 h-10 rounded-full border-2 border-indigo-950 bg-indigo-900 flex items-center justify-center text-[10px] font-bold shadow-lg">+24</div>
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-indigo-300/70">
                    <span>Active Brokers</span>
                    <span>99.9% Uptime</span>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                whileHover={{ y: -5 }}
                className="md:col-span-4 rounded-3xl p-10 bg-[#F9FAFB] hover:bg-white border border-gray-200/60 shadow-sm transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-8">
                    <span className="text-[10px] font-mono tracking-widest text-on-surface-variant/60">METRICS // ATTRIBUTION</span>
                    <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded">Real-time</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-4 tracking-tight">Advanced KPI Engine</h3>
                  <p className="text-on-surface-variant/80 text-sm leading-relaxed font-normal mb-8">
                    Deep attribution modeling to track every dollar of ROI from lead source to final commission.
                  </p>
                </div>
                <div className="border-t border-gray-100 pt-6">
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-on-surface-variant/60">Avg. Close Rate</span>
                      <span className="font-bold text-emerald-600">+12.4%</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-on-surface-variant/60">Cost Per Acquisition</span>
                      <span className="font-bold text-on-surface">-18.2%</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                whileHover={{ y: -5 }}
                className="md:col-span-8 relative rounded-3xl p-10 bg-on-surface text-white overflow-hidden transition-all duration-500 group flex flex-col justify-between min-h-[320px]"
              >
                <div>
                  <div className="flex justify-between items-center mb-8">
                    <span className="text-[10px] font-mono tracking-widest text-white/40">MAPPING // ATTRIBUTION</span>
                    <span className="text-[10px] font-mono bg-white/10 text-white/80 border border-white/20 px-2 py-0.5 rounded">GPS Ready</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-4 tracking-tight">Geographic Insights</h3>
                  <p className="text-white/60 max-w-sm text-sm leading-relaxed font-normal mb-8">
                    Map-based performance hotspots and property value velocity across your entire territory.
                  </p>
                </div>
                {/* Abstract UI Elements */}
                <div className="absolute right-0 bottom-0 w-1/2 group-hover:scale-105 transition-transform duration-700">
                  <div className="bg-white/5 backdrop-blur-xl rounded-tl-3xl p-8 border-t border-l border-white/10">
                    <div className="space-y-4">
                      {[
                        { label: 'Zone A (West)', val: '80%' },
                        { label: 'Zone B (Downtown)', val: '60%' },
                        { label: 'Zone C (Suburbs)', val: '95%' }
                      ].map((zone, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono text-white/50">
                            <span>{zone.label}</span>
                            <span>{zone.val}</span>
                          </div>
                          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }} 
                              whileInView={{ width: zone.val }} 
                              transition={{ duration: 1.5, delay: i * 0.1 }} 
                              className="h-full bg-primary rounded-full" 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* AI Assistance */}
        <section className="py-24 lg:py-32 px-8 lg:px-16 relative bg-surface-container-low border-y border-surface-container">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <span className="text-[10px] font-mono tracking-widest text-primary uppercase mb-4 block">Smart Automation</span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight text-on-surface">Work smarter, not harder.</h2>
              <p className="text-on-surface-variant/80 text-base md:text-lg font-normal max-w-2xl mx-auto leading-relaxed">
                From drafting client emails to predictive lead scoring, EstateFlow AI works silently in the background so you can focus on closing.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { 
                  tag: 'INTELLIGENCE / 01', 
                  title: 'Predictive Scoring', 
                  desc: 'Our AI analyzes over 50 real-time data points to score your leads and prioritize the hottest opportunities automatically.',
                  status: 'Active',
                  icon: 'temp_preferences_custom'
                },
                { 
                  tag: 'OUTBOUND / 02', 
                  title: 'Smart Outreach', 
                  desc: 'Generate personalized emails and text messages instantly based on client history and property preferences.',
                  status: 'Ready',
                  icon: 'auto_awesome'
                },
                { 
                  tag: 'ANALYTICS / 03', 
                  title: 'Market Anomalies', 
                  desc: 'Get alerted immediately when property values in your farm area shift unexpectedly or when a hot lead goes cold.',
                  status: 'Monitoring',
                  icon: 'query_stats'
                }
              ].map((item, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: idx * 0.1 }}
                  viewport={{ once: true }}
                  className="group relative bg-[#F9FAFB] hover:bg-white p-8 rounded-2xl border border-gray-200/60 hover:border-primary/20 transition-all duration-300 flex flex-col justify-between h-[320px] shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] cursor-pointer"
                >
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-[10px] font-mono tracking-widest text-on-surface-variant/60">{item.tag}</span>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-surface-container text-on-surface-variant/80 border border-surface-container-high">{item.status}</span>
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-on-surface tracking-tight flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">{item.icon}</span>
                      {item.title}
                    </h3>
                    <p className="text-sm text-on-surface-variant/80 font-normal leading-relaxed">{item.desc}</p>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto text-xs font-mono text-on-surface-variant/50 group-hover:text-primary transition-colors">
                    <span>Explore integration</span>
                    <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow & Mobile App */}
        <section className="py-32 lg:py-44 px-8 lg:px-16 relative overflow-hidden bg-on-surface text-white">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/10 blur-[100px] rounded-full -z-10" />
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
            <motion.div 
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="flex-1 text-center lg:text-left"
            >
              <span className="text-[10px] font-mono tracking-widest text-primary uppercase mb-4 block">Mobile App</span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight leading-tight">Your office, wherever you are.</h2>
              <p className="text-white/80 text-base md:text-lg font-normal leading-relaxed mb-10 max-w-xl mx-auto lg:mx-0">
                Never miss an opportunity because you're away from your desk. EstateFlow Mobile gives you complete access to your pipeline, contacts, and tasks directly from your smartphone.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button className="px-6 py-3 bg-white text-on-surface rounded-xl font-bold text-sm hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors shadow-md shadow-white/5">
                  <span className="material-symbols-outlined text-[20px]">apple</span>
                  App Store
                </button>
                <button className="px-6 py-3 bg-white/10 text-white border border-white/20 rounded-xl font-bold text-sm hover:bg-white/20 transition-colors flex items-center justify-center gap-2 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">android</span>
                  Play Store
                </button>
              </div>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className="flex-1 relative w-full flex justify-center lg:justify-end"
            >
              <div className="relative group">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary to-secondary blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-500 rounded-full" />
                <img 
                  src="/images/mobile.png" 
                  alt="EstateFlow Mobile App" 
                  className="relative z-10 w-full max-w-[360px] h-auto object-cover rounded-[48px] border-[8px] border-surface-container-highest shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] transition-transform duration-700 hover:scale-[1.02]"
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* Integrations */}
        <section className="py-24 lg:py-32 bg-[#F9FAFB] border-y border-gray-200/60">
          <div className="max-w-7xl mx-auto px-8 lg:px-16">
            <div className="text-center mb-16">
              <span className="text-[10px] font-mono tracking-widest text-primary uppercase mb-3 block">Ecosystem</span>
              <h3 className="text-2xl md:text-3xl font-bold text-on-surface tracking-tight">Seamlessly connects with your tools</h3>
              <p className="text-on-surface-variant/80 text-sm mt-3 max-w-xl mx-auto">
                Sync data across your entire toolkit. No custom APIs, no complex setups, just clean synchronization.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
              {[
                { name: 'Zillow', icon: 'home', desc: 'Lead imports' },
                { name: 'DocuSign', icon: 'history_edu', desc: 'E-signatures' },
                { name: 'Mailchimp', icon: 'mail', desc: 'Email campaigns' },
                { name: 'Google', icon: 'dns', desc: 'Sync calendar' },
                { name: 'Slack', icon: 'chat', desc: 'Instant alerts' },
                { name: 'Zapier', icon: 'hub', desc: '1000+ triggers' }
              ].map((item, idx) => (
                <motion.div 
                  key={item.name}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.05 }}
                  viewport={{ once: true }}
                  className="bg-white p-6 rounded-2xl border border-gray-200/50 hover:border-primary/20 hover:shadow-sm transition-all duration-300 flex flex-col items-center text-center cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-on-surface-variant/70 group-hover:bg-primary/5 group-hover:text-primary transition-colors mb-4">
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  </div>
                  <span className="text-sm font-bold text-on-surface tracking-tight mb-1">{item.name}</span>
                  <span className="text-[11px] font-mono text-on-surface-variant/50">{item.desc}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-44 relative bg-surface-container-low">
          <div className="max-w-7xl mx-auto px-8 lg:px-16">
            <div className="text-center mb-24">
              <span className="text-[10px] font-mono tracking-widest text-primary mb-4 block">PROOF // CLIENT REVIEWS</span>
              <h2 className="text-3xl md:text-4xl font-bold text-on-surface tracking-tight">What top agents are saying.</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((t, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white p-8 rounded-2xl border border-gray-200/60 shadow-sm flex flex-col justify-between h-[360px]"
                >
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-[10px] font-mono tracking-widest text-on-surface-variant/40">FEEDBACK // {String(i + 1).padStart(2, '0')}</span>
                      <div className="flex gap-0.5 text-primary">
                        {[1,2,3,4,5].map(s => <span key={s} className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>)}
                      </div>
                    </div>
                    <p className="text-base font-normal text-on-surface-variant/90 leading-relaxed mb-8 italic">
                      "{t.text}"
                    </p>
                  </div>
                  <div className="mt-auto flex items-center gap-3 pt-6 border-t border-gray-100">
                    <img src={t.img} className="w-10 h-10 rounded-full object-cover border border-gray-200" alt={t.name} />
                    <div>
                      <p className="text-sm font-bold text-on-surface leading-tight">{t.name}</p>
                      <p className="text-[10px] font-mono text-on-surface-variant/60 tracking-wider">{t.role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Privacy & Security */}
        <section className="py-24 lg:py-32 px-8 lg:px-16 bg-on-surface text-white text-center">
          <div className="max-w-4xl mx-auto">
            <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-8">
              <span className="material-symbols-outlined text-primary text-[24px]">verified_user</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 tracking-tight">Uncompromised Privacy & Security</h2>
            <p className="text-white/75 text-base md:text-lg font-normal leading-relaxed mb-12 max-w-2xl mx-auto">
              Bank-level 256-bit AES encryption. Your data is stored on secure, redundant servers with 99.9% uptime guaranteed by our Enterprise SLA. Trusted by the most demanding brokerages globally.
            </p>
            <div className="flex flex-wrap justify-center items-center gap-4">
              {['SOC 2 Type II', 'ISO 27001', 'GDPR Compliant', 'HIPAA Ready'].map(cert => (
                <div key={cert} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono uppercase tracking-wider text-white/80">
                  {cert}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-44 bg-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-8 lg:px-16">
            <div className="text-center mb-28">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 tracking-tight text-on-surface leading-tight">Simple, transparent pricing.</h2>
              
              <div className="flex justify-center items-center gap-6 mt-16">
                <span className={`text-xs font-mono tracking-widest ${!isYearly ? 'text-primary' : 'text-outline'}`}>Monthly</span>
                <button 
                  onClick={() => setIsYearly(!isYearly)}
                  className="w-16 h-9 bg-surface-container rounded-full p-1 transition-colors relative"
                >
                  <motion.div 
                    animate={{ x: isYearly ? 28 : 0 }}
                    className="w-7 h-7 bg-primary rounded-full shadow-lg shadow-primary/30"
                  />
                </button>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-mono tracking-widest ${isYearly ? 'text-primary' : 'text-outline'}`}>Yearly</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[10px] font-mono border border-emerald-500/20 uppercase tracking-wider">Save 20%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { name: 'Agent', price: isYearly ? '2,999' : '3,999', features: ['500 Active Leads', 'Automated Pipelines', 'Basic Analytics', 'Mobile App Access'], btn: 'Select Plan' },
                { name: 'Brokerage', price: isYearly ? '7,999' : '9,999', features: ['Unlimited Leads', 'AI Lead Scoring', 'Multi-Team Routing', 'Full API Access', 'Custom Branding'], btn: 'Start Free Trial', popular: true },
                { name: 'Enterprise', price: 'Custom', features: ['Dedicated Success Manager', 'Custom 3rd Party Integrations', 'Global SSO & Whitelabel', 'On-site Training'], btn: 'Contact Sales' },
              ].map((plan, idx) => (
                <motion.div 
                  key={plan.name} 
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: idx * 0.15 }}
                  whileHover={{ y: -5 }}
                  className={`relative p-8 md:p-10 rounded-2xl bg-white border transition-all duration-300 flex flex-col justify-between min-h-[580px] ${
                    plan.popular ? 'border-primary shadow-lg ring-1 ring-primary/20' : 'border-gray-200/80 shadow-sm'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 bg-primary text-white text-[9px] font-mono tracking-widest rounded-full uppercase shadow-md">
                      RECOMMENDED
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-on-surface tracking-tight">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mb-8">
                      <span className="text-4xl font-bold text-on-surface tracking-tight">₹{plan.price}</span>
                      {plan.price !== 'Custom' && <span className="text-on-surface-variant/60 font-mono text-xs">/month</span>}
                    </div>
                    <ul className="space-y-4 mb-8">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-center gap-3 text-sm font-normal text-on-surface-variant/80">
                          <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button 
                    onClick={() => navigate('/auth')}
                    className={`w-full py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-200 ${
                      plan.popular 
                        ? 'bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary-dark' 
                        : 'bg-on-surface text-white hover:bg-primary'
                    }`}
                  >
                    {plan.btn}
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-44 px-8 lg:px-16 max-w-4xl mx-auto relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full aspect-square bg-primary/5 rounded-full blur-[160px] -z-10" />
          <div className="text-center mb-24">
            <span className="text-[11px] font-black uppercase tracking-[0.4em] text-primary mb-6 block">Deep Dive</span>
            <h2 className="text-4xl md:text-5xl font-black text-on-surface tracking-tight">Essential Intel.</h2>
          </div>
          <div className="space-y-2">
            {faqs.map((faq, idx) => (
              <motion.div 
                key={idx} 
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                viewport={{ once: true }}
                className="border-b border-gray-200/80"
              >
                <button 
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full py-6 flex items-center justify-between text-left transition-colors hover:text-primary group"
                >
                  <span className="text-base md:text-lg font-bold text-on-surface tracking-tight group-hover:text-primary transition-colors">{faq.q}</span>
                  <span className={`material-symbols-outlined text-on-surface-variant transition-transform duration-300 ${openFaq === idx ? 'rotate-180 text-primary' : ''}`}>
                    expand_more
                  </span>
                </button>
                <AnimatePresence>
                  {openFaq === idx && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <div className="pb-6 text-on-surface-variant/80 leading-relaxed text-sm font-normal">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 px-8 lg:px-16 mb-20">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="bg-on-surface rounded-[2rem] p-10 md:p-16 lg:p-24 text-center relative overflow-hidden shadow-2xl max-w-7xl mx-auto"
          >
            {/* Animated Orbs for CTA */}
            <motion.div 
              animate={{ 
                scale: [1, 1.3, 1],
                rotate: [0, 180, 0],
              }}
              transition={{ duration: 15, repeat: Infinity }}
              className="absolute top-[-50%] right-[-30%] w-full aspect-square bg-primary/10 rounded-full blur-[140px]" 
            />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight leading-tight">Ready to transform your business?</h2>
              <p className="text-white/80 font-normal text-base md:text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
                Join thousands of real estate professionals who are already using EstateFlow to streamline their operations and close more deals.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button 
                  onClick={() => navigate('/auth')}
                  className="px-8 py-4 bg-primary text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-primary-dark active:scale-[0.98] transition-all duration-200 shadow-lg shadow-primary/20"
                >
                  Start Free Trial
                </button>
                <button className="px-8 py-4 bg-white/5 backdrop-blur-md border border-white/20 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-white hover:text-on-surface active:scale-[0.98] transition-all duration-200">
                  Book a Demo
                </button>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
};
