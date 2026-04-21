import express from 'express';
import cors from 'cors';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Supabase admin client
let supabase: any;
const getSupabase = () => {
  if (!supabase) {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    supabase = createClient(url, key);
  }
  return supabase;
};

// Razorpay instance
let razorpay: any;
const getRazorpay = () => {
  if (!razorpay) {
    const key_id = process.env.VITE_RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_id.includes('dummy') && !key_secret) return null;
    razorpay = new Razorpay({
      key_id: key_id || '',
      key_secret: key_secret || '',
    });
  }
  return razorpay;
};

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', environment: process.env.NETLIFY ? 'netlify' : 'express' });
});

app.post('/api/create-payment-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, cart, userId } = req.body;
    if (!amount || isNaN(Number(amount))) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const rzp = getRazorpay();
    const key_id = process.env.VITE_RAZORPAY_KEY_ID;

    // Mock behavior ONLY if keys are explicitly 'dummy'
    if (key_id && key_id.includes('dummy')) {
      return res.json({
        id: `order_mock_${Math.random().toString(36).slice(2, 11)}`,
        amount: Math.round(amount * 100),
        currency,
        receipt,
        status: 'created',
        is_mock: true
      });
    }

    if (!rzp) {
      return res.status(500).json({ error: 'Razorpay not configured' });
    }

    const options = {
      amount: Math.round(amount * 100),
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      notes: {
        cart: JSON.stringify(cart || []),
        userId: userId || ''
      }
    };
    const order = await rzp.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

app.post('/api/razorpay-webhook', async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  const signature = req.headers['x-razorpay-signature'] as string;

  if (!secret || !signature) return res.status(400).json({ status: 'missing secret' });

  const shasum = crypto.createHmac('sha256', secret);
  shasum.update(JSON.stringify(req.body));
  if (shasum.digest('hex') !== signature) return res.status(403).json({ status: 'invalid signature' });

  if (req.body.event === 'order.paid') {
    const rzpOrder = req.body.payload.order.entity; 
    const paymentId = req.body.payload.payment.entity.id;
    const sb = getSupabase();
    
    if (sb) {
      // Check if order already exists
      const { data: existing } = await sb
        .from('orders')
        .select('id')
        .eq('razorpay_order_id', rzpOrder.id)
        .maybeSingle();

      if (!existing) {
        // Create from notes for safety
        const cart = JSON.parse(rzpOrder.notes.cart || '[]');
        const userId = rzpOrder.notes.userId;
        const total = rzpOrder.amount / 100;

        const { data: newOrder, error: orderErr } = await sb
          .from('orders')
          .insert({
            user_id: userId,
            total_price: total,
            status: 'placed',
            razorpay_order_id: rzpOrder.id,
            razorpay_payment_id: paymentId
          })
          .select()
          .single();

        if (!orderErr && newOrder) {
          const orderItems = cart.map((i: any) => ({
            order_id: newOrder.id,
            menu_item_id: i.item.id,
            quantity: i.quantity,
            price_at_time: i.item.price
          }));
          await sb.from('order_items').insert(orderItems);
        }
      } else {
        await sb.from('orders').update({ razorpay_payment_id: paymentId }).eq('id', existing.id);
      }
    }
  }
  res.json({ status: 'ok' });
});

export default app;
