import { motion } from "motion/react";
import { Category } from "../types";
import { Heart, Wallet, Users, Flame, Home } from "lucide-react";

interface CategoryCardProps {
  category: Category;
  description: string;
  onClick: () => void;
  icon: React.ReactNode;
  color: string;
}

export const CategoryCard = ({ category, description, onClick, icon, color }: CategoryCardProps) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`category-card bg-white flex flex-col items-center text-center gap-4`}
    >
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${color} text-white shadow-inner`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold">{category}</h3>
      <p className="text-sm text-sage-600 leading-relaxed">{description}</p>
    </motion.div>
  );
};

export const categoriesData: { id: Category; desc: string; icon: any; color: string }[] = [
  { id: 'Trauma', desc: 'Berdamai dengan masa lalu yang membekas.', icon: <Flame size={32} />, color: 'bg-rose-400' },
  { id: 'Ekonomi', desc: 'Menemukan ketenangan di tengah tantangan finansial.', icon: <Wallet size={32} />, color: 'bg-emerald-400' },
  { id: 'Sosial', desc: 'Membangun koneksi yang sehat dengan lingkungan.', icon: <Users size={32} />, color: 'bg-blue-400' },
  { id: 'Percintaan', desc: 'Memahami hati dan dinamika hubungan asmara.', icon: <Heart size={32} />, color: 'bg-pink-400' },
  { id: 'Keluarga', desc: 'Menyembuhkan akar dan memperkuat ikatan rumah.', icon: <Home size={32} />, color: 'bg-amber-400' },
];
