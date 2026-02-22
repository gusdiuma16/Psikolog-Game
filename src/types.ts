export type Category = 'Trauma' | 'Ekonomi' | 'Sosial' | 'Percintaan' | 'Keluarga';

export interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp?: number;
}

export interface User {
  id: string;
  email?: string;
  name?: string;
  picture?: string;
  isAnonymous: boolean;
}

export interface UserState {
  category: Category | null;
  step: 'landing' | 'category-selection' | 'journey';
  user: User | null;
}
