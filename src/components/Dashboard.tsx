import { useState, useRef, useEffect } from 'react';
import { UserProfile, AppConfig, ChatMessage } from '../types';
import Sidebar from './Sidebar';
import ChatInterface from './ChatInterface';
import WebBuilder from './WebBuilder';
import FeedbackModal from './FeedbackModal';
import { motion, AnimatePresence } from 'motion/react';
import { useUsageTracker } from '../hooks/useUsageTracker';
import { Menu, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

interface DashboardProps {
  profile: UserProfile | null;
  view: 'chat' | 'webbuilder' | 'admin';
  setView: React.Dispatch<React.SetStateAction<'chat' | 'webbuilder' | 'admin'>>;
  config: AppConfig | null;
}

export default function Dashboard({ profile, view, setView, config }: DashboardProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Default closed on mobile
  const [showFeedback, setShowFeedback] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const { timeLeft, isLocked } = useUsageTracker(profile);

  // Close sidebar when clicking outside on mobile
  const closeSidebar = () => setIsSidebarOpen(false);

  // Initial state for desktop should be open
  useEffect(() => {
    if (window.innerWidth >= 768) {
      setIsSidebarOpen(true);
    }
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-950">
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSidebar}
            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <div className={cn(
        "fixed inset-y-0 left-0 z-50 md:relative md:translate-x-0 transition-transform duration-300",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <Sidebar 
          profile={profile} 
          currentView={view} 
          setView={(v) => {
            setView(v);
            setActiveConversationId(null);
            if (window.innerWidth < 768) setIsSidebarOpen(false);
          }} 
          activeConversationId={activeConversationId}
          onConversationSelect={(id, mode) => {
            setActiveConversationId(id);
            setView(mode as any);
            if (window.innerWidth < 768) setIsSidebarOpen(false);
          }}
          isOpen={isSidebarOpen} 
          setIsOpen={setIsSidebarOpen}
          onFeedbackOpen={() => setShowFeedback(true)}
          timeLeft={formattedTime(timeLeft)}
          config={config}
        />
      </div>
      
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center px-4 h-16 border-b border-neutral-900 shrink-0">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 text-neutral-400 hover:text-white"
          >
            <Menu size={24} />
          </button>
          <div className="ml-4 flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center p-0.5">
              <img src="/logo.svg" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-lg tracking-tight">{config?.appName || 'TrueOnce'}</span>
          </div>
          {profile?.role !== 'admin' && (
            <div className="ml-auto flex items-center gap-2 px-2 py-1 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20">
              <Clock size={14} />
              <span className="text-xs font-mono font-bold">{formattedTime(timeLeft)}</span>
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {view === 'chat' && (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 overflow-hidden"
            >
              <ChatInterface 
                profile={profile} 
                config={config} 
                conversationId={activeConversationId}
                onConversationCreated={setActiveConversationId}
              />
            </motion.div>
          )}
          
          {view === 'webbuilder' && (
            <motion.div 
              key="webbuilder"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 overflow-hidden"
            >
              <WebBuilder 
                profile={profile} 
                config={config} 
                conversationId={activeConversationId}
                onConversationCreated={setActiveConversationId}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} userId={profile?.uid || ''} email={profile?.email || ''} />
      </main>
    </div>
  );
}

function formattedTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
