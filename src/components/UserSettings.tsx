import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { motion } from 'motion/react';
import { User, Mail, LogOut, ChevronRight, Shield, Bell, CreditCard, Edit3, Store } from 'lucide-react';

interface UserSettingsProps {
  profile: Profile | null;
  onLogout: () => void;
}

export default function UserSettings({ profile, onLogout }: UserSettingsProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) onLogout();
  };

  if (!profile) return null;

  return (
    <div className="space-y-0">
      <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-white pb-16 pt-20 md:pt-12 md:px-4 relative mb-0">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">Member Profile</h2>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-24">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12 -mt-16 relative z-10"
        >
          <div className="relative inline-block group">
            <div className="w-32 h-32 rounded-[40px] bg-gradient-to-br from-primary to-orange-400 p-1 mb-6 shadow-2xl shadow-primary/20 rotate-3 group-hover:rotate-6 transition-transform">
              <div className="w-full h-full bg-white rounded-[36px] flex items-center justify-center overflow-hidden border-4 border-white">
              <span className="text-5xl font-black text-primary uppercase">
                {profile.name?.charAt(0) || 'U'}
              </span>
            </div>
          </div>
          <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white border border-border-main rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Edit3 className="w-4 h-4 text-text-sub" />
          </div>
        </div>
        
        <h2 className="text-4xl font-black text-text-main tracking-tighter uppercase leading-none mb-3">
          {profile.name || 'Your Account'}
        </h2>
        <p className="text-text-sub font-black text-[10px] uppercase tracking-[3px] opacity-50 flex items-center justify-center gap-2 italic">
          <Mail className="w-3.5 h-3.5" />
          {profile.email}
        </p>
      </motion.div>

      <div className="space-y-6">
        {[
          { 
            title: 'Account Personalization', 
            items: [
              { label: 'Profile Settings', sub: 'Name, avatar, and dietary preferences', icon: User },
              { label: 'Security & Access', sub: 'Password, biological keys, and sessions', icon: Shield }
            ]
          },
          { 
            title: 'Ordering Experience', 
            items: [
              { label: 'Saved Addresses', sub: 'Home, work, and other locations', icon: Store },
              { label: 'Payment Methods', sub: 'UPI, credit cards, and digital wallets', icon: CreditCard },
              { label: 'Notifications', sub: 'Order tracking and flash deals', icon: Bell }
            ]
          }
        ].map((section, sIdx) => (
          <motion.section 
            key={sIdx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * sIdx }}
            className="bg-white rounded-[32px] border border-border-main overflow-hidden shadow-sm"
          >
            <div className="px-6 py-4 bg-bg-sub/50 border-b border-border-main">
              <h3 className="text-[10px] font-black uppercase tracking-[2px] text-text-sub opacity-50 italic">{section.title}</h3>
            </div>
            
            <div className="divide-y divide-border-main">
              {section.items.map((item, iIdx) => (
                <button 
                  key={iIdx} 
                  className="w-full px-6 py-5 flex items-center justify-between hover:bg-bg-sub/30 transition-all group text-left"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-bg-sub text-text-sub group-hover:bg-primary/10 group-hover:text-primary transition-all flex items-center justify-center">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-black text-sm text-text-main uppercase tracking-tight leading-none mb-1">{item.label}</p>
                      <p className="text-[10px] text-text-sub font-bold uppercase tracking-wider opacity-60 leading-none">{item.sub}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-border-main group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </motion.section>
        ))}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="pt-6"
        >
          <button 
            onClick={handleSignOut}
            className="w-full p-6 rounded-[32px] border border-red-100 bg-red-50/50 flex items-center justify-center gap-4 group hover:bg-red-50 transition-all shadow-sm"
          >
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center group-hover:scale-90 transition-transform">
              <LogOut className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="font-black text-sm uppercase tracking-widest text-red-600 leading-none mb-1 text-left">Disconnect</p>
              <p className="text-[10px] font-bold uppercase text-red-400 tracking-wider leading-none">Sign out of supreme kitchen</p>
            </div>
          </button>
          <p className="text-center mt-10 text-[9px] font-black uppercase tracking-[4px] text-text-sub opacity-20 italic">version 2.0.4 "zomato edition"</p>
        </motion.div>
      </div>
    </div>
  </div>
);
}
