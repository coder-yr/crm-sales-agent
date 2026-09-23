import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import channelPartnersService from '../services/channelPartners.service';
import type { ChannelPartner } from '../services/channelPartners.service';
import { toast } from 'react-hot-toast';

const fmt = (v: number) => v >= 10000000 ? `₹${(v / 10000000).toFixed(2)} Cr` : v >= 100000 ? `₹${(v / 100000).toFixed(2)} L` : `₹${(v / 1000).toFixed(0)} K`;

export const ChannelPartners: React.FC = () => {
  const [partners, setPartners] = useState<ChannelPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPartner, setSelectedPartner] = useState<ChannelPartner | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPartner, setNewPartner] = useState({ 
    name: '', 
    contactInfo: '', 
    primaryContact: '', 
    activeAgents: 0, 
    commissionRate: 2.5 
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const response = await channelPartnersService.getAll();
      // response is already the parsed body: { success, data: [...] }
      const list = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
        ? response
        : [];
      setPartners(list);
    } catch (error) {
      toast.error('Failed to fetch channel partners');
      console.error(error);
      setPartners([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartner.name) {
      toast.error('Please enter a partner name');
      return;
    }

    try {
      setSubmitting(true);
      await channelPartnersService.create(newPartner);
      toast.success('Channel partner added successfully');
      setIsModalOpen(false);
      setNewPartner({ 
        name: '', 
        contactInfo: '', 
        primaryContact: '', 
        activeAgents: 0, 
        commissionRate: 2.5 
      });
      fetchPartners();
    } catch (error) {
      toast.error('Failed to add channel partner');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = (partners ?? []).filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.contactInfo && p.contactInfo.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' as any }}
      className="p-8 space-y-8"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[30px] font-semibold" style={{ color: 'var(--on-surface)', letterSpacing: '-0.02em' }}>
            Channel Partners
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--on-surface-variant)' }}>
            Manage your global network of high-performance partner agencies.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="relative w-72">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-outline">search</span>
            <input
              type="text"
              placeholder="Search partners..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-white border border-outline-variant rounded-xl text-sm font-medium outline-none focus:border-primary transition-all shadow-sm"
            />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all bg-primary shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">handshake</span>
            New Partnership
          </button>
        </div>
      </div>

      {/* Partners Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.length > 0 ? (
            filtered.map(partner => (
              <motion.div
                key={partner.id}
                whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(0,0,0,0.08)' }}
                onClick={() => setSelectedPartner(partner)}
                className="card p-6 cursor-pointer group bg-white border border-outline-variant hover:border-primary transition-all"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-surface-container overflow-hidden border border-outline-variant shadow-sm flex items-center justify-center p-2">
                     <span className="material-symbols-outlined text-outline text-3xl">corporate_fare</span>
                  </div>
                  <span className="chip chip-emerald">Active</span>
                </div>
                <h3 className="text-lg font-black text-on-surface mb-1 group-hover:text-primary transition-colors">{partner.name}</h3>
                <p className="text-xs font-bold text-outline uppercase tracking-widest mb-6">{partner.contactInfo || 'No contact info'}</p>
                
                <div className="grid grid-cols-2 gap-4 py-4 border-y border-outline-variant border-dashed">
                  <div>
                    <p className="text-[10px] font-black text-outline uppercase tracking-tight">Trade Volume</p>
                    <p className="text-sm font-black text-on-surface">{fmt(partner.totalSales || 0)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-outline uppercase tracking-tight">Commission</p>
                    <p className="text-sm font-black text-primary">{partner.commissionRate || 2.5}%</p>
                  </div>
                </div>
                
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-sm">groups</span>
                    </div>
                    <span className="text-xs font-bold text-on-surface-variant">{partner.activeAgents || 0} Agents</span>
                  </div>
                  <span className="material-symbols-outlined text-outline group-hover:text-primary group-hover:translate-x-1 transition-all">arrow_forward</span>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full text-center py-20 bg-surface-container-low rounded-3xl border border-dashed border-outline-variant">
              <span className="material-symbols-outlined text-5xl text-outline mb-4">handshake</span>
              <p className="text-on-surface-variant font-medium">No channel partners found.</p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="mt-4 text-primary font-bold text-sm hover:underline"
              >
                Add your first partner
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Partner Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-on-surface tracking-tight">New Partnership</h2>
                  <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-xl hover:bg-surface-container flex items-center justify-center transition-colors">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <form onSubmit={handleCreatePartner} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">Partner Name</label>
                    <input
                      type="text"
                      required
                      value={newPartner.name}
                      onChange={e => setNewPartner({ ...newPartner, name: e.target.value })}
                      placeholder="e.g. Vanguard Realty Group"
                      className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none focus:border-primary transition-all text-sm font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">Contact Info (Address/Location)</label>
                    <input
                      type="text"
                      value={newPartner.contactInfo}
                      onChange={e => setNewPartner({ ...newPartner, contactInfo: e.target.value })}
                      placeholder="e.g. 123 Business Way, Dubai"
                      className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none focus:border-primary transition-all text-sm font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">Primary Contact Person</label>
                    <input
                      type="text"
                      value={newPartner.primaryContact}
                      onChange={e => setNewPartner({ ...newPartner, primaryContact: e.target.value })}
                      placeholder="e.g. Robert Vance (robert@vanguard.com)"
                      className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none focus:border-primary transition-all text-sm font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">Active Agents</label>
                      <input
                        type="number"
                        value={newPartner.activeAgents}
                        onChange={e => setNewPartner({ ...newPartner, activeAgents: parseInt(e.target.value) || 0 })}
                        className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none focus:border-primary transition-all text-sm font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-outline uppercase tracking-widest ml-1">Commission (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={newPartner.commissionRate}
                        onChange={e => setNewPartner({ ...newPartner, commissionRate: parseFloat(e.target.value) || 0 })}
                        className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none focus:border-primary transition-all text-sm font-medium"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                  >
                    {submitting ? 'Creating...' : 'Create Partnership'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Partner Detail Drawer */}
      <AnimatePresence>
        {selectedPartner && (
          <div className="fixed inset-0 z-[100] flex items-center justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
              onClick={() => setSelectedPartner(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-xl h-full bg-white shadow-2xl flex flex-col"
            >
              <div className="p-10 flex-1 overflow-y-auto">
                <header className="flex items-start justify-between mb-12">
                   <div className="flex items-center gap-6">
                      <div className="w-20 h-20 rounded-3xl bg-surface-container flex items-center justify-center border border-outline-variant shadow-lg">
                        <span className="material-symbols-outlined text-4xl text-outline">corporate_fare</span>
                      </div>
                      <div>
                        <h2 className="text-3xl font-black text-on-surface tracking-tight">{selectedPartner.name}</h2>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="chip chip-emerald">Active</span>
                          <span className="text-xs font-bold text-outline uppercase tracking-widest">Partner</span>
                        </div>
                      </div>
                   </div>
                   <button onClick={() => setSelectedPartner(null)} className="w-10 h-10 rounded-xl hover:bg-surface-container flex items-center justify-center transition-colors">
                     <span className="material-symbols-outlined">close</span>
                   </button>
                </header>

                <div className="grid grid-cols-2 gap-8 mb-12">
                   {[
                     { label: 'Primary Contact', val: selectedPartner.primaryContact || 'N/A', icon: 'person' },
                     { label: 'Commission Rate', val: `${selectedPartner.commissionRate || 2.5}%`, icon: 'percent' },
                     { label: 'Active Agents', val: selectedPartner.activeAgents?.toString() || '0', icon: 'badge' },
                     { label: 'Total Sales Vol.', val: fmt(selectedPartner.totalSales || 0), icon: 'trending_up' },
                   ].map(item => (
                     <div key={item.label} className="p-6 bg-surface-container-low rounded-3xl border border-outline-variant">
                       <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-primary shadow-sm mb-4">
                         <span className="material-symbols-outlined text-lg">{item.icon}</span>
                       </div>
                       <p className="text-[10px] font-black text-outline uppercase tracking-widest">{item.label}</p>
                       <p className="text-lg font-black text-on-surface mt-1">{item.val}</p>
                     </div>
                   ))}
                </div>

                <section className="space-y-6">
                  <h3 className="text-sm font-black text-on-surface uppercase tracking-widest">Recent Performance</h3>
                  <div className="card p-6 bg-primary text-white relative overflow-hidden">
                    <div className="relative z-10">
                      <div className="flex justify-between items-center mb-6">
                         <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">Target Achievement</p>
                         <span className="text-xs font-bold">0%</span>
                      </div>
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-4">
                        <motion.div initial={{ width: 0 }} animate={{ width: "0%" }} transition={{ duration: 1 }} className="h-full bg-secondary-fixed shadow-[0_0_12px_rgba(111,251,190,0.5)]" />
                      </div>
                      <p className="text-xs font-medium text-indigo-100">No sales data available yet for this partner.</p>
                    </div>
                    <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
                  </div>
                </section>
              </div>

              <div className="p-8 border-t border-outline-variant bg-surface-container-low flex gap-4">
                <button className="flex-1 py-4 border border-outline-variant rounded-2xl font-black text-xs uppercase tracking-widest text-on-surface hover:bg-white transition-all">Send Message</button>
                <button className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">Export Report</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

