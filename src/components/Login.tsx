import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { LogIn } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';

export default function Login() {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Failed to sign in. Please try again.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-950 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-neutral-900 border border-neutral-800 p-8 rounded-3xl shadow-2xl text-center"
      >
        <div className="mb-8 flex justify-center">
          <div className="w-20 h-20 bg-neutral-800 rounded-2xl flex items-center justify-center p-3 border border-neutral-700 shadow-xl">
            <img src="/logo.svg" alt="TrueOnce" className="w-full h-full object-contain" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold mb-2 tracking-tight">Welcome to TrueOnce</h1>
        <p className="text-neutral-400 mb-8 font-light italic">The ultimate AI workspace for builders and creators.</p>
        
        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white text-black py-4 px-6 rounded-2xl font-semibold hover:bg-neutral-200 transition-colors"
        >
          <LogIn size={20} />
          Sign in with Google
        </button>
        
        <p className="mt-8 text-xs text-neutral-500 uppercase tracking-widest">
          Secured by Firebase & Google AI
        </p>
      </motion.div>
    </div>
  );
}
