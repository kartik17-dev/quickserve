import { useState } from 'react';
import { CartItem, Profile } from '../types';
import { supabase } from '../lib/supabase';
import { X, Minus, Plus, Trash2, ShoppingCart, CreditCard, Loader2, ShieldCheck, Ticket, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';

interface CartOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: number, delta: number) => void;
  onRemove: (id: number) => void;
  onClear: () => void;
  profile: Profile | null;
  onOrderPlaced: () => void;
  isKitchenOpen?: boolean;
}

export default function CartOverlay({ 
  isOpen, 
  onClose, 
  items, 
  onUpdateQuantity, 
  onRemove, 
  onClear, 
  profile, 
  onOrderPlaced,
  isKitchenOpen = true 
}: CartOverlayProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<'validating' | 'paying' | 'confirming' | 'error' | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const total = items.reduce((acc, i) => acc + (i.item.price * i.quantity), 0);

  const handleCheckout = async () => {
    if (!profile) return;
    console.log('--- Handle Checkout Started ---');
    setIsProcessing(true);
    setProcessingStep('validating');
    setCheckoutError(null);

    try {
      console.log('Step 1: Requesting Razorpay Order ID from backend...');
      setProcessingStep('paying');

      // 1. Create Razorpay Order via our Express Backend (passing cart details for safety)
      const { data: rzpOrder } = await axios.post('/api/create-payment-order', {
        amount: total,
        cart: items,
        userId: profile.id
      });
      console.log('Step 1 Success: Received RZP Order ID:', rzpOrder.id);

      // 2. Trigger Razorpay Checkout (or simulate for dummy keys)
      if (rzpOrder.is_mock) {
        console.log('Flow: MOCK PAYMENT detected');
        // Simulate a successful payment after a small delay
        setTimeout(async () => {
          try {
            console.log('Mock Step: Simulating Payment Success...');
            setProcessingStep('confirming');
            
            // Success simulation: Create the actual order in Supabase NOW
            console.log('Mock Step: INSERTING order into Supabase...');
            const { data: newOrder, error: orderError } = await supabase
              .from('orders')
              .insert({
                user_id: profile.id,
                total_price: total,
                status: 'placed',
                is_collected: false,
                razorpay_order_id: rzpOrder.id,
                razorpay_payment_id: `pay_mock_${Math.random().toString(36).slice(2, 11)}`
              })
              .select()
              .single();

            if (orderError) throw orderError;
            console.log('Mock Step: Order created with ID:', newOrder.id);

            const orderItems = items.map(i => ({
              order_id: newOrder.id,
              menu_item_id: i.item.id,
              quantity: i.quantity,
              price_at_time: i.item.price
            }));

            await supabase.from('order_items').insert(orderItems);
            console.log('Mock Step: Items linked. Finishing up...');
            
            setTimeout(() => {
              onClear();
              onOrderPlaced();
              setIsProcessing(false);
              setProcessingStep(null);
            }, 1000);
          } catch (err) {
            console.error('Simulation update error:', err);
            setProcessingStep('error');
            setCheckoutError('Payment simulation failed to save order.');
          }
        }, 2000);
        return;
      }

      console.log('Flow: REAL RAZORPAY detected. Opening Popup...');
      const options = {
        key: (import.meta as any).env.VITE_RAZORPAY_KEY_ID,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        name: "Supreme Kitchen",
        description: "Food Pickup Payment",
        order_id: rzpOrder.id,
        handler: async (response: any) => {
          console.log('Handler: Payment Success Received!', response);
          setProcessingStep('confirming');
          
          try {
            console.log('Handler: INSERTING order into Supabase now...');
            // CRITICAL: Order is only "placed" once payment is completed
            const { data: newOrder, error: orderError } = await supabase
              .from('orders')
              .insert({
                user_id: profile.id,
                total_price: total,
                status: 'placed',
                is_collected: false,
                razorpay_order_id: rzpOrder.id,
                razorpay_payment_id: response.razorpay_payment_id 
              })
              .select()
              .single();

            if (orderError) throw orderError;
            console.log('Handler: Order saved successfully ID:', newOrder.id);

            const orderItems = items.map(i => ({
              order_id: newOrder.id,
              menu_item_id: i.item.id,
              quantity: i.quantity,
              price_at_time: i.item.price
            }));

            await supabase.from('order_items').insert(orderItems);

            onClear();
            onOrderPlaced();
            setIsProcessing(false);
            setProcessingStep(null);
          } catch (err: any) {
            console.error('Final order creation error:', err);
            setProcessingStep('error');
            setCheckoutError('Order failed to save. Payment ID: ' + response.razorpay_payment_id);
          }
        },
        prefill: {
          name: profile.name,
          email: profile.email
        },
        theme: { color: "#10B981" },
        modal: {
          ondismiss: () => {
             console.log('Handler: Razorpay dismissed by user');
             setIsProcessing(false);
             setProcessingStep(null);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error('Checkout crash:', err);
      setProcessingStep('error');
      setCheckoutError(err.message || 'Checkout failed.');
    } finally {
      console.log('--- Handle Checkout Initial Loop End ---');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]" 
          />
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 max-h-[92vh] md:max-h-screen md:top-0 md:right-0 md:left-auto md:w-full md:max-w-[440px] bg-white z-[70] flex flex-col rounded-t-[32px] md:rounded-l-[32px] md:rounded-tr-none shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-border-main flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-text-main tracking-tight">Your Cart</h2>
                  {((import.meta as any).env.VITE_RAZORPAY_KEY_ID?.startsWith('rzp_test') && !(import.meta as any).env.VITE_RAZORPAY_KEY_ID?.includes('dummy')) && (
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[8px] font-black rounded uppercase tracking-widest border border-amber-100 flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                      Test Key
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-sub mt-0.5">
                  {items.length} {items.length === 1 ? 'Item' : 'Items'} selected
                </p>
              </div>
              <button 
                onClick={onClose} 
                className="w-10 h-10 flex items-center justify-center bg-bg-sub rounded-full text-text-sub hover:text-text-main transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 no-scrollbar">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <div className="w-24 h-24 bg-bg-sub rounded-full flex items-center justify-center mb-6">
                    <ShoppingCart className="w-10 h-10 text-text-sub/20" />
                  </div>
                  <h3 className="text-xl font-bold text-text-main mb-2">Empty Cart?</h3>
                  <p className="text-text-sub text-sm font-medium mb-8 max-w-[240px]">Hungry? Add some delicious treats from the menu to get started!</p>
                  <button 
                    onClick={onClose}
                    className="px-8 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                  >
                    Explore Menu
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Delivery Info Mock */}
                  <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-text-main">Ready in 15-20 mins</p>
                      <p className="text-[10px] font-medium text-text-sub">Pick up at Counter / Table Delivery</p>
                    </div>
                  </div>

                  {/* Cart Items */}
                  <div className="space-y-5">
                    {items.map(item => (
                      <motion.div 
                        key={item.item.id} 
                        layout
                        className="flex gap-4 group"
                      >
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-bg-sub flex-shrink-0">
                          <img 
                            src={item.item.image_url || `https://picsum.photos/seed/${item.item.name}/120/120`} 
                            className="w-full h-full object-cover"
                            alt={item.item.name}
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-sm text-text-main truncate pr-2">{item.item.name}</h4>
                            <span className="text-sm font-bold text-text-main">₹{item.item.price * item.quantity}</span>
                          </div>
                          <div className="text-[10px] font-bold text-primary italic mb-2 uppercase tracking-tight">₹{item.item.price} per unit</div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center bg-bg-sub rounded-lg border border-border-main p-0.5">
                              <button 
                                onClick={() => onUpdateQuantity(item.item.id, -1)}
                                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white text-text-sub transition-colors"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-bold text-[11px] w-8 text-center text-text-main">{item.quantity}</span>
                              <button 
                                onClick={() => onUpdateQuantity(item.item.id, 1)}
                                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white text-text-sub transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <button 
                              onClick={() => onRemove(item.item.id)}
                              className="text-text-sub hover:text-primary transition-colors p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Coupons / Vouchers */}
                  <button className="w-full py-4 border-2 border-dashed border-border-main rounded-2xl flex items-center justify-between px-4 text-text-sub hover:border-primary/30 hover:text-primary transition-all">
                    <div className="flex items-center gap-3">
                      <Ticket className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-widest">Apply Coupon Code</span>
                    </div>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="px-6 py-6 border-t border-border-main bg-white shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-xs font-medium text-text-sub">
                    <span>Subtotal</span>
                    <span>₹{total}</span>
                  </div>
                  <div className="flex justify-between text-xs font-medium text-text-sub">
                    <span>Tax & Charges</span>
                    <span>₹{Math.round(total * 0.05)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 mt-2 border-t border-dashed border-border-main">
                    <span className="text-base font-bold text-text-main uppercase tracking-tight">Grand Total</span>
                    <span className="text-xl font-black text-text-main">₹{Math.round(total * 1.05)}</span>
                  </div>
                </div>

                {!isKitchenOpen && (
                  <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-center animate-pulse border border-red-100 italic">
                    Kitchen is closed • Order for later pickup only
                  </div>
                )}

                <button
                  disabled={isProcessing || (!isKitchenOpen && false)} // Allow placing even if closed for future? No, follow original logic
                  onClick={handleCheckout}
                  className="w-full bg-primary text-white h-16 rounded-2xl font-black text-sm uppercase tracking-[3px] shadow-xl shadow-primary/20 hover:opacity-95 active:scale-95 transition-all flex items-center justify-between px-6 disabled:opacity-50 disabled:grayscale"
                >
                  {isProcessing ? (
                    <div className="w-full flex items-center justify-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{processingStep === 'paying' ? 'Loading Payment' : 'Confirming...'}</span>
                    </div>
                  ) : (
                    <>
                      <span>Checkout</span>
                      <div className="flex items-center gap-2">
                        <span className="opacity-60 font-medium">|</span>
                        <span>₹{Math.round(total * 1.05)}</span>
                        <ArrowRight className="w-5 h-5 ml-1" />
                      </div>
                    </>
                  )}
                </button>

                <div className="mt-4 flex items-center justify-center gap-2 text-[8px] font-black uppercase opacity-30 tracking-widest">
                  <ShieldCheck className="w-3 h-3" />
                  Secured by Razorpay • Verified Kitchen
                </div>
              </div>
            )}
            
            {/* Loading/Status Overlay */}
            <AnimatePresence>
              {isProcessing && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-white/90 backdrop-blur-md z-[80] flex flex-col items-center justify-center p-8 text-center"
                >
                  {processingStep === 'error' ? (
                    <div className="space-y-6">
                      <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto scale-110 shadow-xl">
                        <X className="w-10 h-10 text-red-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black uppercase tracking-tight text-text-main mb-2">Wait! Something failed</h3>
                        <p className="text-text-sub text-sm font-medium leading-relaxed">{checkoutError || 'A connection error occurred.'}</p>
                      </div>
                      <button 
                        onClick={() => { setIsProcessing(false); setProcessingStep(null); }}
                        className="px-8 py-3 bg-red-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest"
                      >
                        Go Back & Fix
                      </button>
                    </div>
                  ) : processingStep === 'confirming' ? (
                    <div className="space-y-6">
                      <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-primary/30">
                        <CheckCircle2 className="w-12 h-12 text-white animate-bounce" />
                      </div>
                      <div className="px-6">
                        <h3 className="text-2xl font-black uppercase tracking-tighter text-text-main mb-2">Order Success!</h3>
                        <p className="text-text-sub text-sm font-medium">Redirecting you to the kitchen status tracker...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8 flex flex-col items-center">
                      <div className="relative">
                        <div className="w-24 h-24 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <CreditCard className="w-8 h-8 text-primary" />
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[4px] text-primary animate-pulse">
                          Secure Connection
                        </p>
                        <p className="text-text-sub text-[10px] font-medium mt-2">DO NOT CLOSE THIS PANEL</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
