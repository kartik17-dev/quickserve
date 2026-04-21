import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Order, Profile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Package, CheckCircle2, Clock, ChevronRight, CookingPot, Store, Bike, QrCode, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface ActiveOrderTrackerProps {
  profile: Profile | null;
  onGoToMenu: () => void;
}

export default function ActiveOrderTracker({ profile, onGoToMenu }: ActiveOrderTrackerProps) {
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);

  const funQuotes = [
    "The chef is adding secret spices...",
    "Perfecting your meal to your taste!",
    "Quality check in progress...",
    "Almost there! Readying the garnish.",
    "Basking in the aroma of fresh ingredients."
  ];

  useEffect(() => {
    if (!profile) return;
    fetchActiveOrder();

    const channel = supabase
      .channel('live-tracker')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'orders',
          filter: `user_id=eq.${profile.id}`
        },
        () => fetchActiveOrder()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIdx(prev => (prev + 1) % funQuotes.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchActiveOrder = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            menu_items (*)
          )
        `)
        .eq('user_id', profile?.id)
        .in('status', ['placed', 'preparing', 'ready'])
        .not('razorpay_payment_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setActiveOrder(data);
    } catch (err) {
      console.error('Error fetching active order:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const steps = [
    { id: 'placed', label: 'Order Placed', icon: Clock, color: 'text-blue-500' },
    { id: 'scan', label: 'Go to Scanner', icon: QrCode, color: 'text-primary' },
    { id: 'collected', label: 'Collected', icon: CheckCircle2, color: 'text-gray-400' }
  ];

  const getActiveStepIndex = (status: string) => {
    if (status === 'collected') return 2;
    return 1; // Always show "Go to Scanner" as active step after placing
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-text-sub font-medium tracking-tight">Syncing with kitchen...</p>
      </div>
    );
  }

  if (!activeOrder) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="bg-surface rounded-[32px] p-12 border border-border-main shadow-sm">
          <div className="w-20 h-20 bg-bg rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBagIcon className="w-10 h-10 text-border-main" />
          </div>
          <h2 className="text-2xl font-extrabold text-text-main mb-4 tracking-tight uppercase">No active orders</h2>
          <p className="text-text-sub mb-8 font-medium max-w-sm mx-auto">
            You don't have any orders currently being prepared. Ready for a refill?
          </p>
          <button 
            onClick={onGoToMenu}
            className="bg-primary text-white px-8 py-4 rounded-full font-extrabold text-sm uppercase tracking-widest transition-all shadow-lg"
          >
            Order Now
          </button>
        </div>
      </div>
    );
  }

  const activeIdx = getActiveStepIndex(activeOrder.status);

  return (
    <div className="space-y-0">
      <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-white pb-12 pt-20 md:pt-12 md:px-4 relative mb-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[4px] text-primary">Live Connection</span>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">Status Center</h2>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Status & QR */}
        <div className="lg:col-span-7 space-y-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[40px] p-8 md:p-10 shadow-2xl shadow-primary/5 relative overflow-hidden border border-border-main"
          >
            {/* Live Indicator */}
            <div className="flex items-center gap-2 mb-8 justify-center lg:justify-start">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-[4px] text-primary">Live Tracking</span>
            </div>

            {/* Status Header */}
            <div className="text-center lg:text-left mb-10">
              <h2 className="text-3xl md:text-4xl font-black text-text-main tracking-tighter uppercase leading-none mb-3">
                {activeOrder.status === 'collected' 
                  ? "Order Collected!" 
                  : "Go to Scanning Machine!"}
              </h2>
              <p className="text-text-sub text-sm font-medium italic">
                {activeOrder.status === 'collected' ? "Hope you enjoy your meal!" : "Scan your QR at the counter to get your receipt immediately."}
              </p>
            </div>

            {/* Visual Stepper - Zomato Style Vertical/Interactive */}
            <div className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-bg-sub before:z-0 mb-12">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                const isPast = idx <= activeIdx;
                const isCurrent = idx === activeIdx;
                return (
                  <div key={step.id} className="flex items-start gap-4 relative z-10 transition-all">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 flex-shrink-0 ${
                      isPast ? 'bg-primary text-white shadow-[0_0_20px_rgba(235,59,90,0.3)]' : 'bg-bg-sub text-text-sub'
                    } ${isCurrent ? 'ring-8 ring-primary/10' : ''}`}>
                      <Icon className={`w-5 h-5 ${isCurrent ? 'animate-bounce' : ''}`} />
                    </div>
                    <div className="flex-1 pt-1">
                      <h4 className={`text-sm font-black uppercase tracking-widest ${isPast ? 'text-text-main' : 'text-text-sub opacity-50'}`}>
                        {step.label}
                      </h4>
                      {isCurrent && (
                        <p className="text-[10px] font-bold text-primary mt-1 animate-pulse">In Progress...</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* QR Section */}
            <div className={`p-8 rounded-[32px] transition-all duration-500 border-2 border-dashed flex flex-col items-center bg-bg-sub/50 border-border-main ${
              activeOrder.status === 'ready' ? 'bg-primary/5 border-primary shadow-inner' : ''
            }`}>
              <div className="bg-white p-4 rounded-3xl shadow-lg border border-border-main mb-6">
                <QRCodeSVG 
                  value={activeOrder.id} 
                  size={140}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-[4px] text-text-sub mb-2 opacity-50">Pickup ID</p>
                <p className="text-4xl font-black tracking-[10px] text-text-main uppercase">{activeOrder.id.slice(0, 5)}</p>
              </div>
            </div>

            <button 
              onClick={() => fetchActiveOrder(true)}
              className="mt-6 w-full py-4 rounded-2xl bg-bg-sub text-text-sub text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-primary transition-all flex items-center justify-center gap-2 border border-transparent hover:border-primary/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh Status
            </button>
          </motion.div>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-5">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-[40px] p-8 border border-border-main sticky top-24 shadow-sm"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-black text-text-main tracking-tight">Order Items</h3>
              <span className="px-3 py-1 bg-bg-sub rounded-lg text-[10px] font-black text-text-sub uppercase tracking-widest">{activeOrder.order_items?.length} Items</span>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-4 max-h-[300px] overflow-y-auto no-scrollbar">
                {activeOrder.order_items?.map((item) => (
                  <div key={item.id} className="flex justify-between items-center group bg-bg-sub/30 p-3 rounded-2xl border border-transparent hover:border-border-main transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-bg overflow-hidden border border-border-main">
                        <img 
                          src={item.menu_items?.image_url || `https://picsum.photos/seed/${item.menu_items?.name || 'dish'}/100/100`} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-text-main line-clamp-1">{item.menu_items?.name || 'Item'}</p>
                        <p className="text-[10px] font-bold text-text-sub uppercase tracking-wider">{item.quantity} x ₹{item.price_at_time}</p>
                      </div>
                    </div>
                    <span className="font-black text-sm text-text-main">₹{item.price_at_time * item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-dashed border-border-main space-y-3">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-sub mb-1">Grand Total</p>
                    <span className="text-3xl font-black text-text-main leading-none">₹{activeOrder.total_price}</span>
                  </div>
                  <div className="pb-1">
                    <span className="px-3 py-1.5 bg-green-50 text-green-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-green-100 italic flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Paid Online
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-primary/5 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-text-main">Scanner Pickup Ready</p>
                  <p className="text-[10px] font-medium text-text-sub text-red-500 font-bold uppercase">Go to the scanning machine now to pick up your order.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  </div>
);
}

// Internal ShoppingBagIcon if Lucide one fails or for custom look
function ShoppingBagIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor" 
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  );
}
