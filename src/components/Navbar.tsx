import { Profile } from '../types';
import { supabase } from '../lib/supabase';
import { ShoppingBag, History, Settings, LogOut, UtensilsCrossed, Menu as MenuIcon, LayoutDashboard, Radio, User, Home, BookOpen } from 'lucide-react';
import { useState, useEffect } from 'react';

interface NavbarProps {
  profile: Profile | null;
  cartCount: number;
  onOpenCart: () => void;
  currentView: string;
  onSetView: (view: any) => void;
}

export default function Navbar({ profile, cartCount, onOpenCart, currentView, onSetView }: NavbarProps) {
  const [hasActiveOrder, setHasActiveOrder] = useState(false);

  useEffect(() => {
    if (!profile) return;
    
    const checkActiveOrders = async () => {
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .in('status', ['placed', 'preparing', 'ready']);
      
      setHasActiveOrder((count || 0) > 0);
    };

    checkActiveOrders();

    const channel = supabase
      .channel('navbar-tracker')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'orders',
        filter: `user_id=eq.${profile.id}` 
      }, () => checkActiveOrders())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  return (
    <>
      <nav className="hidden md:block bg-white border-b border-border-main sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-10 h-14 md:h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => onSetView('home')}
          >
            <div className="w-9 h-9 md:w-11 md:h-11 flex items-center justify-center transition-transform group-hover:scale-110">
              <img 
                src="https://oozhykbdjcrgjooaulwt.supabase.co/storage/v1/object/public/droplink-files/965324/Untitled%20design%20(2).png" 
                alt="Supreme Kitchen Logo" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="font-black text-base md:text-lg tracking-tight text-text-main group-hover:text-primary transition-colors">Supreme Kitchen</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6 mr-4">
              {[
                { id: 'home', label: 'Home' },
                { id: 'menu', label: 'Menu' },
                { id: 'tracker', label: 'Live Tracking', hasOrders: hasActiveOrder },
                { id: 'orders', label: 'History' },
              ].map(item => (
                <button 
                  key={item.id}
                  onClick={() => onSetView(item.id)}
                  className={`text-[11px] font-black uppercase tracking-widest transition-all relative ${
                    currentView === item.id ? 'text-primary' : 'text-text-sub hover:text-text-main'
                  }`}
                >
                  {item.label}
                  {item.hasOrders && <span className="absolute -top-1 -right-2 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                </button>
              ))}

              {profile?.role === 'admin' && (
                <button 
                  onClick={() => onSetView('admin')}
                  className={`text-[11px] font-black uppercase tracking-widest transition-all ${
                    currentView === 'admin' ? 'text-primary' : 'text-text-sub hover:text-text-main'
                  }`}
                >
                  Admin
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={onOpenCart}
                className="flex items-center gap-2 bg-text-main text-white px-4 h-9 rounded-xl hover:opacity-90 transition-all relative"
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Cart</span>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                    {cartCount}
                  </span>
                )}
              </button>

              <button 
                onClick={() => onSetView('settings')}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border ${
                  currentView === 'settings' 
                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                    : 'bg-bg-sub border-border-main text-text-sub hover:text-text-main hover:border-text-sub'
                }`}
              >
                <User className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation - Zomato Style Refinement */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border-main z-50 flex items-center justify-around h-16 pb-safe px-2">
        {[
          { id: 'home', label: 'Home', icon: Home },
          { id: 'menu', label: 'Menu', icon: BookOpen },
          { id: 'tracker', label: 'Live', icon: Radio, hasOrders: hasActiveOrder },
          { id: 'orders', label: 'History', icon: History },
          ...(profile?.role === 'admin' ? [{ id: 'admin', label: 'Admin', icon: LayoutDashboard }] : []),
          { id: 'settings', label: 'Profile', icon: User },
        ].map(item => (
          <button 
            key={item.id}
            onClick={() => onSetView(item.id)}
            className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${
              currentView === item.id ? 'text-primary scale-110' : 'text-text-sub opacity-70 grayscale'
            }`}
          >
            <item.icon className={`w-5 h-5 ${currentView === item.id ? 'stroke-[3px]' : 'stroke-[2px]'}`} />
            <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
            {item.hasOrders && <span className="absolute top-2 right-1/4 w-2 h-2 rounded-full bg-primary ring-2 ring-white animate-pulse" />}
          </button>
        ))}
      </div>
    </>
  );
}
