import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MenuItem } from '../types';
import { Loader2, Search, Mic, Sparkles, Percent, Award, Utensils, Flame, Leaf, ChevronRight, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HomeSectionProps {
  onGoToMenu: () => void;
}

export default function HomeSection({ onGoToMenu }: HomeSectionProps) {
  const [videoLoaded, setVideoLoaded] = useState(false);

  return (
    <section className="space-y-0 pb-24 overflow-hidden">
      {/* VIBRANT HEADER SECTION */}
      <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-white pb-6 pt-20 md:pt-12 md:px-4 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <motion.div 
            animate={{ y: [0, -20, 0], x: [0, 10, 0], opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 5, repeat: Infinity }}
            className="absolute top-10 left-10 text-white"
          >
            <Sparkles className="w-8 h-8" />
          </motion.div>
          <motion.div 
            animate={{ scale: [1, 1.2, 1], rotate: [0, 45, 0] }}
            transition={{ duration: 7, repeat: Infinity }}
            className="absolute bottom-20 right-10 text-white"
          >
            <Sparkles className="w-12 h-12" />
          </motion.div>
        </div>

        <div className="max-w-4xl mx-auto px-6 space-y-4 md:space-y-6 relative z-10 text-center">
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none mb-2">Supreme Kitchen</h2>
          <p className="text-white/60 text-sm font-medium italic">Experience the art of fine dining and quick bites.</p>
        </div>
      </div>

      {/* OFFERS MARQUEE BAR */}
      <div className="bg-primary overflow-hidden py-3 border-y border-white/10 relative shadow-lg">
        <motion.div 
          animate={{ x: [0, -1000] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="flex whitespace-nowrap items-center gap-12"
        >
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="flex items-center gap-4 text-white font-black uppercase text-[10px] tracking-widest">
              <Percent className="w-4 h-4" />
              <span>Unlock Super Offers</span>
              <Award className="w-4 h-4" />
              <span>Premium Dining</span>
              <Percent className="w-4 h-4" />
              <span>Unlock Supreme Rewards</span>
            </div>
          ))}
        </motion.div>
      </div>

      <div className="space-y-12 md:px-4 py-8">
        {/* Hero Video Section */}
        <div className="max-w-5xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative md:rounded-[40px] overflow-hidden aspect-video bg-bg-sub shadow-2xl shadow-primary/10 md:border border-border-main group cursor-pointer"
            onClick={onGoToMenu}
          >
            <video 
              src="https://oozhykbdjcrgjooaulwt.supabase.co/storage/v1/object/public/droplink-files/741261/Indian_meal_combo_202604181804-ezremove.mp4" 
              poster="https://images.unsplash.com/photo-1585937421612-71a005604d41?q=80&w=1920&auto=format&fit=crop"
              className={`w-full h-full object-cover brightness-110 transition-opacity duration-1000 ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
              autoPlay muted loop playsInline preload="auto"
              onLoadedData={() => setVideoLoaded(true)}
            />
          </motion.div>
          
          <div className="mt-8 flex justify-center">
            <button 
              onClick={onGoToMenu}
              className="bg-primary text-white px-10 py-5 rounded-3xl font-black text-sm uppercase tracking-[3px] shadow-2xl shadow-primary/30 hover:bg-slate-950 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3"
            >
              Explore Our Menu
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Grid */}
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-950 p-8 rounded-[32px] border border-white/5 relative overflow-hidden group cursor-pointer" onClick={onGoToMenu}>
             <div className="relative z-10">
                <p className="text-primary text-[10px] font-black uppercase tracking-[4px] mb-2">Quick Access</p>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Hot Items</h3>
                <p className="text-white/40 text-[11px] leading-relaxed max-w-[200px] mb-6 font-medium">Bestsellers that our customers love. Freshly cooked on demand.</p>
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-primary transition-colors">
                   <Sparkles className="w-5 h-5 text-white" />
                </div>
             </div>
             <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-primary/20 blur-[60px] rounded-full group-hover:bg-primary/40 transition-all" />
          </div>
          
          <div className="bg-white p-8 rounded-[32px] border border-border-main relative overflow-hidden group shadow-xl shadow-slate-900/5 cursor-pointer" onClick={onGoToMenu}>
             <div className="relative z-10">
                <p className="text-primary text-[10px] font-black uppercase tracking-[4px] mb-2">New Arrivals</p>
                <h3 className="text-2xl font-black text-text-main uppercase tracking-tighter mb-4">Seasonal Specials</h3>
                <p className="text-text-sub text-[11px] leading-relaxed max-w-[200px] mb-6 font-medium">Try our limited time creations before they disappear!</p>
                <div className="w-10 h-10 bg-bg-sub rounded-xl flex items-center justify-center group-hover:bg-primary transition-colors">
                   <Flame className="w-5 h-5 text-text-main group-hover:text-white transition-colors" />
                </div>
             </div>
             <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-primary/10 blur-[60px] rounded-full group-hover:bg-primary/20 transition-all" />
          </div>
        </div>

        {/* Features Minimal */}
        <div className="pt-12 border-t border-dashed border-border-main flex flex-col md:flex-row items-center justify-center gap-12 md:gap-24 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700">
          {[
            { icon: Utensils, label: 'Fresh Daily' },
            { icon: Flame, label: 'Cooked Hot' },
            { icon: Leaf, label: 'Natural Goods' }
          ].map((badge, i) => (
            <div key={i} className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-bg-sub flex items-center justify-center">
                <badge.icon className="w-6 h-6" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-[3px]">{badge.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
