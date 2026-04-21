import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { MenuItem } from '../types';
import { Plus, Loader2, Star, Search, Mic, Utensils, AlertCircle, ShoppingBag, ChevronLeft, MoreVertical, Menu as MenuIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MenuSectionProps {
  onAddToCart: (item: MenuItem) => void;
  isKitchenOpen?: boolean;
}

export default function MenuSection({ onAddToCart, isKitchenOpen = true }: MenuSectionProps) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('available', true);
      
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Error fetching menu:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const cats = ['All', ...new Set(items.map(i => i.category).filter(Boolean))];
    return cats;
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [items, activeCategory, searchQuery]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Utensils className="w-6 h-6 text-primary" />
          </div>
        </div>
        <p className="text-text-main font-black uppercase tracking-[3px] text-xs animate-pulse">Loading Menu...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* HEADER SECTION - FIXED AT TOP */}
      <div className="sticky top-0 z-[60] bg-white border-b border-gray-100 px-4 pt-6 md:pt-10 pb-3 shadow-sm">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <button className="w-9 h-9 rounded-full flex items-center justify-center bg-white shadow-sm border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all">
               <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            
            <div className="flex-1 relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <Search className="w-4 h-4 text-red-500" />
              </div>
              <input
                type="text"
                placeholder="Search for your favorite dishes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:border-red-500 focus:bg-white transition-all text-sm font-medium"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 p-2">
                <Mic className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <button className="w-9 h-9 rounded-full flex items-center justify-center bg-white shadow-sm border border-gray-100">
               <MoreVertical className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          <div className="flex items-center justify-between">
             <h2 className="text-sm font-black text-gray-900 tracking-tight uppercase opacity-60">Recommended</h2>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 pb-24">
        {/* CATEGORY CHIPS SHOWN HORIZONTALLY */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-4 mb-2">
           {categories.map((cat) => (
             <button
               key={cat}
               onClick={() => setActiveCategory(cat)}
               className={`px-4 py-1.5 rounded-full whitespace-nowrap text-[10px] font-black uppercase tracking-widest transition-all border ${
                 activeCategory === cat 
                   ? 'bg-red-50 text-red-600 border-red-200 shadow-sm' 
                   : 'bg-white text-gray-600 border-gray-200'
               }`}
             >
               {cat}
             </button>
           ))}
        </div>

        <div className="space-y-0">
           {filteredItems.map((item, idx) => (
             <motion.div
               key={item.id}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: idx * 0.05 }}
               className="py-10 border-b border-dashed border-gray-200 last:border-0 flex gap-6"
             >
               {/* CONTENT BLOCK */}
               <div className="flex-1 space-y-3">
                 <div className="flex items-start gap-2">
                    {/* VEG/NON-VEG MARKER */}
                    <div className={`w-4 h-4 border-2 rounded p-[2px] flex-shrink-0 mt-0.5 ${
                      item.name?.toLowerCase().includes('chicken') ? 'border-red-600' : 'border-green-600'
                    }`}>
                      <div className={`w-full h-full rounded-full ${
                        item.name?.toLowerCase().includes('chicken') ? 'bg-red-600' : 'bg-green-600'
                      }`} />
                    </div>
                 </div>

                 <div>
                    <h3 className="text-lg font-black text-gray-900 leading-tight mb-1">{item.name}</h3>
                    {/* RATING / REORDERED STATUS */}
                    <div className="flex flex-col gap-1 mb-2">
                       <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                             <div className="h-full bg-green-500 w-[70%]" />
                          </div>
                          <span className="text-[10px] font-bold text-gray-500">Highly reordered</span>
                       </div>
                    </div>
                    <p className="text-lg font-black text-gray-900 mb-2">₹{item.price}</p>
                    <p className="text-gray-500 text-xs font-medium leading-relaxed line-clamp-3">
                       {item.description || "Freshly prepared with authentic ingredients for a soul-satisfying taste."}
                    </p>
                 </div>
               </div>

               {/* IMAGE & ADD BUTTON BLOCK */}
               <div className="w-[140px] md:w-[160px] relative flex-shrink-0">
                  <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-2xl shadow-black/5 bg-gray-100 border border-gray-100">
                    <img 
                      src={item.image_url || `https://picsum.photos/seed/${item.name}/300/300`} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  
                  {/* OVERLAY ADD BUTTON */}
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[80%] flex flex-col items-center">
                    <button
                      onClick={() => onAddToCart(item)}
                      disabled={!isKitchenOpen}
                      className="w-full py-2.5 bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-red-100 flex items-center justify-center gap-1 group active:scale-95 transition-all"
                    >
                      <span className="text-red-500 font-black text-xs uppercase tracking-widest">ADD</span>
                      <Plus className="w-3 h-3 text-red-500 font-black" />
                    </button>
                    <span className="text-[8px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">customisable</span>
                  </div>
               </div>
             </motion.div>
           ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-32 space-y-4">
            <Utensils className="w-16 h-16 text-gray-200 mx-auto" />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No matching items found</p>
          </div>
        )}
      </div>

      {/* FLOATING MENU BUTTON */}
      <div className="fixed bottom-24 right-6 z-50">
        <button 
          onClick={() => setShowCategoryMenu(!showCategoryMenu)}
          className="bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl shadow-black/30 flex items-center gap-3 hover:scale-105 active:scale-95 transition-all group"
        >
          <MenuIcon className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
          <span className="text-xs font-black uppercase tracking-widest">Menu</span>
        </button>
      </div>

      {/* CATEGORY SELECTOR DRAWER/OVERLAY */}
      <AnimatePresence>
        {showCategoryMenu && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCategoryMenu(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-[40px] p-10 z-[110] shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase">Jump to Category</h3>
                <div className="w-12 h-1 bg-gray-200 rounded-full" />
              </div>
              <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[60vh] no-scrollbar pb-10">
                 {categories.map((cat) => (
                   <button
                     key={cat}
                     onClick={() => {
                        setActiveCategory(cat);
                        setShowCategoryMenu(false);
                     }}
                     className={`flex items-center justify-between p-6 rounded-2xl transition-all ${
                       activeCategory === cat ? 'bg-red-50 text-red-600 border border-red-100 shadow-sm' : 'bg-gray-50 text-gray-700 border border-transparent hover:bg-white hover:border-gray-200'
                     }`}
                   >
                     <span className="font-black text-sm uppercase tracking-widest">{cat}</span>
                     <span className="text-[10px] font-bold text-gray-400">
                        {items.filter(i => cat === 'All' || i.category === cat).length} Items
                     </span>
                   </button>
                 ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
