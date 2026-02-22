import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Category, UserState, User } from "./types";
import { CategoryCard, categoriesData } from "./components/CategoryCard";
import { Journey } from "./components/Journey";
import { Sparkles, Leaf, LogIn, User as UserIcon, LogOut } from "lucide-react";

export default function App() {
  const [state, setState] = useState<UserState>({
    category: null,
    step: 'landing',
    user: null
  });
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    checkAuth();
    
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        checkAuth();
      }
    };
    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/me');
      if (!res.ok) {
        throw new Error(`Auth check failed: ${res.status} ${res.statusText}`);
      }
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (data.user) {
          setState(prev => ({ 
            ...prev, 
            user: data.user,
            step: prev.step === 'landing' ? 'category-selection' : prev.step
          }));
        }
      } catch (jsonError) {
        console.error("Failed to parse auth response:", text.substring(0, 100));
      }
    } catch (e) {
      console.error("Auth check failed", e);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleLogin = async () => {
    console.log("Login clicked");
    try {
      const res = await fetch('/api/auth/google/url');
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const { url } = await res.json();
      console.log("Opening Google login:", url);
      window.open(url, 'google_login', 'width=500,height=600');
    } catch (e) {
      console.error("Login error:", e);
      alert("Gagal memuat login Google. Pastikan koneksi internet lancar.");
    }
  };

  const handleAnonymous = async () => {
    console.log("Anonymous clicked");
    try {
      const res = await fetch('/api/auth/anonymous', { method: 'POST' });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      console.log("Anonymous login success:", data);
      setState(prev => ({ ...prev, user: data.user, step: 'category-selection' }));
    } catch (e) {
      console.error("Anonymous login error:", e);
      alert("Gagal masuk sebagai anonim. Coba muat ulang halaman.");
    }
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    setState({ category: null, step: 'landing', user: null });
  };

  const selectCategory = (cat: Category) => {
    setState(prev => ({ ...prev, category: cat, step: 'journey' }));
  };

  const goBack = () => {
    setState(prev => ({ ...prev, category: null, step: 'category-selection' }));
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sage-50">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        >
          <Leaf className="text-sage-600" size={40} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 md:p-8 overflow-x-hidden isolate">
      {/* Background Elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sage-200/30 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-clay-500/10 blur-[120px] rounded-full pointer-events-none" />
      </div>

      {/* Header Info */}
      {state.user && (
        <div className="fixed top-6 right-6 flex items-center gap-4 z-50">
          <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-sage-100 shadow-sm">
            {state.user.picture ? (
              <img src={state.user.picture} alt={state.user.name} className="w-6 h-6 rounded-full" />
            ) : (
              <UserIcon size={16} className="text-sage-600" />
            )}
            <span className="text-sm font-medium text-sage-900">
              {state.user.isAnonymous ? "Mode Anonim" : state.user.name}
            </span>
            <button onClick={handleLogout} className="p-1 hover:text-clay-500 transition-colors cursor-pointer" title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {state.step === 'landing' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center max-w-2xl relative z-20"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-sage-100 text-sage-600 rounded-full text-sm font-medium mb-8">
              <Leaf size={16} />
              <span>Ruang Aman Untuk Jiwamu</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-serif font-bold text-sage-900 mb-6 leading-tight">
              Temukan <span className="text-clay-500 italic">Kedamaian</span> di Tengah Badai
            </h1>
            <p className="text-lg text-sage-600 mb-10 leading-relaxed">
              Setiap masalah punya akar, dan setiap luka punya cara untuk sembuh. 
              Mari kita urai satu per satu dalam perjalanan yang menenangkan.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-50">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogin();
                }} 
                className="btn-primary flex items-center gap-2 cursor-pointer relative z-50 pointer-events-auto"
              >
                <LogIn size={20} />
                Masuk dengan Google
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleAnonymous();
                }} 
                className="px-6 py-3 text-sage-600 font-semibold hover:text-sage-900 transition-colors cursor-pointer relative z-50 pointer-events-auto"
              >
                Lanjut sebagai Anonim
              </button>
            </div>
          </motion.div>
        )}

        {state.step === 'category-selection' && (
          <motion.div
            key="selection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-5xl"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Apa yang sedang kamu hadapi?</h2>
              <p className="text-sage-600">Pilih satu pintu untuk mulai berdialog dengan dirimu sendiri.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {categoriesData.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  category={cat.id}
                  description={cat.desc}
                  icon={cat.icon}
                  color={cat.color}
                  onClick={() => selectCategory(cat.id)}
                />
              ))}
            </div>
          </motion.div>
        )}

        {state.step === 'journey' && state.category && state.user && (
          <motion.div
            key="journey"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="w-full"
          >
            <Journey 
              category={state.category} 
              user={state.user} 
              onBack={goBack} 
              onLogin={handleLogin}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="fixed bottom-6 text-sage-400 text-xs tracking-widest uppercase">
        DamaiJiwa &copy; 2026 • Crafted with Care
      </footer>
    </div>
  );
}
