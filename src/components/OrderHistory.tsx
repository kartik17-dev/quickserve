import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Order, Profile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Package, CheckCircle2, ArrowRight, XIcon, Clock } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface OrderHistoryProps {
  profile: Profile | null;
}

export default function OrderHistory({ profile }: OrderHistoryProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!profile) return;
    fetchOrders();

    // Realtime subscription for orders
    const channel = supabase
      .channel('order-status-changes')
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'orders',
          filter: `user_id=eq.${profile.id}`
        },
        (payload) => {
          const updatedOrder = payload.new as Order;
          setOrders(prev => prev.map(o => o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o));
          if (selectedOrder?.id === updatedOrder.id) {
            setSelectedOrder(prev => prev ? { ...prev, ...updatedOrder } : null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const fetchOrders = async () => {
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'placed': return 'bg-blue-100 text-blue-700';
      case 'preparing': return 'bg-yellow-100 text-yellow-700';
      case 'ready': return 'bg-green-100 text-green-700';
      case 'collected': return 'bg-gray-100 text-gray-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-text-sub font-medium tracking-tight">Fetching your order history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-white pb-12 pt-20 md:pt-12 md:px-4 relative mb-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none mb-2">Order History</h2>
              <p className="text-white/60 text-sm font-medium italic">Everything you've enjoyed so far.</p>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/80">{orders.length} Total Orders</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-20">

      {orders.length === 0 ? (
        <div className="bg-white rounded-[40px] p-16 text-center border border-border-main shadow-sm">
          <div className="w-24 h-24 bg-bg-sub rounded-full flex items-center justify-center mx-auto mb-8">
            <Package className="w-10 h-10 text-text-sub/20" />
          </div>
          <h3 className="text-xl font-bold text-text-main mb-3 uppercase tracking-tight">No cravings yet?</h3>
          <p className="text-text-sub text-sm font-medium mb-10 max-w-xs mx-auto italic">Your history is looking a bit hungry. Let's fill it with some delicious memories.</p>
          <button className="bg-primary text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-primary/20">
            Start Ordering
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {orders.map((order) => (
            <motion.div
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              whileHover={{ y: -4 }}
              className="bg-white p-6 rounded-[32px] border border-border-main cursor-pointer transition-all hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/20 relative group overflow-hidden"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border ${getStatusColor(order.status).replace('bg-', 'border-').replace('text-', 'bg-').replace('text-', 'text-')}`}>
                  <div className="w-1.5 h-1.5 rounded-full bg-current" />
                  {order.status}
                </div>
                <span className="text-[10px] font-bold text-text-sub opacity-30 mt-1">OCT {new Date(order.created_at).getDate()}</span>
              </div>
              
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-sub mb-2 opacity-50 italic">
                    {order.order_items?.length} Item{order.order_items?.length! > 1 ? 's' : ''} Ordered
                  </p>
                  <p className="font-black text-2xl text-text-main tracking-tight leading-none">₹{order.total_price}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-bg-sub flex items-center justify-center text-text-sub group-hover:bg-primary group-hover:text-white transition-all shadow-sm group-hover:shadow-lg group-hover:shadow-primary/30">
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>

              {/* Little detail strip */}
              <div className="mt-6 pt-4 border-t border-dashed border-border-main flex gap-2 overflow-hidden items-center">
                {order.order_items?.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="w-8 h-8 rounded-lg bg-bg-sub flex-shrink-0 border border-border-main overflow-hidden">
                    <img 
                      src={item.menu_items?.image_url || `https://picsum.photos/seed/${item.menu_items?.name}/50/50`} 
                      className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all"
                    />
                  </div>
                ))}
                {order.order_items?.length! > 3 && (
                  <span className="text-[9px] font-black text-text-sub ml-1">+{order.order_items?.length! - 3}</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedOrder && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-md z-[80]"
            />
            <motion.div 
              initial={{ y: 50, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md bg-white rounded-[40px] z-[90] overflow-hidden border border-border-main shadow-2xl"
            >
              <div className="p-8 border-b border-border-main flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1 italic">Order Summary</p>
                  <h3 className="text-xl font-black text-text-main tracking-tight uppercase leading-none">Receipt Details</h3>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="w-10 h-10 flex items-center justify-center bg-bg-sub rounded-full text-text-sub hover:text-red-500 transition-colors"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="px-8 py-6 max-h-[60vh] overflow-y-auto no-scrollbar">
                <div className="flex justify-center mb-8">
                  <div className={`px-5 py-2 rounded-full flex items-center gap-3 font-black uppercase text-[10px] tracking-widest ${getStatusColor(selectedOrder.status)} shadow-sm border border-current/10 italic`}>
                    <div className="w-2 h-2 rounded-full bg-current animate-pulse shadow-glow shadow-current/20" />
                    {selectedOrder.status}
                  </div>
                </div>

                <div className="bg-bg-sub rounded-3xl p-6 mb-8 border border-border-main border-dashed flex flex-col items-center">
                  <div className="bg-white p-3 rounded-2xl shadow-xl border border-border-main mb-6 relative group">
                    <div className="absolute inset-0 bg-primary/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <QRCodeSVG 
                      value={selectedOrder.id} 
                      size={140}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] text-text-sub font-black uppercase tracking-[3px] mb-2 opacity-50 italic">Verification Secure Key</p>
                    <p className="text-4xl font-black tracking-[12px] text-text-main uppercase ml-[12px]">{selectedOrder.id.slice(0, 4)}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedOrder.order_items?.map((item) => (
                    <div key={item.id} className="flex justify-between items-center group">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 flex items-center justify-center bg-bg-sub rounded-lg text-xs font-black text-text-sub">{item.quantity}×</span>
                        <span className="text-sm font-bold text-text-main line-clamp-1">{item.menu_items?.name || 'Deleted Item'}</span>
                      </div>
                      <span className="font-black text-sm text-text-main">₹{item.price_at_time * item.quantity}</span>
                    </div>
                  ))}
                  <div className="pt-6 mt-6 border-t border-dashed border-border-main flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-sub mb-1">Total Paid</p>
                      <span className="text-3xl font-black text-primary leading-none">₹{selectedOrder.total_price}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <p className="text-[8px] font-black text-text-sub uppercase mb-1">{new Date(selectedOrder.created_at).toLocaleDateString()}</p>
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-primary font-black uppercase text-[9px] tracking-[4px] text-white text-center italic hover:opacity-95 transition-all cursor-default">
                Thank you for choosing Supreme Kitchen
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  </div>
);
}
