import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { UtensilsCrossed, Mail, Lock, User, ArrowRight, Loader2, ChefHat, Sparkles } from 'lucide-react';

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName }
          }
        });
        if (error) throw error;
        setError("Account created! You can now log in.");
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans">
      {/* Left Side: Visual Content (Desktop only) */}
      <div className="hidden lg:flex lg:w-3/5 relative bg-black overflow-hidden group">
        <img 
          src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=2074&auto=format&fit=crop" 
          alt="Fresh Food" 
          className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-[2000ms]"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/40 to-transparent z-10" />
        
        <div className="absolute inset-0 z-20 p-20 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-primary rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/40 rotate-6 group-hover:rotate-0 transition-transform">
              <UtensilsCrossed className="w-6 h-6 text-white" />
            </div>
            <span className="font-black text-2xl text-white uppercase tracking-tighter">Supreme Kitchen</span>
          </div>

          <div className="max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-6xl font-black text-white leading-tight mb-8 uppercase tracking-tighter">
                EAT WHAT <br />
                MAKES YOU <br />
                <span className="text-primary italic">HAPPY.</span>
              </h2>
              <p className="text-white/80 text-xl font-medium leading-relaxed max-w-md">
                Experience the magic of authentic flavors delivered fast to your doorstep.
              </p>
            </motion.div>
          </div>

          <div className="flex items-center gap-6">
            <div className="px-5 py-2 rounded-full border border-white/20 backdrop-blur-md bg-white/5 text-white/70 text-[10px] font-black uppercase tracking-widest">
              Premium Dining
            </div>
            <div className="px-5 py-2 rounded-full border border-white/20 backdrop-blur-md bg-white/5 text-white/70 text-[10px] font-black uppercase tracking-widest">
              Fastest Delivery
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Auth Form */}
      <div className="w-full lg:w-2/5 flex items-center justify-center p-8 md:p-12 lg:p-16 overflow-y-auto bg-white">
        <div className="max-w-sm w-full">
          <div className="lg:hidden mb-12 flex flex-col items-center">
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/30 mb-4 rotate-3">
              <UtensilsCrossed className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-black text-text-main uppercase tracking-tighter">Supreme Kitchen</h1>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-black text-text-main uppercase tracking-tighter leading-none mb-3">
              {isLogin ? 'Login' : 'Create Account'}
            </h2>
            <p className="text-text-sub text-sm font-medium">
              {isLogin ? "Order from your favorite kitchens." : "Start your culinary journey here."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-1"
                >
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-5 py-4 bg-bg-sub border border-transparent rounded-2xl focus:bg-white focus:border-primary/30 outline-none transition-all font-semibold text-sm"
                    placeholder="Full Name"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 bg-bg-sub border border-transparent rounded-2xl focus:bg-white focus:border-primary/30 outline-none transition-all font-semibold text-sm"
                placeholder="Email Address"
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 bg-bg-sub border border-transparent rounded-2xl focus:bg-white focus:border-primary/30 outline-none transition-all font-semibold text-sm"
                placeholder="Password"
              />
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-center ${
                  error.includes('created') 
                    ? 'bg-green-50 text-green-600' 
                    : 'bg-red-50 text-red-600'
                }`}
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white h-14 rounded-2xl font-black text-xs uppercase tracking-[3px] shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-6"
            >
              {loading && !fullName && email ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Join Now'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white text-text-main border border-border-main h-14 rounded-2xl font-black text-xs uppercase tracking-[2px] shadow-sm hover:bg-bg-sub active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading && !email && !fullName ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </button>
          </div>

          <div className="mt-10 text-center">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-px bg-border-main flex-1" />
              <span className="text-[10px] font-black text-text-sub uppercase tracking-widest">or</span>
              <div className="h-px bg-border-main flex-1" />
            </div>

            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-text-sub hover:text-primary transition-colors py-2"
            >
              <span className="text-xs font-bold uppercase tracking-widest">
                {isLogin ? "New user? " : "Already member? "}
                <span className="text-primary font-black ml-1">{isLogin ? 'Sign up' : 'Sign in'}</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
