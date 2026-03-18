import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../features/auth/AuthContext';
import { getChatResponse } from '../../services/openai';
import { getDailyNutrition } from '../../services/nutrition';
import { COLORS } from '../../lib/constants';
import type { ChatMessage, DailyNutrition } from '../../types';

export default function CoachScreen() {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      role: 'assistant',
      content: `안녕하세요! 저는 AI 영양 코치입니다. 🥗\n식단 계획, 영양 정보, 건강한 식습관에 대해 무엇이든 물어보세요!`,
      created_at: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [todayNutrition, setTodayNutrition] = useState<DailyNutrition | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    getDailyNutrition(user.id, today)
      .then(setTodayNutrition)
      .catch(console.error);
  }, [user]);

  const sendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const allMessages = [...messages, userMessage];
      const response = await getChatResponse(allMessages, {
        userProfile: profile ?? undefined,
        todayNutrition: todayNutrition ?? undefined,
      });

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '죄송합니다. 응답을 생성하는 중 오류가 발생했습니다. 다시 시도해주세요.',
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const quickQuestions = [
    '오늘 식단 평가해줘',
    '단백질 더 섭취하는 방법',
    '건강한 간식 추천해줘',
    '다이어트 식단 알려줘',
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI 영양 코치</Text>
        <Text style={styles.subtitle}>GPT-4 기반 개인 맞춤 코칭</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={
          isTyping ? (
            <View style={styles.typingIndicator}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.typingText}>코치가 답변 중...</Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.messageList}
      />

      {/* Quick Questions */}
      {messages.length <= 1 && (
        <View style={styles.quickQuestionsContainer}>
          <Text style={styles.quickTitle}>빠른 질문</Text>
          <View style={styles.quickQuestions}>
            {quickQuestions.map((q) => (
              <TouchableOpacity
                key={q}
                style={styles.quickButton}
                onPress={() => setInput(q)}
              >
                <Text style={styles.quickButtonText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="메시지를 입력하세요..."
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || isTyping) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!input.trim() || isTyping}
          >
            <Text style={styles.sendButtonText}>전송</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <View style={[bubbleStyles.container, isUser && bubbleStyles.containerUser]}>
      {!isUser && (
        <View style={bubbleStyles.avatar}>
          <Text style={bubbleStyles.avatarText}>🤖</Text>
        </View>
      )}
      <View style={[bubbleStyles.bubble, isUser ? bubbleStyles.bubbleUser : bubbleStyles.bubbleAI]}>
        <Text style={[bubbleStyles.text, isUser && bubbleStyles.textUser]}>
          {message.content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
  subtitle: { fontSize: 12, color: COLORS.textSecondary },
  messageList: { padding: 16, paddingBottom: 8 },
  typingIndicator: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  typingText: { fontSize: 14, color: COLORS.textSecondary, fontStyle: 'italic' },
  quickQuestionsContainer: { paddingHorizontal: 16, paddingBottom: 8 },
  quickTitle: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 },
  quickQuestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  quickButtonText: { fontSize: 13, color: COLORS.primary },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  sendButtonDisabled: { opacity: 0.4 },
  sendButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
});

const bubbleStyles = StyleSheet.create({
  container: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
  containerUser: { justifyContent: 'flex-end' },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: { fontSize: 16 },
  bubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleAI: { backgroundColor: COLORS.surface, borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  text: { fontSize: 15, color: COLORS.text, lineHeight: 22 },
  textUser: { color: COLORS.white },
});
