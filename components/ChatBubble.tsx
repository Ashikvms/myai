import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { format, parseISO } from 'date-fns';
import Colors from '../constants/Colors';
import { ChatMessage } from '../types';

interface ChatBubbleProps {
  message: ChatMessage;
}

export default function ChatBubble({ message }: ChatBubbleProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const isUser = message.role === 'user';

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.assistantContainer,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.userBubble, { backgroundColor: colors.primary }]
            : [styles.assistantBubble, { backgroundColor: colors.surface }],
          !isUser && {
            shadowColor: colors.cardShadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 1,
            shadowRadius: 4,
            elevation: 2,
          },
        ]}
      >
        <Text
          style={[
            styles.text,
            { color: isUser ? '#FFFFFF' : colors.text },
          ]}
        >
          {message.content}
        </Text>
      </View>
      <Text
        style={[
          styles.timestamp,
          { color: colors.textTertiary },
          isUser && styles.timestampRight,
        ]}
      >
        {format(parseISO(message.timestamp), 'h:mm a')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    padding: 14,
    borderRadius: 18,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    marginHorizontal: 4,
  },
  timestampRight: {
    textAlign: 'right',
  },
});
