import { GoogleGenAI } from "@google/genai";
import { Category, Message } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const getPsychologistResponse = async (
  category: Category,
  history: Message[],
  userInput: string
) => {
  const model = ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      ...history.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
      { role: "user", parts: [{ text: userInput }] }
    ],
    config: {
      systemInstruction: `Anda adalah seorang psikolog profesional yang hangat, empati, dan fokus pada problem solving. 
      Anda sedang membantu user dalam kategori: ${category}.
      
      Tujuan Anda:
      1. Membantu user merasa didengar dan divalidasi.
      2. Menggali akar masalah dengan pertanyaan yang lembut namun tepat sasaran.
      3. Memberikan langkah-langkah praktis (problem solving) untuk berdamai dengan situasi tersebut.
      4. Gunakan gaya bahasa yang santai, "casual friendly", seperti teman yang bijak namun tetap profesional.
      5. Hindari jawaban yang terlalu panjang. Berikan satu atau dua paragraf singkat dan satu pertanyaan reflektif untuk melanjutkan "permainan" percakapan ini.
      6. Gunakan analogi yang menenangkan jika perlu.
      
      Konteks: Ini adalah web interaktif seperti game. Jadikan percakapan ini seperti sebuah perjalanan (journey) menuju kedamaian diri.`,
    },
  });

  const result = await model;
  return result.text || "Maaf, saya sedang merenung sejenak. Bisa ulangi lagi?";
};
