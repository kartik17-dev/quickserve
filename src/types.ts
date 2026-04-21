export type Profile = {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'admin';
  created_at: string;
};

export type MenuItem = {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  available: boolean;
};

export type OrderStatus = 'placed' | 'preparing' | 'ready' | 'collected' | 'cancelled';

export type Order = {
  id: string;
  user_id: string;
  status: OrderStatus;
  total_price: number;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  is_collected: boolean;
  created_at: string;
  order_items?: OrderItemWithMenu[];
};

export type OrderItem = {
  id: number;
  order_id: string;
  menu_item_id: number;
  quantity: number;
  price_at_time: number;
};

export type OrderItemWithMenu = OrderItem & {
  menu_items: MenuItem;
};

export type CartItem = {
  item: MenuItem;
  quantity: number;
};
