import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { propertiesService, type Property } from '../services/properties.service';

export const Properties: React.FC = () => {
  const navigate = useNavigate();
  const [propertyList, setPropertyList] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [sqft, setSqft] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState('Single Family');
  const [bedrooms, setBedrooms] = useState('0');
  const [bathrooms, setBathrooms] = useState('0');
  const [yearBuilt, setYearBuilt] = useState(new Date().getFullYear().toString());
  const [description, setDescription] = useState('');
  const [imageUrls, setImageUrls] = useState('');

  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      try {
        const res = await propertiesService.getProperties();
        if (res.success) setPropertyList(res.data);
      } catch (error) {
        console.error('Failed to fetch properties', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, []);

  const filtered = propertyList.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' as any }}
      className="p-8 space-y-8 max-w-[1600px] mx-auto"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[30px] font-semibold" style={{ color: 'var(--on-surface)', letterSpacing: '-0.02em' }}>
            Property Inventory
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--on-surface-variant)' }}>
            {propertyList.length} exclusive listings in the portfolio
          </p>
        </div>
        <div className="flex gap-3">
           <div className="relative w-64">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-outline">search</span>
            <input
              type="text"
              placeholder="Search properties..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-white border border-outline-variant rounded-xl text-sm font-medium outline-none focus:border-primary transition-all shadow-sm"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all bg-primary shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">add_home</span>
            Add Property
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {loading ? (
          <div className="col-span-full py-40 flex flex-col items-center justify-center gap-4 text-outline">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <p className="font-bold text-sm uppercase tracking-widest">Acquiring Elite Portfolio...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-40 text-center">
            <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl text-outline-variant">home_off</span>
            </div>
            <p className="font-black text-on-surface text-xl">No properties found</p>
            <p className="text-outline text-sm mt-2">Try adjusting your search filters or add a new listing.</p>
          </div>
        ) : (
          filtered.map((property) => (
            <motion.div
              key={property.id}
              whileHover={{ y: -10 }}
              onClick={() => navigate(`/properties/${property.id}`)}
              className="group relative bg-white rounded-[32px] border border-outline-variant/50 hover:border-primary/30 shadow-sm hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 overflow-hidden cursor-pointer"
            >
              <div className="relative h-64 overflow-hidden">
                <img 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out" 
                  src={property.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'} 
                  alt={property.name} 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
                
                <div className="absolute top-5 left-5">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md shadow-lg ${
                    property.status === 'Sold' ? 'bg-red-500/90 text-white' : 
                    property.status === 'Pending' ? 'bg-amber-500/90 text-white' : 
                    'bg-emerald-500/90 text-white'
                  }`}>
                    {property.status}
                  </span>
                </div>

                <div className="absolute top-5 right-5">
                  <button className="w-10 h-10 bg-white/20 backdrop-blur-md text-white rounded-2xl flex items-center justify-center hover:bg-white hover:text-red-500 transition-all border border-white/30">
                    <span className="material-symbols-outlined text-[22px]">favorite</span>
                  </button>
                </div>

                <div className="absolute bottom-5 left-5 right-5 flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-white/70 text-[10px] font-black uppercase tracking-widest">{property.type}</p>
                    <h3 className="text-white text-xl font-black leading-tight tracking-tight">{property.name}</h3>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20">
                    <p className="text-white font-black text-sm">₹{Number(property.price).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-center gap-2 text-outline group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-sm">location_on</span>
                  <p className="text-xs font-bold truncate">{property.location}</p>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-6 border-t border-outline-variant/30">
                  <div className="space-y-1 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-outline">
                      <span className="material-symbols-outlined text-base">bed</span>
                      <span className="text-sm font-black text-on-surface">{Math.max(0, property.bedrooms)}</span>
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-outline-variant">Beds</p>
                  </div>
                  <div className="space-y-1 text-center border-x border-outline-variant/30">
                    <div className="flex items-center justify-center gap-1.5 text-outline">
                      <span className="material-symbols-outlined text-base">bathtub</span>
                      <span className="text-sm font-black text-on-surface">{Math.max(0, property.bathrooms)}</span>
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-outline-variant">Baths</p>
                  </div>
                  <div className="space-y-1 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-outline">
                      <span className="material-symbols-outlined text-base">square_foot</span>
                      <span className="text-sm font-black text-on-surface">{property.sqft}</span>
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-outline-variant">Sqft</p>
                  </div>
                </div>

                <div className="pt-2 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0">
                  <button className="w-full py-3.5 bg-on-surface text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-on-surface/20 active:scale-95 transition-all">
                    View Residence Details
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Add Property Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 md:p-8 text-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm"
                onClick={() => setShowAddModal(false)}
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
                      <h3 className="text-2xl font-black text-on-surface">List New Property</h3>
                      <p className="text-sm font-medium text-outline mt-1">Configure property details for the luxury market.</p>
                    </div>
                    <button 
                      onClick={() => setShowAddModal(false)}
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
                      <input value={title} onChange={e => setTitle(e.target.value)} className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all" placeholder="e.g. The Glass House" />
                    </div>
                    <div className="col-span-2 md:col-span-1 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-outline">Listing Price (₹)</label>
                      <input value={price} onChange={e => setPrice(e.target.value)} className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all" placeholder="e.g. 1500000" />
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
                      <label className="text-[10px] font-black uppercase tracking-widest text-outline">Square Footage (sqft)</label>
                      <input value={sqft} onChange={e => setSqft(e.target.value)} className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all" placeholder="e.g. 5000" />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-outline">Location Address</label>
                      <input value={address} onChange={e => setAddress(e.target.value)} className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all" placeholder="e.g. 123 Luxury Way, Beverly Hills" />
                    </div>
                    <div className="col-span-2 md:col-span-1 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-outline">Bedrooms</label>
                      <input type="number" value={bedrooms} onChange={e => setBedrooms(e.target.value)} className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all" placeholder="e.g. 4" />
                    </div>
                    <div className="col-span-2 md:col-span-1 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-outline">Bathrooms</label>
                      <input type="number" value={bathrooms} onChange={e => setBathrooms(e.target.value)} className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all" placeholder="e.g. 3" />
                    </div>
                    <div className="col-span-2 md:col-span-1 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-outline">Year Built</label>
                      <input type="number" value={yearBuilt} onChange={e => setYearBuilt(e.target.value)} className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all" placeholder="e.g. 2022" />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-outline">Image URLs (comma separated)</label>
                      <input value={imageUrls} onChange={e => setImageUrls(e.target.value)} className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all" placeholder="e.g. https://image1.jpg, https://image2.jpg" />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-outline">Description</label>
                      <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all resize-none" placeholder="Describe the property..." />
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-8 pt-4 bg-white border-t border-outline-variant shrink-0">
                  <div className="flex gap-4">
                    <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-outline hover:text-on-surface hover:bg-surface-container transition-all">Cancel</button>
                    <button onClick={async () => {
                      if (!title || !price) return;
                      try {
                        const res = await propertiesService.createProperty({
                          name: title,
                          location: address,
                          price: parseFloat(price),
                          sqft: parseInt(sqft),
                          bedrooms: parseInt(bedrooms),
                          bathrooms: parseInt(bathrooms),
                          yearBuilt: parseInt(yearBuilt),
                          description,
                          images: imageUrls.split(',').map(s => s.trim()).filter(s => s !== ''),
                          type,
                          status: 'Available',
                        });
                        if (res.success) {
                          setPropertyList([res.data, ...propertyList]);
                          setTitle('');
                          setPrice('');
                          setSqft('');
                          setAddress('');
                          setBedrooms('0');
                          setBathrooms('0');
                          setYearBuilt(new Date().getFullYear().toString());
                          setDescription('');
                          setImageUrls('');
                          setShowAddModal(false);
                        }
                      } catch (error) {
                        console.error('Failed to create property', error);
                      }
                    }} className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">List Property</button>
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
