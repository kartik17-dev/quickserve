/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Profile, CartItem, MenuItem, Order } from './types';
import Navbar from './components/Navbar';
import AuthForm from './components/AuthForm';
import HomeSection from './components/HomeSection';
import MenuSection from './components/MenuSection';
import CartOverlay from './components/CartOverlay';
import OrderHistory from './components/OrderHistory';
import AdminDashboard from './components/AdminDashboard';
import ActiveOrderTracker from './components/ActiveOrderTracker';
import UserSettings from './components/UserSettings';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, ShoppingBag } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('supreme-kitchen-cart');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error('Error parsing cart:', err);
        return [];
      }
    }
    return [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'menu' | 'orders' | 'admin' | 'tracker' | 'settings'>(() => {
    const saved = localStorage.getItem('supreme-kitchen-view');
    return (saved as any) || 'home';
  });

  // View Persistence
  useEffect(() => {
    localStorage.setItem('supreme-kitchen-view', currentView);
  }, [currentView]);
  const [isKitchenOpen, setIsKitchenOpen] = useState(true);
  const [toasts, setToasts] = useState<{ id: string; message: string; item?: MenuItem }[]>([]);

  // Cart Persistence
  useEffect(() => {
    localStorage.setItem('supreme-kitchen-cart', JSON.stringify(cart));
  }, [cart]);

  const addToast = (message: string, item?: MenuItem) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, item }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    // Fetch kitchen status
    fetchKitchenStatus();
    
    // Subscribe to kitchen updates
    const kitchenChannel = supabase
      .channel('kitchen-status-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kitchen_status' }, () => fetchKitchenStatus())
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(kitchenChannel);
    };
  }, []);

  const fetchKitchenStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('kitchen_status')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setIsKitchenOpen(data.is_open);
      }
    } catch (err) {
      console.error('Error fetching kitchen status:', err);
    }
  };

  const fetchProfile = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();
      
      if (error) throw error;
      setProfile(data);
      
      // Auto-redirect admin to scanner on login/refresh
      if (data.role === 'admin') {
        setCurrentView('admin');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) {
        return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { item, quantity: 1 }];
    });
    addToast(`${item.name} added to cart!`, item);
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(i => i.item.id !== id));
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.item.id === id) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen bg-bg text-text-main font-sans">
      <Navbar 
        profile={profile} 
        cartCount={cart.reduce((acc, i) => acc + i.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        currentView={currentView}
        onSetView={setCurrentView}
      />

      <main className="max-w-7xl mx-auto px-0 md:px-4 py-0 md:py-8 mb-20 md:mb-0">
        <AnimatePresence mode="wait">
          {currentView === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <HomeSection onGoToMenu={() => setCurrentView('menu')} />
            </motion.div>
          )}

          {currentView === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {!isKitchenOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-8 p-4 bg-red-50 border border-red-100 rounded-card flex items-center justify-center gap-3"
                >
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <p className="text-red-600 font-black uppercase tracking-widest text-[11px]">Kitchen is currently closed • No new orders accepted</p>
                </motion.div>
              )}
              <MenuSection onAddToCart={addToCart} isKitchenOpen={isKitchenOpen} />
            </motion.div>
          )}

          {currentView === 'orders' && (
            <motion.div
              key="orders"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <OrderHistory profile={profile} />
            </motion.div>
          )}

          {currentView === 'admin' && profile?.role === 'admin' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AdminDashboard />
            </motion.div>
          )}

          {currentView === 'tracker' && (
            <motion.div
              key="tracker"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ActiveOrderTracker profile={profile} onGoToMenu={() => setCurrentView('menu')} />
            </motion.div>
          )}

          {currentView === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <UserSettings profile={profile} onLogout={() => {
                setUser(null);
                setProfile(null);
                setCurrentView('menu');
              }} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <CartOverlay 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQuantity={updateQuantity}
        onRemove={removeFromCart}
        onClear={() => setCart([])}
        profile={profile}
        isKitchenOpen={isKitchenOpen}
        onOrderPlaced={() => {
          setIsCartOpen(false);
          setCurrentView('tracker');
        }}
      />

      {/* Floating Cart Button (Persistent Visibility) */}
      <AnimatePresence>
        {cart.length > 0 && !isCartOpen && (
          <motion.button
            initial={{ scale: 0, y: 100 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, y: 100 }}
            onClick={() => setIsCartOpen(true)}
            className="fixed bottom-24 md:bottom-8 left-8 z-[150] bg-primary text-white p-4 rounded-full shadow-2xl shadow-primary/40 hover:scale-110 active:scale-95 transition-all flex items-center justify-center group"
          >
            <ShoppingBag className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 bg-slate-950 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-primary group-hover:bg-primary transition-colors">
              {cart.reduce((acc, i) => acc + i.quantity, 0)}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Floating Notifications */}
      <div className="fixed bottom-24 md:bottom-8 right-1/2 translate-x-1/2 md:translate-x-0 md:right-8 z-[200] flex flex-col gap-3 pointer-events-none w-[calc(100%-2rem)] md:w-auto">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20, transition: { duration: 0.2 } }}
              className="bg-text-main text-surface px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 w-full md:min-w-[280px] pointer-events-auto border border-white/10"
            >
              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-white/10">
                <img 
                  src={toast.item?.image_url || `https://picsum.photos/seed/${toast.item?.name}/100/100`} 
                  className="w-full h-full object-cover" 
                  alt=""
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-[2px] text-primary mb-0.5">Added to Cart</p>
                <p className="text-xs font-bold truncate max-w-[180px]">{toast.item?.name}</p>
              </div>
              <button 
                onClick={() => setIsCartOpen(true)}
                className="bg-primary px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all ml-2"
              >
                View
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
