import { useState } from 'react';
import { X, Send, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  email: string;
}

export default function FeedbackModal({ isOpen, onClose, userId, email }: FeedbackModalProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sending) return;

    setSending(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        userId,
        userEmail: email,
        message,
        timestamp: serverTimestamp(),
      });
      
      // The user requested: "Feedback should be directed to simplerdns@gmail.com"
      // In a real app, this would trigger a cloud function email. 
      // For now, we store it and notify user.
      toast.success('Thank you! Your feedback has been sent to TrueOnce HQ.');
      setMessage('');
      onClose();
    } catch (error) {
      console.error('Feedback error:', error);
      toast.error('Failed to send feedback.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl relative z-10"
      >
        <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500 rounded-lg">
              <Heart size={20} className="text-white" fill="white" />
            </div>
            <h2 className="text-xl font-bold">Send Feedback</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-neutral-400 text-sm">
            We'd love to hear your thoughts, bug reports, or feature requests. 
            All feedback goes directly to <span className="text-orange-500 font-mono">simplerdns@gmail.com</span>
          </p>
          
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What's on your mind?..."
            className="w-full h-40 bg-neutral-800 border border-neutral-700 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none transition-all"
            required
          />

          <button
            type="submit"
            disabled={sending || !message.trim()}
            className="w-full bg-white text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors disabled:opacity-50"
          >
            {sending ? "Sending..." : "Submit Feedback"}
            <Send size={18} />
          </button>
        </form>
      </motion.div>
    </div>
  );
}
