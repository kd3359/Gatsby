/**
 * Zustand Store - Global State Management
 */

import { create } from 'zustand';

interface User {
  id: number;
  uuid: string;
  name: string;
  age: number;
  profilePhotoUrl?: string;
  bio?: string;
  vibeTags: string[];
  sessionId: number;
  authProvider: string;
  followerCount?: number;
  verified?: boolean;
}

interface Match {
  matchId: number;
  matchedAt: string;
  user: User;
  lastMessage?: {
    content: string;
    senderId: number;
    createdAt: string;
    readAt?: string;
  };
}

interface Message {
  id: number;
  content: string;
  sender: {
    id: number;
    uuid: string;
    name: string;
    profilePhotoUrl?: string;
  };
  createdAt: string;
  readAt?: string;
}

interface AppState {
  // Auth
  isAuthenticated: boolean;
  token: string | null;
  user: User | null;
  sessionUuid: string | null;

  // Swipe Stack
  swipeStack: User[];
  currentCardIndex: number;

  // Matches
  matches: Match[];

  // Messages
  messages: Record<number, Message[]>; // matchId -> messages[]
  typingUsers: Set<number>;

  // UI State
  activeTab: 'swipe' | 'matches' | 'profile';
  isLoading: boolean;
  error: string | null;

  // Session
  userCount: number;

  // Actions
  setAuth: (token: string, user: User, sessionUuid: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;

  setSwipeStack: (users: User[]) => void;
  removeTopCard: () => void;

  setMatches: (matches: Match[]) => void;
  addMatch: (match: Match) => void;

  setMessages: (matchId: number, messages: Message[]) => void;
  addMessage: (matchId: number, message: Message) => void;

  setTyping: (userId: number, isTyping: boolean) => void;

  setActiveTab: (tab: 'swipe' | 'matches' | 'profile') => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  setUserCount: (count: number) => void;
}

export const useStore = create<AppState>((set, get) => ({
  // Initial State
  isAuthenticated: false,
  token: null,
  user: null,
  sessionUuid: null,

  swipeStack: [],
  currentCardIndex: 0,

  matches: [],

  messages: {},
  typingUsers: new Set(),

  activeTab: 'swipe',
  isLoading: false,
  error: null,

  userCount: 0,

  // Auth Actions
  setAuth: (token, user, sessionUuid) => {
    localStorage.setItem('gatsby_token', token);
    set({
      isAuthenticated: true,
      token,
      user,
      sessionUuid,
    });
  },

  logout: () => {
    localStorage.removeItem('gatsby_token');
    set({
      isAuthenticated: false,
      token: null,
      user: null,
      sessionUuid: null,
      matches: [],
      messages: {},
      swipeStack: [],
    });
  },

  updateUser: (userData) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...userData } : null,
    }));
  },

  // Swipe Stack Actions
  setSwipeStack: (users) => {
    set({ swipeStack: users, currentCardIndex: 0 });
  },

  removeTopCard: () => {
    set((state) => ({
      currentCardIndex: state.currentCardIndex + 1,
    }));
  },

  // Match Actions
  setMatches: (matches) => {
    set({ matches });
  },

  addMatch: (match) => {
    set((state) => ({
      matches: [match, ...state.matches],
    }));
  },

  // Message Actions
  setMessages: (matchId, messages) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [matchId]: messages,
      },
    }));
  },

  addMessage: (matchId, message) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [matchId]: [...(state.messages[matchId] || []), message],
      },
    }));
  },

  // Typing Actions
  setTyping: (userId, isTyping) => {
    set((state) => {
      const typingUsers = new Set(state.typingUsers);
      if (isTyping) {
        typingUsers.add(userId);
      } else {
        typingUsers.delete(userId);
      }
      return { typingUsers };
    });
  },

  // UI Actions
  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },

  setLoading: (isLoading) => {
    set({ isLoading });
  },

  setError: (error) => {
    set({ error });
  },

  // Session Actions
  setUserCount: (count) => {
    set({ userCount: count });
  },
}));

export default useStore;
