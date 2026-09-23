import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { propertiesService, type Property } from '../services/properties.service';
import toast from 'react-hot-toast';

export const PropertyDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [showEditModal, setShowEditModal] = useState(false);

  // Edit Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [sqft, setSqft] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [bedrooms, setBedrooms] = useState('0');
  const [bathrooms, setBathrooms] = useState('0');
  const [yearBuilt, setYearBuilt] = useState('');
  const [imageUrls, setImageUrls] = useState('');
  const [type, setType] = useState('Single Family');

  useEffect(() => {
    if (!id) return;
    const fetchProperty = async () => {
      setLoading(true);
      try {
        const res = await propertiesService.getPropertyById(id);
        if (res.success) {
          setProperty(res.data);
          setName(res.data.name);
          setPrice(res.data.price.toString());
          setSqft(res.data.sqft.toString());
          setLocation(res.data.location);
          setDescription(res.data.description || '');
          setBedrooms(res.data.bedrooms?.toString() || '0');
          setBathrooms(res.data.bathrooms?.toString() || '0');
          setYearBuilt(res.data.yearBuilt?.toString() || '');
          setImageUrls(res.data.images?.join(', ') || '');
          setType(res.data.type);
        }
      } catch (error) {
        toast.error('Failed to load property details');
      } finally {
        setLoading(false);
      }
    };
    fetchProperty();
  }, [id]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Listing link copied to clipboard!');
  };

  const handleUpdate = async () => {
    if (!id || !property) return;
    try {
      const res = await propertiesService.updateProperty(id, {
        name,
        price: parseFloat(price),
        sqft: parseInt(sqft),
        location,
        description,
        bedrooms: parseInt(bedrooms),
        bathrooms: parseInt(bathrooms),
        yearBuilt: parseInt(yearBuilt),
        images: imageUrls.split(',').map(s => s.trim()).filter(s => s !== ''),
        type,
        version: property.version,
      });
      if (res.success) {
        setProperty(res.data);
        setShowEditModal(false);
        toast.success('Property updated successfully');
      }
    } catch (error) {
      toast.error('Failed to update property');
    }
  };

  if (loading) return (
    <div className="p-20 text-center font-bold text-outline">Loading high-resolution property data...</div>
  );

  if (!property) return (
    <div className="p-20 text-center font-bold text-outline">Property not found.</div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' as any }}
      className="p-8 max-w-7xl mx-auto w-full"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/properties')}
            className="w-12 h-12 rounded-2xl bg-white border border-outline-variant flex items-center justify-center text-outline hover:text-primary hover:border-primary transition-all shadow-sm"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-3xl font-black text-on-surface tracking-tight">{property.name}</h2>
              <span className={`chip ${property.status === 'Sold' ? 'chip-red' : property.status === 'Pending' ? 'chip-amber' : 'chip-emerald'}`}>{property.status}</span>
            </div>
            <p className="text-outline font-medium text-sm flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-primary">location_on</span> {property.location}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowEditModal(true)} className="btn-secondary py-2.5 px-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">edit</span> Edit Property
          </button>
          <button onClick={handleShare} className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
            <span className="material-symbols-outlined text-[20px]">share</span> Share Listing
          </button>
        </div>
      </section>

      {/* Hero Image Gallery */}
      <section className="grid grid-cols-12 gap-4 mb-8 h-[500px]">
        <div className="col-span-8 rounded-3xl overflow-hidden shadow-2xl relative group">
          <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src={property.images?.[0] || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80'} alt="Hero" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
        </div>
        <div className="col-span-4 flex flex-col gap-4">
          <div className="flex-1 rounded-3xl overflow-hidden shadow-lg group">
            <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src={property.images?.[1] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'} alt="Gallery 1" />
          </div>
          <div className="flex-1 rounded-3xl overflow-hidden shadow-lg group relative">
            <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src={property.images?.[2] || 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=800&q=80'} alt="Gallery 2" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <span className="text-white font-black text-sm uppercase tracking-widest">+12 More Photos</span>
            </div>
          </div>
        </div>
      </section>

      {/* Content Grid */}
      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-8 space-y-8">
          {/* Key Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Price', val: `₹${Number(property.price).toLocaleString('en-IN')}`, icon: 'payments' },
              { label: 'Square Feet', val: `${property.sqft} sqft`, icon: 'square_foot' },
              { label: 'Bedrooms', val: property.bedrooms?.toString() || '0', icon: 'bed' },
              { label: 'Bathrooms', val: property.bathrooms?.toString() || '0', icon: 'bathtub' },
            ].map(stat => (
              <div key={stat.label} className="card p-5 text-center">
                <span className="material-symbols-outlined text-primary mb-2 text-2xl">{stat.icon}</span>
                <p className="text-[10px] font-black text-outline uppercase tracking-widest">{stat.label}</p>
                <p className="text-lg font-black text-on-surface mt-1">{stat.val}</p>
              </div>
            ))}
          </div>

          {/* Details & Description */}
          <div className="card overflow-hidden">
             <div className="flex border-b border-outline-variant px-6 bg-surface-container-low">
              {['Overview', 'Amenities', 'Floor Plans', 'History'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 font-black text-xs uppercase tracking-widest transition-all relative ${
                    activeTab === tab ? 'text-primary' : 'text-outline hover:text-on-surface'
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div layoutId="propTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
              ))}
            </div>
            <div className="p-8">
              {activeTab === 'Overview' && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-on-surface">About the Residence</h3>
                    <p className="text-on-surface-variant font-medium leading-relaxed">
                      {property.description}
                    </p>
                  </div>
                  <div className="pt-8 border-t border-outline-variant grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="text-sm font-black text-on-surface uppercase tracking-widest">Property Details</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm font-medium">
                          <span className="text-outline">Type</span>
                          <span className="text-on-surface">{property.type}</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium">
                          <span className="text-outline">Year Built</span>
                          <span className="text-on-surface">{property.yearBuilt}</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium">
                          <span className="text-outline">Status</span>
                          <span className="text-on-surface">{property.status}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-sm font-black text-on-surface uppercase tracking-widest">Elite Features</h4>
                      <div className="flex flex-wrap gap-2">
                        {['High Ceilings', 'Wine Cellar', 'Smart Home'].map(f => (
                          <span key={f} className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-surface-container rounded-full text-outline">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {activeTab !== 'Overview' && (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-3xl text-outline-variant">upcoming</span>
                  </div>
                  <p className="text-sm font-bold text-on-surface">{activeTab} Details Coming Soon</p>
                  <p className="text-xs text-outline mt-1">Our team is preparing high-resolution assets for this property.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          {/* Assigned Agent */}
          <div className="card p-8 text-center">
            <h4 className="text-[10px] font-black text-outline uppercase tracking-widest mb-6">Listing Agent</h4>
            <div className="flex flex-col items-center gap-4">
              <img className="w-24 h-24 rounded-3xl object-cover border-4 border-white shadow-xl" src="https://i.pravatar.cc/100?img=44" alt="Agent" />
              <div>
                <h5 className="text-lg font-black text-on-surface">Sarah Jenkins</h5>
                <p className="text-sm font-bold text-primary">Luxury Specialist</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-8">
              <button className="btn-secondary py-3 text-[10px] font-black uppercase tracking-widest">Call Agent</button>
              <button className="bg-primary text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/10">Inquiry</button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card p-8">
            <h4 className="text-[10px] font-black text-outline uppercase tracking-widest mb-6">Elite Management</h4>
            <div className="space-y-4">
              {[
                { label: 'Schedule Showing', icon: 'event' },
                { label: 'Market Valuation', icon: 'trending_up' },
                { label: 'Document Vault', icon: 'folder_open' },
                { label: 'Compliance Review', icon: 'verified_user' },
              ].map(action => (
                <button key={action.label} className="w-full flex items-center gap-4 p-4 bg-surface-container-low rounded-2xl border border-outline-variant hover:border-primary group transition-all">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-outline group-hover:text-primary shadow-sm transition-colors">
                    <span className="material-symbols-outlined text-[20px]">{action.icon}</span>
                  </div>
                  <span className="text-sm font-bold text-on-surface">{action.label}</span>
                  <span className="material-symbols-outlined ml-auto text-sm text-outline group-hover:translate-x-1 transition-transform">chevron_right</span>
                </button>
              ))}
            </div>
          </div>

          {/* Map Preview */}
          <div className="card h-64 overflow-hidden relative group cursor-pointer">
            <img className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=800&q=80" alt="Map" />
            <div className="absolute inset-0 bg-primary/10 group-hover:bg-primary/20 transition-colors"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-2xl">
                <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
              </div>
            </div>
            <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-3 rounded-xl border border-white/40 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-on-surface">Open Interactive Map</span>
              <span className="material-symbols-outlined text-sm">open_in_new</span>
            </div>
          </div>
        </div>
      </div>
      {/* Edit Property Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 md:p-8 text-center">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm" 
                onClick={() => setShowEditModal(false)} 
              />
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95 }} 
                className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden text-left flex flex-col max-h-[90vh]"
              >
                {/* Modal Header */}
                <div className="p-8 pb-0 shrink-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-black text-on-surface">Edit Property Details</h3>
                      <p className="text-sm font-medium text-outline mt-1">Refine listing information for the elite market.</p>
                    </div>
                    <button 
                      onClick={() => setShowEditModal(false)}
                      className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors"
                    >
                      <span className="material-symbols-outlined text-outline">close</span>
                    </button>
                  </div>
                </div>

                {/* Modal Content - Scrollable */}
                <div className="p-8 pt-6 overflow-y-auto custom-scrollbar flex-1">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-outline">Property Title</label>
                      <input value={name} onChange={e => setName(e.target.value)} className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all" />
                    </div>
                    <div className="col-span-2 md:col-span-1 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-outline">Listing Price (₹)</label>
                      <input value={price} onChange={e => setPrice(e.target.value)} className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all" />
                    </div>
                    <div className="col-span-2 md:col-span-1 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-outline">Square Footage</label>
                      <input value={sqft} onChange={e => setSqft(e.target.value)} className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all" />
                    </div>
                    <div className="col-span-2 md:col-span-1 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-outline">Property Type</label>
                      <select value={type} onChange={e => setType(e.target.value)} className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all">
                        <option>Single Family</option>
                        <option>Villa</option>
                        <option>Penthouse</option>
                        <option>Mansion</option>
                        <option>Apartment</option>
                        <option>Loft</option>
                      </select>
                    </div>
                    <div className="col-span-2 md:col-span-1 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-outline">Bedrooms</label>
                      <input type="number" value={bedrooms} onChange={e => setBedrooms(e.target.value)} className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all" />
                    </div>
                    <div className="col-span-2 md:col-span-1 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-outline">Bathrooms</label>
                      <input type="number" value={bathrooms} onChange={e => setBathrooms(e.target.value)} className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all" />
                    </div>
                    <div className="col-span-2 md:col-span-1 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-outline">Year Built</label>
                      <input type="number" value={yearBuilt} onChange={e => setYearBuilt(e.target.value)} className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all" />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-outline">Location Address</label>
                      <input value={location} onChange={e => setLocation(e.target.value)} className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all" />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-outline">Image URLs (comma separated)</label>
                      <input value={imageUrls} onChange={e => setImageUrls(e.target.value)} className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all" />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-outline">Description</label>
                      <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all resize-none" />
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-8 pt-4 bg-white border-t border-outline-variant shrink-0">
                  <div className="flex gap-4">
                    <button onClick={() => setShowEditModal(false)} className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-outline hover:text-on-surface hover:bg-surface-container transition-all">Cancel</button>
                    <button onClick={handleUpdate} className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">Save Changes</button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
