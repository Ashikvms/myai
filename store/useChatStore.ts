import { create } from 'zustand';
import { ChatMessage } from '../types';

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  addMessage: (message: ChatMessage) => void;
  setLoading: (loading: boolean) => void;
  clearMessages: () => void;
  sendMessage: (content: string) => Promise<void>;
}

const demoMessages: ChatMessage[] = [
  {
    id: '1',
    role: 'assistant',
    content:
      "Hello! I'm your Life Admin AI assistant. I can help you manage tasks, organize documents, track bills, and keep your life running smoothly. What can I help you with today?",
    timestamp: '2026-03-15T09:00:00Z',
  },
  {
    id: '2',
    role: 'user',
    content: 'What bills do I have coming up this month?',
    timestamp: '2026-03-15T09:01:00Z',
  },
  {
    id: '3',
    role: 'assistant',
    content:
      "Based on your records, here are your upcoming bills:\n\n1. **Electricity Bill** - $142.50, due March 17\n2. **Car Insurance** - $189.00, due March 25\n3. **Internet Service** - $79.99, due March 28\n\nWould you like me to set reminders for any of these, or help you schedule the payments?",
    timestamp: '2026-03-15T09:01:30Z',
  },
];

const useChatStore = create<ChatState>((set, get) => ({
  messages: demoMessages,
  isLoading: false,
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setLoading: (loading) => set({ isLoading: loading }),
  clearMessages: () =>
    set({
      messages: [
        {
          id: Date.now().toString(),
          role: 'assistant',
          content:
            "Hello! I'm your Life Admin AI assistant. How can I help you today?",
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  sendMessage: async (content: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      isLoading: true,
    }));

    try {
      const { messages } = get();
      const apiMessages = messages
        .filter((m) => m.id !== '1')
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6-20250514',
          max_tokens: 1024,
          system:
            'You are a helpful Life Admin AI assistant. You help users manage their daily life tasks, bills, appointments, documents, and general life administration. Be concise, friendly, and actionable in your responses.',
          messages: apiMessages,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const assistantContent =
        data.content?.[0]?.text || 'Sorry, I could not generate a response.';

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date().toISOString(),
      };

      set((state) => ({
        messages: [...state.messages, assistantMessage],
        isLoading: false,
      }));
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          'Sorry, I encountered an error connecting to the AI service. Please check your API key in the .env file and try again.',
        timestamp: new Date().toISOString(),
      };

      set((state) => ({
        messages: [...state.messages, errorMessage],
        isLoading: false,
      }));
    }
  },
}));

export default useChatStore;
