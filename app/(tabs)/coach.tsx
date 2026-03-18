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
import { getChatResponse, RateLimitError } from '../../services/openai';
import { getDailyNutrition } from '../../services/nutrition';
import { COLORS } from '../../lib/constants';
import type { ChatMessage, DailyNutrition } from '../../types';

export default function CoachScreen() {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      role: 'assistant',
      content: `안녕하세요! 저는 AI 영양 코치입니다.\n식단 계획, 영양 정보, 건강한 식습관에 대해 무엇이든 물어보세요!`,
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
    getDailyNutrition(user.id, today).then(setTodayNutrition).catch(console.error);
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
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        created_at: new Date().toISOString(),
      }]);
    } catch (err) {
      const content = err instanceof RateLimitError
        ? 'AI 사용 횟수(10회)를 모두 소진했습니다. 프로토타입 제한으로 더 이상 이용할 수 없습니다.'
        : '죄송합니다. 응답을 생성하는 중 오류가 발생했습니다.';
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content,
        created_at: new Date().toISOString(),
      }]);
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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.aiAvatar}>
          <Text style={styles.aiAvatarIcon}>✦</Text>
          <View style={styles.aiAvatarDot} />
        </View>
        <Text style={styles.title}>Nutrition AI</Text>
        <Text style={styles.subtitle}>Always active & analyzing your data</Text>
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

      {/* Quick questions */}
      {messages.length <= 1 && (
        <View style={styles.quickContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={quickQuestions}
            keyExtractor={(q) => q}
            contentContainerStyle={styles.quickList}
            renderItem={({ item: q }) => (
              <TouchableOpacity style={styles.quickChip} onPress={() => setInput(q)}>
                <Text style={styles.quickChipText}>{q}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="코치에게 무엇이든 물어보세요..."
            placeholderTextColor={COLORS.textSecondary}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || isTyping) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!input.trim() || isTyping}
          >
            <Text style={styles.sendIcon}>→</Text>
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
          <Text style={bubbleStyles.avatarIcon}>✦</Text>
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
  header: { alignItems: 'center', paddingTop: 20, paddingBottom: 16, paddingHorizontal: 24 },
  aiAvatar: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: COLORS.primaryContainer + '40',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  aiAvatarIcon: { fontSize: 28, color: COLORS.primary },
  aiAvatarDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: COLORS.primaryContainer,
    borderWidth: 2, borderColor: COLORS.background,
  },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  messageList: { padding: 16, paddingBottom: 8 },
  typingIndicator: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  typingText: { fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic' },
  quickContainer: { paddingBottom: 8 },
  quickList: { paddingHorizontal: 16, gap: 8 },
  quickChip: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
  },
  quickChipText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  inputContainer: {
    flexDirection: 'row', margin: 12, gap: 8,
    backgroundColor: COLORS.surfaceContainerHighest,
    borderRadius: 20, padding: 8, alignItems: 'flex-end',
  },
  input: {
    flex: 1, backgroundColor: 'transparent',
    paddingHorizontal: 10, paddingVertical: 8,
    fontSize: 15, color: COLORS.text, maxHeight: 100,
  },
  sendButton: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },
  sendButtonDisabled: { opacity: 0.4 },
  sendIcon: { fontSize: 18, color: COLORS.primaryContainer, fontWeight: '700' },
});

const bubbleStyles = StyleSheet.create({
  container: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
  containerUser: { justifyContent: 'flex-end' },
  avatar: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: COLORS.primaryContainer + '40',
    justifyContent: 'center', alignItems: 'center', marginRight: 8,
  },
  avatarIcon: { fontSize: 14, color: COLORS.primary },
  bubble: { maxWidth: '75%', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12 },
  bubbleAI: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderBottomLeftRadius: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  bubbleUser: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  text: { fontSize: 15, color: COLORS.text, lineHeight: 22 },
  textUser: { color: COLORS.primaryContainer },
});
