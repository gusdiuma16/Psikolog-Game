import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Category, Message, User } from "../types";
import { getPsychologistResponse } from "../services/gemini";
import { Send, ArrowLeft, Sparkles, User as UserIcon, LogIn, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface JourneyProps {
  category: Category;
  user: User;
  onBack: () => void;
  onLogin: () => void;
}

export const Journey = ({ category, user, onBack, onLogin }: JourneyProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/chat/${category}`);
        const data = await res.json();
        
        if (data.history && data.history.length > 0) {
          setMessages(data.history);
        } else {
          // Initial greeting if no history
          const initialPrompt = `Halo, saya memilih kategori ${category}. Bisa bantu saya memulai perjalanan untuk berdamai dengan masalah ini?`;
          const response = await getPsychologistResponse(category, [], initialPrompt);
          const initialMsg: Message = { role: 'model', text: response };
          setMessages([initialMsg]);
          saveMessage(initialMsg);
        }
      } catch (error) {
        console.error("Failed to load history:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadHistory();
  }, [category]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    
    // Show login prompt for anonymous users after 4 messages
    if (user.isAnonymous && messages.length >= 4 && !showLoginPrompt) {
      setShowLoginPrompt(true);
    }
  }, [messages, isLoading]);

  const saveMessage = async (msg: Message) => {
    try {
      await fetch(`/api/chat/${category}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg)
      });
    } catch (e) {
      console.error("Failed to save message:", e);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    saveMessage(userMsg);

    try {
      const response = await getPsychologistResponse(category, messages, input);
      const modelMsg: Message = { role: 'model', text: response };
      setMessages(prev => [...prev, modelMsg]);
      saveMessage(modelMsg);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: "Maaf, ada gangguan koneksi. Mari kita coba lagi." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[85vh] max-w-2xl mx-auto w-full glass-panel rounded-3xl overflow-hidden relative">
      {/* Header */}
      <div className="p-4 border-b border-sage-100 flex items-center justify-between bg-white/50">
        <button onClick={onBack} className="p-2 hover:bg-sage-100 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <h2 className="font-serif font-bold text-lg">{category}</h2>
          <p className="text-xs text-sage-600">Perjalanan Menuju Damai</p>
        </div>
        <div className="w-10" />
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-sage-600 text-white' : 'bg-clay-500 text-white'}`}>
                  {msg.role === 'user' ? <UserIcon size={16} /> : <Sparkles size={16} />}
                </div>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-sage-600 text-white rounded-tr-none' 
                    : 'bg-white text-sage-900 border border-sage-100 rounded-tl-none'
                }`}>
                  <div className="markdown-body">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-white border border-sage-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-2">
                <span className="w-2 h-2 bg-sage-300 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-sage-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 bg-sage-300 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Login Prompt Overlay */}
      <AnimatePresence>
        {showLoginPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-24 left-4 right-4 bg-clay-600 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between z-20"
          >
            <div className="flex items-center gap-3">
              <AlertCircle size={24} className="shrink-0" />
              <div>
                <p className="font-bold text-sm">Simpan Perjalananmu?</p>
                <p className="text-xs opacity-90">Login sekarang agar history tidak hilang.</p>
              </div>
            </div>
            <button 
              onClick={onLogin}
              className="px-4 py-2 bg-white text-clay-600 rounded-xl font-bold text-sm hover:bg-sage-50 transition-colors flex items-center gap-2"
            >
              <LogIn size={16} />
              Login
            </button>
            <button 
              onClick={() => setShowLoginPrompt(false)}
              className="absolute -top-2 -right-2 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="p-4 bg-white/50 border-t border-sage-100">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ceritakan apa yang kamu rasakan..."
            className="w-full p-4 pr-14 bg-white border border-sage-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sage-600/20 focus:border-sage-600 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 p-3 bg-sage-600 text-white rounded-xl hover:bg-sage-700 disabled:opacity-50 transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
