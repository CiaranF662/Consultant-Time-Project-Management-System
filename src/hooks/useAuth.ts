import { create } from 'zustand';
import { User, UserRole } from '@/types/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  setUser: (user: User) => void;
}

// Mock user data for demo
const mockUsers: Record<string, User> = {
  admin: {
    id: '1',
    name: 'Alex Johnson',
    email: 'admin@example.com',
    role: 'admin',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    isActive: true,
    createdAt: new Date('2024-01-01'),
  },
  user: {
    id: '2',
    name: 'Sarah Chen',
    email: 'sarah@example.com',
    role: 'user',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    isActive: true,
    createdAt: new Date('2024-01-15'),
  },
};

export const useAuth = create<AuthState>((set, get) => ({
  user: mockUsers.admin, // Start with admin user for demo
  isAuthenticated: true,
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    
    // Mock login logic
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const user = email.includes('admin') ? mockUsers.admin : mockUsers.user;
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    set({ user: null, isAuthenticated: false });
  },

  switchRole: (role: UserRole) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, role };
      set({ user: updatedUser });
    }
  },

  setUser: (user: User) => {
    set({ user, isAuthenticated: true });
  },
}));