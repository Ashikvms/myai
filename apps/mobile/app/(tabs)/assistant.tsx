import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  StyleSheet,
  Platform,
} from 'react-native';

const COLORS = {
  primary: '#6366F1',
  bg: '#FAFAFA',
  surface: '#FFFFFF',
  text: '#111',
  textSecondary: '#666',
};

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: string;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    text: "Hello! I'm your Life Admin AI assistant. I can help you manage tasks, track bills, organize documents, and more. What would you like help with today?",
    sender: 'assistant',
    timestamp: '9:00 AM',
  },
  {
    id: '2',
    text: 'What bills do I have coming up?',
    sender: 'user',
    timestamp: '9:01 AM',
  },
  {
    id: '3',
    text: "You have 2 bills due soon:\n\n1. Electricity Bill - $142.50 (due Mar 18)\n2. Internet Service - $79.99 (due Mar 22)\n\nWould you like me to set up payment reminders or schedule autopay for any of these?",
    sender: 'assistant',
    timestamp: '9:01 AM',
  },
  {
    id: '4',
    text: 'Can you remind me about my upcoming tasks?',
    sender: 'user',
    timestamp: '9:02 AM',
  },
];

function getAIResponse(input: string): string {
  const lower = input.toLowerCase();

  if (lower.includes('bill') || lower.includes('pay')) {
    return "I found 2 upcoming bills:\n\n1. Electricity - $142.50 (due Mar 18)\n2. Internet - $79.99 (due Mar 22)\n\nWould you like me to set up autopay or reminders?";
  }
  if (lower.includes('task') || lower.includes('todo')) {
    return "Here are your pending tasks:\n\n1. Renew car insurance (High - Mar 25)\n2. Schedule dentist appointment (Medium - Mar 20)\n3. File tax returns (High - Apr 15)\n4. Update passport (Medium - Apr 1)\n\nWould you like to add a new task or update any of these?";
  }
  if (lower.includes('document') || lower.includes('doc') || lower.includes('file')) {
    return "You have 7 documents organized across categories:\n\n- 2 Tax documents\n- 2 Insurance documents\n- 1 Medical record\n- 1 Housing document\n- 1 Identity document\n\nWould you like to upload a new document or search for something specific?";
  }
  if (lower.includes('subscription') || lower.includes('cancel')) {
    return "You have 5 active subscriptions totaling $78/month:\n\n- Netflix: $15.99\n- Spotify: $9.99\n- iCloud: $2.99\n- Gym: $29.99\n- Adobe CC: $19.99\n\nI noticed your gym membership hasn't been used in 2 months. Want me to help cancel it?";
  }
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return "Hello! How can I help you today? I can assist with:\n\n- Managing tasks and reminders\n- Tracking bills and subscriptions\n- Organizing documents\n- Scheduling appointments\n\nJust ask me anything!";
  }

  return "I'd be happy to help with that! I can assist you with managing tasks, tracking bills, organizing documents, and scheduling appointments. Could you provide a bit more detail about what you need?";
}

export default function AssistantScreen() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    const userMessage: Message = {
      id: Date.now().toString(),
      text: trimmed,
      sender: 'user',
      timestamp: timeStr,
    };

    const aiResponse: Message = {
      id: (Date.now() + 1).toString(),
      text: getAIResponse(trimmed),
      sender: 'assistant',
      timestamp: timeStr,
    };

    setMessages((prev) => [...prev, userMessage, aiResponse]);
    setInputText('');

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';

    return (
      <View
        style={[
          styles.messageRow,
          isUser ? styles.messageRowUser : styles.messageRowAssistant,
        ]}
      >
        {!isUser && (
          <View style={styles.assistantAvatar}>
            <Text style={styles.assistantAvatarText}>✨</Text>
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userMessageText : styles.assistantMessageText,
            ]}
          >
            {item.text}
          </Text>
          <Text
            style={[
              styles.messageTime,
              isUser ? styles.userTime : styles.assistantTime,
            ]}
          >
            {item.timestamp}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Assistant ✨</Text>
        <Text style={styles.headerSubtitle}>Your personal life admin helper</Text>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: false })
        }
      />

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            placeholder="Ask me anything..."
            placeholderTextColor="#9CA3AF"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !inputText.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            activeOpacity={0.7}
            disabled={!inputText.trim()}
          >
            <Text style={styles.sendButtonText}>↑</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAssistant: {
    justifyContent: 'flex-start',
  },
  assistantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  assistantAvatarText: {
    fontSize: 16,
  },
  messageBubble: {
    maxWidth: '78%',
    borderRadius: 20,
    padding: 14,
    paddingBottom: 8,
  },
  userBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  assistantMessageText: {
    color: COLORS.text,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 6,
    fontWeight: '400',
  },
  userTime: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  assistantTime: {
    color: COLORS.textSecondary,
  },
  inputBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    maxHeight: 100,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  sendButtonText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
    marginTop: -1,
  },
});
