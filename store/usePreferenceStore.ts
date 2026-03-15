import { create } from 'zustand';
import { UserPreferences } from '../types';

interface PreferenceState extends UserPreferences {
  setDarkMode: (mode: boolean | 'system') => void;
  setNotifications: (enabled: boolean) => void;
  setDefaultAIModel: (model: string) => void;
  setUserName: (name: string) => void;
  setUserEmail: (email: string) => void;
}

const usePreferenceStore = create<PreferenceState>((set) => ({
  darkMode: 'system',
  notifications: true,
  defaultAIModel: 'claude-sonnet-4-6-20250514',
  userName: 'Alex Johnson',
  userEmail: 'alex.johnson@email.com',
  setDarkMode: (mode) => set({ darkMode: mode }),
  setNotifications: (enabled) => set({ notifications: enabled }),
  setDefaultAIModel: (model) => set({ defaultAIModel: model }),
  setUserName: (name) => set({ userName: name }),
  setUserEmail: (email) => set({ userEmail: email }),
}));

export default usePreferenceStore;
