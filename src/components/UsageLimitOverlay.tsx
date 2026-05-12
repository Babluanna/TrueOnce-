import { motion } from 'motion/react';
import { Lock, Timer, Bell, ExternalLink } from 'lucide-react';
import { UserProfile } from '../types';
import { useState, useEffect } from 'react';

interface UsageLimitOverlayProps {
  profile: UserProfile | null;
}

export default function UsageLimitOverlay({ profile }: UsageLimitOverlayProps) {
  const [cooldownTime, setCooldownTime] = useState('60:00');

  useEffect(() => {
    const interval = setInterval(() => {
      // Simple countdown for UI (actual state is in useUsageTracker or DB)
      // Just showing a static 1-hour countdown for the overlay
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[200] bg-neutral-950 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-[2.5rem] p-12 text-center shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 animate-pulse" />
        
        <div className="absolute top-8 right-8 w-12 h-12 opacity-10">
          <img src="/logo.svg" alt="TrueOnce" className="w-full h-full object-contain grayscale" />
        </div>
        
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
            <Lock size={48} className="text-red-500" />
          </div>
        </div>

        <h1 className="text-4xl font-black mb-4 tracking-tighter">Usage Limit Reached</h1>
        <p className="text-neutral-400 mb-8 leading-relaxed">
          Hey {profile?.displayName}, you've hit the 30-minute free usage limit. 
          To ensure fair access for everyone, your account is temporarily locked for a brief cooldown.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-neutral-800 p-6 rounded-3xl border border-neutral-700">
            <Timer className="mx-auto mb-2 text-orange-500" />
            <p className="text-xs uppercase font-bold text-neutral-500 mb-1">Cooldown Ends In</p>
            <p className="text-3xl font-mono font-black text-white">~60:00</p>
          </div>
          <div className="bg-neutral-800 p-6 rounded-3xl border border-neutral-700 flex flex-col justify-center">
            <Bell className="mx-auto mb-2 text-blue-500" />
            <p className="text-xs uppercase font-bold text-neutral-500">Auto-Notify</p>
            <p className="text-sm font-medium">Keep this tab open</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all">
            Unlock Instantly with Pro
            <ExternalLink size={18} />
          </button>
          <p className="text-[10px] text-neutral-600 uppercase tracking-widest mt-4">Powered by TrueOnce Infrastructure</p>
        </div>
      </motion.div>
    </div>
  );
}
