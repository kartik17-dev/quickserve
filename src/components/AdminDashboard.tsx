import React, { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { Order, OrderStatus, MenuItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Loader2, QrCode, CheckCircle2, Search, Smartphone, XCircle, 
  Plus, Trash2, Edit3, Eye, EyeOff, LayoutPanelLeft, ShoppingBag, 
  ArrowUpDown, History, Clock, Store, Power, User, CreditCard, 
  ChefHat, Database, Printer, Bluetooth, BluetoothOff, Settings2, Zap 
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { printerService } from '../services/printerService';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'live' | 'past' | 'menu'>('live');
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(true);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [scanningStatus, setScanningStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [scannedMessage, setScannedMessage] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'total_price' | 'status'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // New item form state
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image_url: ''
  });
  const [isKitchenOpen, setIsKitchenOpen] = useState(true);
  const [isKitchenLoading, setIsKitchenLoading] = useState(false);
  const [isClearingOrders, setIsClearingOrders] = useState(false);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [autoPrint, setAutoPrint] = useState(true);
  const [isConnectingPrinter, setIsConnectingPrinter] = useState(false);
  const [pinModal, setPinModal] = useState<{
    show: boolean;
    pin: string;
    onSuccess: () => void;
    title: string;
    message: string;
  }>({
    show: false,
    pin: '',
    onSuccess: () => {},
    title: '',
    message: ''
  });

  useEffect(() => {
    fetchKitchenStatus();

    // Listen for changes
    const ordersChannel = supabase
      .channel('admin-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .subscribe();

    const menuChannel = supabase
      .channel('menu-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => fetchMenuItems())
      .subscribe();

    const kitchenChannel = supabase
      .channel('kitchen-admin-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kitchen_status' }, () => fetchKitchenStatus())
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(menuChannel);
      supabase.removeChannel(kitchenChannel);
    };
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchMenuItems();
  }, [activeTab, sortBy, sortOrder]);

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

  const toggleKitchen = async () => {
    setIsKitchenLoading(true);
    try {
      const { data: current } = await supabase
        .from('kitchen_status')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (current) {
        await supabase
          .from('kitchen_status')
          .update({ is_open: !isKitchenOpen })
          .eq('id', current.id);
      } else {
        await supabase
          .from('kitchen_status')
          .insert({ is_open: !isKitchenOpen });
      }
      
      setIsKitchenOpen(!isKitchenOpen);
    } catch (err) {
      console.error('Error toggling kitchen status:', err);
      alert('Failed to update kitchen status. Please ensure the kitchen_status table exists in Supabase.');
    } finally {
      setIsKitchenLoading(false);
    }
  };

  const connectPrinter = async () => {
    if (!navigator.bluetooth) {
      alert("Web Bluetooth is not supported in this browser or environment. Try opening the app in a new tab.");
      return;
    }
    
    setIsConnectingPrinter(true);
    try {
      await printerService.connect();
      setPrinterConnected(true);
    } catch (err: any) {
      console.error('Printer connection failed:', err);
      if (err.message?.includes('globally disabled') || err.name === 'SecurityError') {
        alert("Bluetooth access is blocked. Please open this app in a new tab or check your browser's Bluetooth permissions.");
      } else {
        alert(`Connection failed: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setIsConnectingPrinter(false);
    }
  };

  const disconnectPrinter = async () => {
    await printerService.disconnect();
    setPrinterConnected(false);
  };

  const printOrder = async (order: Order) => {
    if (!printerConnected) {
      throw new Error('Printer not connected');
    }
    try {
      // Get full order items for printing
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('*, menu_items(*)')
        .eq('order_id', order.id);

      if (itemsError) throw itemsError;
      
      if (items) {
        await printerService.printReceipt(order, items);
      }
    } catch (err) {
      console.error('Print failed:', err);
      throw err; // Re-throw to handle in processPickup
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [activeTab, sortBy, sortOrder]);

  const fetchMenuItems = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('category', { ascending: true });
      if (error) throw error;
      setMenuItems(data || []);
    } catch (err) {
      console.error('Error fetching menu items:', err);
    }
  };

  const toggleAvailability = async (id: number, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ available: !currentStatus })
        .eq('id', id);
      if (error) throw error;
      fetchMenuItems();
    } catch (err) {
      alert('Failed to update availability');
    }
  };

  const deleteItem = async (id: number) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchMenuItems();
      setItemToDelete(null);
    } catch (err) {
      console.error('Delete error:', err);
      // We can use the scanning status or a separate error state to show this
      setScanningStatus('error');
      setScannedMessage('Failed to delete item. It might be linked to existing orders.');
      setItemToDelete(null);
    }
  };

  const saveItem = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
         const { error } = await supabase
            .from('menu_items')
            .update({
              name: newItem.name,
              description: newItem.description,
              price: parseFloat(newItem.price),
              category: newItem.category,
              image_url: newItem.image_url || null,
            })
            .eq('id', editingItem.id);
         if (error) throw error;
      } else {
         const { error } = await supabase
            .from('menu_items')
            .insert({
              name: newItem.name,
              description: newItem.description,
              price: parseFloat(newItem.price),
              category: newItem.category,
              image_url: newItem.image_url || null,
              available: true
            });
         if (error) throw error;
      }
      setNewItem({ name: '', description: '', price: '', category: '', image_url: '' });
      setIsAddingItem(false);
      setEditingItem(null);
      fetchMenuItems();
    } catch (err) {
      alert(`Failed to ${editingItem ? 'update' : 'add'} item`);
    }
  };

  const seedSampleData = async () => {
    const sampleItems = [
      { name: "Rajma Chawal", category: "🍛 COMBO ITEMS", price: 180, description: "Classic home-style rajma with steamed basmati rice.", image_url: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?q=80&w=800&auto=format&fit=crop" },
      { name: "Chole Bhature", category: "🍛 COMBO ITEMS", price: 220, description: "Spicy chickpeas served with fluffy deep-fried leavened bread.", image_url: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?q=80&w=800&auto=format&fit=crop" },
      { name: "Dal Tadka with Jeera Rice", category: "🍛 COMBO ITEMS", price: 190, description: "Yellow lentils tempered with spices, served with cumin rice.", image_url: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=800&auto=format&fit=crop" },
      { name: "Kadhi Chawal", category: "🍛 COMBO ITEMS", price: 170, description: "Tangy yogurt-based curry with gram flour dumplings, served with rice.", image_url: "https://images.unsplash.com/photo-1626500155551-7c9632890694?q=80&w=800&auto=format&fit=crop" },
      { name: "Sambar Rice", category: "🍛 COMBO ITEMS", price: 160, description: "Traditional South Indian lentil vegetable stew mixed with rice.", image_url: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?q=80&w=800&auto=format&fit=crop" },
      
      { name: "Butter Naan", category: "🍞 BREADS (ROTI & PARATHA)", price: 60, description: "Soft and pillowy garlic-brushed leavened bread.", image_url: "https://images.unsplash.com/photo-1626074353765-517a681e40be?q=80&w=800&auto=format&fit=crop" },
      { name: "Tandoori Roti", category: "🍞 BREADS (ROTI & PARATHA)", price: 40, description: "Whole wheat bread cooked in a traditional clay oven.", image_url: "https://images.unsplash.com/photo-1533777324565-a040eb52facd?q=80&w=800&auto=format&fit=crop" },
      { name: "Aloo Paratha", category: "🍞 BREADS (ROTI & PARATHA)", price: 90, description: "Spiced potato stuffed whole wheat flatbread.", image_url: "https://images.unsplash.com/photo-1596797038530-2c39fa81b487?q=80&w=800&auto=format&fit=crop" },
      { name: "Laccha Paratha", category: "🍞 BREADS (ROTI & PARATHA)", price: 70, description: "Multi-layered flitted whole wheat bread.", image_url: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?q=80&w=800&auto=format&fit=crop" },
      { name: "Missi Roti", category: "🍞 BREADS (ROTI & PARATHA)", price: 50, description: "Gram flour and whole wheat bread with spices.", image_url: "https://images.unsplash.com/photo-1621327017866-6fb07e6c962a?q=80&w=800&auto=format&fit=crop" },

      { name: "Paneer Butter Masala", category: "🍲 CURRIES & SABZI", price: 280, description: "Paneer cubes in a rich and creamy tomato-based gravy.", image_url: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?q=80&w=800&auto=format&fit=crop" },
      { name: "Baingan Bharta", category: "🍲 CURRIES & SABZI", price: 240, description: "Smoky roasted eggplant mashed with onions and spices.", image_url: "https://images.unsplash.com/photo-1589647363585-f4a7d3877b10?q=80&w=800&auto=format&fit=crop" },
      { name: "Aloo Gobi", category: "🍲 CURRIES & SABZI", price: 210, description: "Classic cauliflower and potato stir-fry.", image_url: "https://images.unsplash.com/photo-1633337474564-1d9478ca4e2e?q=80&w=800&auto=format&fit=crop" },
      { name: "Palak Paneer", category: "🍲 CURRIES & SABZI", price: 260, description: "Fresh spinach puree with paneer cubes.", image_url: "https://images.unsplash.com/photo-1613292443284-8d10ef9383fe?q=80&w=800&auto=format&fit=crop" },
      { name: "Chicken Curry", category: "🍲 CURRIES & SABZI", price: 350, description: "Succulent chicken pieces in a traditional spiced gravy.", image_url: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?q=80&w=800&auto=format&fit=crop" },

      { name: "Vegetable Biryani", category: "🍚 RICE DISHES", price: 240, description: "Aromatic long-grain rice cooked with assorted vegetables and spices.", image_url: "https://images.unsplash.com/photo-1563379091339-03b21bc4a4f8?q=80&w=800&auto=format&fit=crop" },
      { name: "Hyderabadi Biryani", category: "🍚 RICE DISHES", price: 260, description: "Authentic Hyderabadi style spicy rice with veggies.", image_url: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?q=80&w=800&auto=format&fit=crop" },
      { name: "Pulao", category: "🍚 RICE DISHES", price: 180, description: "Lightly spiced rice with peas and vegetables.", image_url: "https://images.unsplash.com/photo-1613292443284-8d10ef9383fe?q=80&w=800&auto=format&fit=crop" },
      { name: "Curd Rice", category: "🍚 RICE DISHES", price: 140, description: "Comforting South Indian rice mixed with cool yogurt.", image_url: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?q=80&w=800&auto=format&fit=crop" },
      { name: "Lemon Rice", category: "🍚 RICE DISHES", price: 150, description: "Zesty tempered rice with a hint of lemon and peanuts.", image_url: "https://images.unsplash.com/photo-1516714435131-44d6b64dc38b?q=80&w=800&auto=format&fit=crop" },

      { name: "Gulab Jamun", category: "🍬 SWEETS (DESSERTS)", price: 80, description: "Deep fried milk-based balls soaked in sugar syrup.", image_url: "https://images.unsplash.com/photo-1589113331629-063940bbd247?q=80&w=800&auto=format&fit=crop" },
      { name: "Rasgulla", category: "🍬 SWEETS (DESSERTS)", price: 70, description: "Soft and spongy cottage cheese balls in syrup.", image_url: "https://images.unsplash.com/photo-1605192554106-d549b15ff1f9?q=80&w=800&auto=format&fit=crop" },
      { name: "Jalebi", category: "🍬 SWEETS (DESSERTS)", price: 90, description: "Crispy funnel cakes soaked in saffron syrup.", image_url: "https://images.unsplash.com/photo-1605192554106-d549b15ff1f9?q=80&w=800&auto=format&fit=crop" },
      { name: "Kheer", category: "🍬 SWEETS (DESSERTS)", price: 120, description: "Rich and creamy Indian rice pudding.", image_url: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?q=80&w=800&auto=format&fit=crop" },
      { name: "Ladoo", category: "🍬 SWEETS (DESSERTS)", price: 60, description: "Traditional round sweet made with gram flour and ghee.", image_url: "https://images.unsplash.com/photo-1621327017866-6fb07e6c962a?q=80&w=800&auto=format&fit=crop" },
    ];

    try {
      setIsKitchenLoading(true);
      const { error } = await supabase
        .from('menu_items')
        .insert(sampleItems.map(item => ({ ...item, available: true })));
      
      if (error) throw error;
      alert('Sample data seeded successfully! Your client items are ready.');
      fetchMenuItems();
    } catch (err) {
      console.error('Error seeding data:', err);
      alert('Failed to seed sample data.');
    } finally {
      setIsKitchenLoading(false);
    }
  };

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;

    if (isScanning && !loading) {
      // Small timeout to ensure the DOM element #reader is rendered by React
      const timer = setTimeout(() => {
        try {
          html5QrCode = new Html5Qrcode("reader");
          const config = { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          };

          html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
              onScanSuccess(decodedText);
            },
            () => {} // Ignore scan failures (frequent)
          ).catch((err) => {
            console.warn("Retrying with default camera...", err);
            // Fallback to any camera if environment (back) camera isn't found
            return html5QrCode?.start(
              {}, // Default camera
              config,
              (decodedText) => onScanSuccess(decodedText),
              () => {}
            );
          }).catch((err) => {
            console.error("Critical Scanner Error:", err);
            setScanningStatus('error');
            setScannedMessage('Could not start camera. Please ensure permissions are granted and you are in a secure (HTTPS) environment.');
          });
        } catch (err) {
          console.error("Scanner initialization error:", err);
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        if (html5QrCode && html5QrCode.isScanning) {
          html5QrCode.stop().then(() => {
            console.log("Scanner stopped");
          }).catch(err => console.error("Scanner stop error:", err));
        }
      };
    }
  }, [isScanning, loading]);

  const onScanSuccess = async (decodedText: string) => {
    // decodedText should be orderId
    setIsScanning(false);
    setScanningStatus('idle');
    processPickup(decodedText);
  };

  const onScanFailure = (error: any) => {
    // Quietly handle scan failure
  };

  const fetchOrders = async () => {
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          profiles (name, email),
          order_items (
            quantity,
            menu_items (name)
          )
        `);

      if (activeTab === 'live') {
        query = query.in('status', ['placed', 'preparing', 'ready']);
        // EXCLUSIVE: Only show orders with a payment ID
        query = query.not('razorpay_payment_id', 'is', null);
      } else if (activeTab === 'past') {
        query = query.in('status', ['collected', 'cancelled']);
      }

      const { data, error } = await query.order(sortBy, { ascending: sortOrder === 'asc' });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching admin orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);
      
      if (error) throw error;
      fetchOrders();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinModal.pin === "1234") {
      const action = pinModal.onSuccess;
      setPinModal(prev => ({ ...prev, show: false, pin: '' }));
      action();
    } else {
      alert("Access Denied: Invalid PIN");
      setPinModal(prev => ({ ...prev, pin: '' }));
    }
  };

  const deleteOrder = async (orderId: string) => {
    setPinModal({
      show: true,
      pin: '',
      title: "Confirm Deletion",
      message: "Are you sure you want to PERMANENTLY remove this order record? This cannot be undone.",
      onSuccess: async () => {
        try {
          const { error } = await supabase
            .from('orders')
            .delete()
            .eq('id', orderId);
            
          if (error) throw error;
          fetchOrders();
        } catch (err) {
          console.error('Error deleting order:', err);
          alert('Delete failed. Check database permissions.');
        }
      }
    });
  };

  const clearAllOrders = async () => {
    const isHistory = activeTab === 'past';
    const message = isHistory 
      ? 'DANGER: This will PERMANENTLY DELETE ALL history records. Proceed?' 
      : 'This will CANCEL all active orders and clear the dashboard. Proceed?';
    
    setPinModal({
      show: true,
      pin: '',
      title: isHistory ? "Clear All History" : "Clear Active List",
      message: message,
      onSuccess: async () => {
        setIsClearingOrders(true);
        try {
          if (isHistory) {
            const { error } = await supabase
              .from('orders')
              .delete()
              .in('status', ['collected', 'cancelled']);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('orders')
              .update({ status: 'cancelled' })
              .in('status', ['placed', 'preparing', 'ready']);
            if (error) throw error;
          }
          fetchOrders();
        } catch (err) {
          console.error('Error clearing orders:', err);
          alert('Action failed.');
        } finally {
          setIsClearingOrders(false);
        }
      }
    });
  };

  const processPickup = async (orderId: string) => {
    try {
      // 1. Fetch order
      const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error || !order) {
        setScanningStatus('error');
        setScannedMessage('Order not found. Invalid QR code.');
        return;
      }

      if (order.is_collected) {
        setScanningStatus('error');
        setScannedMessage('Order already collected!');
        return;
      }

      // Allow any order that isn't cancelled or already collected
      if (order.status === 'cancelled') {
        setScanningStatus('error');
        setScannedMessage('Cannot collect a cancelled order.');
        return;
      }

      // 2. Print receipt FIRST
      try {
        await printOrder(order as unknown as Order);
      } catch (err: any) {
        // Play specific error audio
        const errorAudio = new Audio('https://oozhykbdjcrgjooaulwt.supabase.co/storage/v1/object/public/droplink-files/192032/neha_tts_audio%20(1).mp3');
        errorAudio.play().catch(e => console.error('Audio play failed:', e));
        
        setScanningStatus('error');
        setScannedMessage(`Print failed: ${err.message || 'Check printer connection'}. Order NOT collected.`);
        return;
      }

      // 3. Mark as collected
      await supabase
        .from('orders')
        .update({ 
          status: 'collected', 
          is_collected: true 
        })
        .eq('id', orderId);

      setScanningStatus('success');
      setScannedMessage(`Receipt printed & order #${order.id.slice(0, 6)} collected.`);
      fetchOrders();

    } catch (err) {
      setScanningStatus('error');
      setScannedMessage('An error occurred during pickup.');
    } finally {
      // Shorter timeout for automation feel
      setTimeout(() => setScanningStatus('idle'), 5000);
    }
  };

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="bg-[#f8f9fa] min-h-screen">
      {/* Header rail */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 md:py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 md:gap-6">
            <div className="flex items-center gap-3">
              <img 
                src="https://oozhykbdjcrgjooaulwt.supabase.co/storage/v1/object/public/droplink-files/965324/Untitled%20design%20(2).png" 
                alt="Logo" 
                className="w-8 h-8 object-contain"
                referrerPolicy="no-referrer"
              />
              <div className="flex-1">
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 leading-none">Command Center</h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${isKitchenOpen ? 'bg-green-500' : 'bg-red-500'}`} />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Kitchen {isKitchenOpen ? 'Online' : 'Offline'}</p>
                </div>
              </div>
            </div>

            <nav className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar">
              {[
                { id: 'live', label: 'Live' },
                { id: 'past', label: 'History' },
                { id: 'menu', label: 'Menu' }
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${
                    activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 md:gap-3 overflow-x-auto no-scrollbar pb-1 md:pb-0">
            {activeTab !== 'menu' && (
              <button 
                onClick={() => setIsScanning(true)}
                className="bg-slate-900 text-white h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all flex-shrink-0"
              >
                <QrCode className="w-3.5 h-3.5" />
                Scanner
              </button>
            )}
            {activeTab === 'menu' && (
               <button 
                  onClick={() => {
                    setEditingItem(null);
                    setNewItem({ name: '', description: '', price: '', category: '', image_url: '' });
                    setIsAddingItem(true);
                  }}
                  className="bg-primary text-white h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:opacity-95 transition-all shadow-lg shadow-primary/20 flex-shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Item
                </button>
            )}
            <div className="hidden sm:block w-px h-6 bg-slate-200 mx-1" />
            <button
              onClick={toggleKitchen}
              disabled={isKitchenLoading}
              className={`h-9 px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex-shrink-0 ${
                isKitchenOpen 
                  ? 'bg-green-50 text-green-600 border-green-200' 
                  : 'bg-red-50 text-red-600 border-red-200'
              }`}
            >
              {isKitchenOpen ? 'Kitchen Live' : 'Kitchen Off'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Main Content Areas */}
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left: Operations Stats (Subtle) */}
          <div className="w-full md:w-64 space-y-4 md:space-y-6 flex-shrink-0">
            <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
              {[
                { label: 'Revenue', value: `₹${orders.reduce((acc, o) => acc + (o.status === 'collected' ? o.total_price : 0), 0)}`, color: 'text-green-600' },
                { label: 'Pending', value: orders.filter(o => ['placed', 'preparing', 'ready'].includes(o.status)).length, color: 'text-primary' },
                { label: 'Items', value: menuItems.length, color: 'text-slate-500' }
              ].map((stat, i) => (
                <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                   <p className={`text-lg font-black ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-200">
               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">Settings</p>
               <div className="space-y-2">
                 <button
                    onClick={printerConnected ? disconnectPrinter : connectPrinter}
                    className="w-full h-10 px-4 rounded-xl flex items-center justify-between text-[10px] font-black uppercase tracking-widest transition-all bg-white border border-slate-200 hover:border-slate-300"
                  >
                    <span className="flex items-center gap-1.5 italic">
                      {printerConnected ? <Bluetooth className="w-3 h-3" /> : <BluetoothOff className="w-3 h-3 opacity-30" />}
                      Printer
                    </span>
                    <span className={printerConnected ? 'text-green-500' : 'text-slate-300'}>
                      {printerConnected ? 'Ready' : 'Off'}
                    </span>
                  </button>

                  <button
                    onClick={() => setAutoPrint(!autoPrint)}
                    className={`w-full h-10 px-4 rounded-xl flex items-center justify-between text-[10px] font-black uppercase tracking-widest transition-all border ${
                      autoPrint ? 'bg-primary/5 text-primary border-primary/20' : 'bg-white text-slate-300 border-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 italic">
                      <Zap className="w-3 h-3" />
                      Auto-Print
                    </span>
                    <span>{autoPrint ? 'On' : 'Off'}</span>
                  </button>

                  {orders.length > 0 && (
                    <button
                      onClick={clearAllOrders}
                      className="w-full h-10 px-4 rounded-xl bg-red-50 text-red-600 border border-red-100 text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2 mt-4"
                    >
                      <Trash2 className="w-3 h-3" />
                      {activeTab === 'past' ? 'Clear History' : 'Clear List'}
                    </button>
                  )}
               </div>
            </div>
          </div>

          {/* Right: Focused List */}
          <div className="flex-1 min-w-0">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-black uppercase tracking-[3px] text-slate-400">{activeTab} View</h3>
                <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent text-[9px] font-black uppercase tracking-widest outline-none cursor-pointer"
                  >
                    <option value="created_at">Time</option>
                    <option value="total_price">Price</option>
                  </select>
                </div>
             </div>

            {scanningStatus !== 'idle' && (
              <motion.div 
                key={scanningStatus}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-2xl mb-6 flex items-center gap-4 shadow-sm ${
                  scanningStatus === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                }`}
              >
                {scanningStatus === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                <div className="flex-1">
                  <p className="font-black text-[10px] uppercase tracking-widest">{scanningStatus === 'success' ? 'Success' : 'Error'}</p>
                  <p className="text-xs font-medium">{scannedMessage}</p>
                </div>
                <button onClick={() => setScanningStatus('idle')}>
                  <XCircle className="w-4 h-4 opacity-30" />
                </button>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {activeTab !== 'menu' ? (
                <motion.div 
                  key={activeTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  {orders.map(order => (
                    <div key={order.id} className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 flex flex-col justify-between hover:shadow-md transition-all group relative overflow-hidden">
                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-black text-xs text-slate-900 tracking-widest uppercase">#{order.id.slice(0, 6)}</h4>
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              {(order as any).profiles?.name || 'Guest'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => deleteOrder(order.id)}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                              order.status === 'ready' ? 'bg-green-500 text-white border-green-500' : 
                              order.status === 'preparing' ? 'bg-orange-500 text-white border-orange-500' : 
                              order.status === 'collected' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                              order.status === 'cancelled' ? 'bg-red-500 text-white border-red-500' :
                              'bg-primary text-white border-primary'
                            }`}>
                              {order.status}
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-1 mb-4">
                          {(order as any).order_items?.map((item: any, i: number) => (
                            <div key={i} className="flex items-center justify-between text-[11px] font-medium text-slate-600">
                              <span>{item.quantity}x {item.menu_items?.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-auto">
                        <span className="font-black text-sm text-slate-900">₹{order.total_price}</span>
                        
                        <div className="flex gap-2">
                          {order.status === 'collected' && printerConnected && (
                            <button 
                              onClick={() => printOrder(order)}
                              className="bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest border border-slate-200 hover:bg-white transition-all flex items-center gap-1.5"
                            >
                              <Printer className="w-3 h-3" /> Print
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {orders.length === 0 && (
                    <div className="col-span-full py-16 md:py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                      <ChefHat className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                      <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">No {activeTab} orders found</p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div 
                  key="menu-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {menuItems.map(item => (
                    <div key={item.id} className={`bg-white p-4 rounded-2xl border border-slate-200 flex flex-col gap-4 transition-all hover:border-primary/20 ${!item.available ? 'opacity-60 grayscale' : ''}`}>
                      <div className="aspect-[16/10] rounded-xl overflow-hidden bg-slate-100 relative group">
                        <img src={item.image_url || `https://picsum.photos/seed/${item.name}/300/225`} className="w-full h-full object-cover" />
                        {!item.available && (
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                            <span className="text-white font-black text-[10px] uppercase tracking-widest border border-white px-3 py-1 -rotate-6">Disabled</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-black text-[11px] text-slate-900 leading-tight uppercase tracking-tight truncate max-w-[120px]">{item.name}</h4>
                          <span className="text-[11px] font-black text-primary">₹{item.price}</span>
                        </div>
                        <p className="text-[8px] uppercase font-bold tracking-widest text-slate-400 mb-4">{item.category}</p>
                        
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => toggleAvailability(item.id, item.available)}
                            className={`flex-1 h-8 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${
                              item.available ? 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-white' : 'bg-primary text-white'
                            }`}
                          >
                            {item.available ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            {item.available ? 'Hide' : 'Show'}
                          </button>
                          <button 
                            onClick={() => {
                                setEditingItem(item);
                                setIsAddingItem(true);
                                setNewItem({
                                    name: item.name,
                                    description: item.description || '',
                                    price: item.price.toString(),
                                    category: item.category || '',
                                    image_url: item.image_url || ''
                                });
                            }}
                            className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 transition-all flex items-center justify-center"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => setItemToDelete(item.id)}
                            className="w-8 h-8 rounded-lg bg-red-50 text-red-600 border border-red-100 transition-all flex items-center justify-center"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isScanning && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsScanning(false)}
              className="fixed inset-0 bg-text-main/20 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-md bg-surface rounded-card z-[110] overflow-hidden shadow-2xl border border-border-main"
            >
              <div className="p-8 border-b border-border-main flex items-center justify-between">
                <h3 className="text-base font-extrabold uppercase tracking-tight text-text-main">Verify Pickup</h3>
                <button 
                  onClick={() => setIsScanning(false)}
                  className="p-1 hover:bg-bg rounded-md transition-colors text-text-sub"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-8">
                <div className="aspect-square bg-bg rounded-2xl overflow-hidden border border-border-main border-dashed relative">
                  <div id="reader"></div>
                </div>
                
                <div className="mt-8 text-center space-y-4">
                  <div className="inline-flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-[2px]">
                    <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    Scanning active
                  </div>
                  <p className="text-text-sub font-medium text-xs px-8">
                    Scan the customer's QR code to verify their order and confirm the pickup.
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {isAddingItem && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setIsAddingItem(false); setEditingItem(null); }}
              className="fixed inset-0 bg-text-main/20 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-md bg-surface rounded-card z-[110] overflow-hidden shadow-2xl border border-border-main"
            >
              <div className="p-8 border-b border-border-main flex items-center justify-between">
                <h3 className="text-base font-extrabold uppercase tracking-tight text-text-main">
                  {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
                </h3>
                <button 
                  onClick={() => { setIsAddingItem(false); setEditingItem(null); }}
                  className="p-1 hover:bg-bg rounded-md transition-colors text-text-sub"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={saveItem} className="p-8 space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-sub block mb-1.5">Item Name</label>
                  <input 
                    required
                    type="text"
                    value={newItem.name}
                    onChange={e => setNewItem({...newItem, name: e.target.value})}
                    placeholder="e.g., Margarita Pizza"
                    className="w-full bg-bg border border-border-main rounded-md px-4 py-2.5 text-sm focus:border-text-main outline-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-sub block mb-1.5">Price (₹)</label>
                    <input 
                      required
                      type="number"
                      value={newItem.price}
                      onChange={e => setNewItem({...newItem, price: e.target.value})}
                      placeholder="0.00"
                      className="w-full bg-bg border border-border-main rounded-md px-4 py-2.5 text-sm focus:border-text-main outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-sub block mb-1.5">Category</label>
                    <input 
                      required
                      type="text"
                      value={newItem.category}
                      onChange={e => setNewItem({...newItem, category: e.target.value})}
                      placeholder="e.g., Pizza"
                      className="w-full bg-bg border border-border-main rounded-md px-4 py-2.5 text-sm focus:border-text-main outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-sub block mb-1.5">Description</label>
                  <textarea 
                    required
                    rows={3}
                    value={newItem.description}
                    onChange={e => setNewItem({...newItem, description: e.target.value})}
                    placeholder="Describe the dish..."
                    className="w-full bg-bg border border-border-main rounded-md px-4 py-2.5 text-sm focus:border-text-main outline-none transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-sub block mb-1.5">Image URL (Optional)</label>
                  <input 
                    type="url"
                    value={newItem.image_url}
                    onChange={e => setNewItem({...newItem, image_url: e.target.value})}
                    placeholder="https://..."
                    className="w-full bg-bg border border-border-main rounded-md px-4 py-2.5 text-sm focus:border-text-main outline-none transition-all"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-text-main text-surface py-3.5 rounded-radius-button font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-sm mt-4"
                >
                  Save Item
                </button>
              </form>
            </motion.div>
          </>
        )}

        {itemToDelete !== null && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setItemToDelete(null)}
              className="fixed inset-0 bg-text-main/20 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-sm bg-surface rounded-card z-[110] overflow-hidden shadow-2xl border border-border-main"
            >
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-lg font-extrabold uppercase tracking-tight text-text-main mb-2">Delete Item?</h3>
                <p className="text-text-sub text-xs font-medium mb-8 leading-relaxed">
                  Are you sure you want to delete this item? This action cannot be undone and may fail if the item is part of existing orders.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setItemToDelete(null)}
                    className="flex-1 px-4 py-3 bg-bg border border-border-main rounded-radius-button font-bold text-[10px] uppercase tracking-widest text-text-sub hover:text-text-main transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => deleteItem(itemToDelete)}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-radius-button font-bold text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-md shadow-red-200"
                  >
                    Delete Now
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}

      </AnimatePresence>

      <AnimatePresence>
        {pinModal.show && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setPinModal(prev => ({ ...prev, show: false }))}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200]"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-[32px] z-[210] overflow-hidden shadow-2xl border border-slate-200"
            >
              <div className="p-8">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
                  <Database className="w-8 h-8" />
                </div>
                
                <h3 className="text-xl font-black text-slate-900 text-center uppercase tracking-tight mb-2">{pinModal.title}</h3>
                <p className="text-slate-400 text-center text-xs font-bold leading-relaxed mb-8 px-4 font-mono">{pinModal.message}</p>
                
                <form onSubmit={handlePinSubmit} className="space-y-4">
                  <div className="relative">
                    <input 
                      autoFocus
                      type="password"
                      value={pinModal.pin}
                      onChange={e => setPinModal(prev => ({ ...prev, pin: e.target.value }))}
                      placeholder="ENTER 4-DIGIT PIN"
                      maxLength={4}
                      className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 text-center text-2xl font-black tracking-[1em] focus:border-primary focus:bg-white outline-none transition-all placeholder:text-[10px] placeholder:tracking-widest placeholder:font-black"
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setPinModal(prev => ({ ...prev, show: false }))}
                      className="flex-1 h-14 rounded-2xl bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={pinModal.pin.length < 4}
                      className="flex-1 h-14 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Authenticate
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
