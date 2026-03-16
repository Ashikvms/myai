'use client';

import { useState, useRef, useEffect, KeyboardEvent, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  SendHorizontal,
  CreditCard,
  DollarSign,
  CheckSquare,
  FileText,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

const DEMO_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'user',
    content: 'What bills are due this week?',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    id: '2',
    role: 'assistant',
    content:
      'You have **2 bills due this week**:\n\n- **Electricity** — $142.50, due tomorrow (manual payment)\n- **Car Insurance** — $185.00, due in 3 days (manual payment)\n\nYour rent ($2,200) is on autopay and due in 5 days. Would you like me to set a reminder for the manual payments?',
    timestamp: new Date(Date.now() - 1000 * 60 * 4),
  },
  {
    id: '3',
    role: 'user',
    content: 'Yes, remind me about the electricity bill',
    timestamp: new Date(Date.now() - 1000 * 60 * 3),
  },
  {
    id: '4',
    role: 'assistant',
    content:
      "I'll create a reminder for you:\n\n📋 **Reminder created:**\n- Title: Pay electricity bill\n- When: Tomorrow, 9:00 AM\n- Amount: $142.50\n\nYou'll get a notification before it's due. Anything else I can help with?",
    timestamp: new Date(Date.now() - 1000 * 60 * 2),
  },
];

const SUGGESTION_CARDS = [
  { text: 'What bills are due this week?', icon: CreditCard },
  { text: 'How much am I spending on subscriptions?', icon: DollarSign },
  { text: 'What should I take care of today?', icon: CheckSquare },
  { text: 'Any documents expiring soon?', icon: FileText },
];

const QUICK_CHIPS = [
  "What's due this week?",
  'Summarize spending',
  'What should I do today?',
];

// ---------------------------------------------------------------------------
// Simulated responses
// ---------------------------------------------------------------------------

function getSimulatedResponse(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('bill')) {
    return 'Here\'s your **bill summary**:\n\n- **Electricity** — $142.50, due tomorrow\n- **Car Insurance** — $185.00, due in 3 days\n- **Rent** — $2,200.00, due in 5 days (autopay)\n- **Internet** — $79.99, due in 8 days (autopay)\n\nTotal upcoming: **$2,607.49**\n\nWould you like me to set reminders for the manual payments?';
  }

  if (lower.includes('subscription') || lower.includes('spending')) {
    return 'Here\'s your **subscription breakdown**:\n\n- **Netflix** — $15.99/mo\n- **Spotify** — $9.99/mo\n- **iCloud Storage** — $2.99/mo\n- **Gym Membership** — $49.99/mo\n- **Adobe Creative Cloud** — $54.99/mo\n\n**Total monthly subscriptions: $133.95**\n\nYour subscriptions are up 12% from last month after adding Adobe Creative Cloud. Want me to flag any you haven\'t used recently?';
  }

  if (lower.includes('today') || lower.includes('task')) {
    return 'Here\'s what\'s on your plate **today**:\n\n- ✅ Pay electricity bill ($142.50) — **due tomorrow**\n- 📄 Review and sign lease renewal — **expires in 4 days**\n- 📞 Call insurance agent about claim — **follow-up overdue**\n- 🛒 Grocery shopping — added yesterday\n\nI\'d prioritize the lease renewal and electricity bill. Want me to help with any of these?';
  }

  if (lower.includes('document') || lower.includes('expir')) {
    return 'Here are your **documents needing attention**:\n\n- 🔴 **Driver\'s License** — expires in 12 days\n- 🟡 **Lease Agreement** — renewal due in 4 days\n- 🟡 **Car Registration** — expires in 28 days\n- 🟢 **Passport** — valid until 2028\n\nI\'d recommend starting the driver\'s license renewal process soon — it can take a few days. Would you like a reminder?';
  }

  if (lower.includes('remind')) {
    return 'Here are your **upcoming reminders**:\n\n- ⏰ **Pay electricity bill** — Tomorrow, 9:00 AM\n- ⏰ **Lease renewal deadline** — Thursday, 10:00 AM\n- ⏰ **Car insurance payment** — Friday, 9:00 AM\n- ⏰ **Driver\'s license renewal** — Next week Monday\n\nWould you like to add, edit, or snooze any of these?';
  }

  return 'I can help you stay on top of your life admin! Here are some things you can ask me:\n\n- **Bills** — Check upcoming due dates and amounts\n- **Subscriptions** — Review your recurring charges\n- **Tasks** — See what needs your attention today\n- **Documents** — Track expiration dates\n- **Reminders** — Set and manage reminders\n\nWhat would you like to know about?';
}

// ---------------------------------------------------------------------------
// Markdown-lite renderer
// ---------------------------------------------------------------------------

function renderMessageContent(content: string) {
  const lines = content.split('\n');

  return lines.map((line, i) => {
    // Blank line → line break
    if (line.trim() === '') {
      return <br key={i} />;
    }

    // Bullet list item
    if (line.trim().startsWith('- ')) {
      const bulletContent = line.trim().slice(2);
      return (
        <div key={i} className="flex items-start gap-1.5 ml-1 my-0.5">
          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-50 shrink-0" />
          <span>{renderInlineFormatting(bulletContent)}</span>
        </div>
      );
    }

    return (
      <span key={i}>
        {renderInlineFormatting(line)}
        {i < lines.length - 1 ? '' : ''}
      </span>
    );
  });
}

function renderInlineFormatting(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ---------------------------------------------------------------------------
// Thinking indicator
// ---------------------------------------------------------------------------

function ThinkingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
        <Sparkles className="h-4 w-4 text-white" />
      </div>
      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-2 w-2 rounded-full bg-gray-400 dark:bg-gray-500"
              animate={{ y: [0, -6, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>(DEMO_MESSAGES);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    setTimeout(() => {
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getSimulatedResponse(trimmed),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setLoading(false);
    }, 1500);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setLoading(false);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ----------------------------------------------------------------- */}
      {/* Header */}
      {/* ----------------------------------------------------------------- */}
      <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700/60">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            AI Assistant
          </h1>
        </div>

        <AnimatePresence>
          {hasMessages && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={clearChat}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Clear Chat
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Chat area / Empty state */}
      {/* ----------------------------------------------------------------- */}
      <div
        ref={chatContainerRef}
        className="flex-1 min-h-0 overflow-y-auto"
      >
        {!hasMessages && !loading ? (
          /* ---- Empty state ---- */
          <div className="flex flex-col items-center justify-center h-full px-4 py-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center gap-6 max-w-md w-full"
            >
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <Sparkles className="h-8 w-8 text-white" />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center">
                How can I help you today?
              </h2>

              <div className="grid grid-cols-2 gap-3 w-full mt-2">
                {SUGGESTION_CARDS.map((card) => {
                  const Icon = card.icon;
                  return (
                    <motion.button
                      key={card.text}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => sendMessage(card.text)}
                      className="flex flex-col items-start gap-2.5 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1A1A] hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-md transition-all text-left group"
                    >
                      <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 transition-colors">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300 leading-snug">
                        {card.text}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        ) : (
          /* ---- Messages list ---- */
          <div className="px-4 sm:px-6 py-4 space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mr-3 mt-1">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] sm:max-w-[70%] ${
                      msg.role === 'user'
                        ? 'bg-indigo-500 text-white rounded-2xl rounded-br-md px-4 py-3'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl rounded-bl-md px-4 py-3'
                    }`}
                  >
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {renderMessageContent(msg.content)}
                    </div>
                    <div
                      className={`text-[11px] mt-1.5 ${
                        msg.role === 'user'
                          ? 'text-indigo-200'
                          : 'text-gray-400 dark:text-gray-500'
                      }`}
                    >
                      {format(msg.timestamp, 'h:mm a')}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Thinking indicator */}
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <ThinkingIndicator />
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Input area */}
      {/* ----------------------------------------------------------------- */}
      <div className="shrink-0 border-t border-gray-200 dark:border-gray-700/60 bg-white dark:bg-[#1A1A1A] px-4 sm:px-6 py-3">
        {/* Quick suggestion chips (only when messages exist) */}
        {hasMessages && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-hide">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => sendMessage(chip)}
                disabled={loading}
                className="shrink-0 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your bills, tasks, documents..."
            disabled={loading}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          />

          <motion.button
            type="submit"
            disabled={!input.trim() || loading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="shrink-0 h-10 w-10 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-opacity"
          >
            <SendHorizontal className="h-4 w-4" />
          </motion.button>
        </form>
      </div>
    </div>
  );
}
