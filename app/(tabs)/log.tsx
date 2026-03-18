import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../../features/auth/AuthContext";
import { logFood } from "../../services/nutrition";
import {
  analyzeFoodWithAI,
  RateLimitError,
  type VisionFoodResult,
} from "../../services/openai";
import { FoodCamera } from "../../components/nutrition/FoodCamera";
import {
  FoodConfirmSheet,
  type ConfirmedFoodItem,
} from "../../components/nutrition/FoodConfirmSheet";
import { COLORS, MEAL_TYPES } from "../../lib/constants";
import type { MealType } from "../../types";

type InputMode = "menu" | "camera";

export default function LogScreen() {
  const { user } = useAuth();

  const [mode, setMode] = useState<InputMode>("menu");
  const [textInput, setTextInput] = useState("");
  const [selectedMeal, setSelectedMeal] = useState<MealType>("lunch");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [cameraVisible, setCameraVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [visionResult, setVisionResult] = useState<VisionFoodResult | null>(null);

  const handleVisionResult = (result: VisionFoodResult) => {
    setVisionResult(result);
    setConfirmVisible(true);
  };

  const handleTextAnalyze = async () => {
    if (!textInput.trim()) {
      Alert.alert("알림", '음식명을 입력해주세요.\n예: "밥 한 공기와 김치", "아메리카노 한 잔"');
      return;
    }
    setIsAnalyzing(true);
    try {
      const result = await analyzeFoodWithAI(textInput.trim());
      if (!result) throw new Error("분석 실패");
      const vr: VisionFoodResult = {
        description: `"${textInput.trim()}" 분석 결과`,
        items: [result],
      };
      setVisionResult(vr);
      setConfirmVisible(true);
    } catch (err) {
      const msg = err instanceof RateLimitError
        ? "AI 사용 횟수(10회)를 모두 소진했습니다. 프로토타입 제한으로 더 이상 이용할 수 없습니다."
        : "분석에 실패했습니다. 다시 시도해주세요.";
      Alert.alert("오류", msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirm = async (items: ConfirmedFoodItem[]) => {
    if (!user) return;
    setConfirmVisible(false);
    try {
      await Promise.all(
        items.map((item) =>
          logFood(user.id, {
            food_name: item.name,
            meal_type: selectedMeal,
            calories: item.calories,
            protein_g: item.protein,
            carbs_g: item.carbs,
            fat_g: item.fat,
            quantity: item.quantity,
            unit: item.unit,
            logged_at: new Date().toISOString(),
          })
        )
      );
      const totalCal = Math.round(items.reduce((s, i) => s + i.calories, 0));
      Alert.alert("기록 완료", `${items.length}개 항목 (${totalCal} kcal) 기록됐습니다!`);
      setTextInput("");
      setVisionResult(null);
    } catch {
      Alert.alert("오류", "기록에 실패했습니다.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerLabel}>Meal Log</Text>
          <Text style={styles.title}>식사 기록</Text>
        </View>

        {/* Daily progress bar */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressCalLabel}>오늘 섭취</Text>
            <View style={styles.progressBadge}>
              <Text style={styles.progressBadgeText}>AI Log</Text>
            </View>
          </View>
        </View>

        {/* Mode toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeButton, mode === "camera" && styles.modeButtonActive]}
            onPress={() => setMode("camera")}
          >
            <Text style={[styles.modeButtonText, mode === "camera" && styles.modeButtonTextActive]}>
              📷  카메라
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mode === "menu" && styles.modeButtonActive]}
            onPress={() => setMode("menu")}
          >
            <Text style={[styles.modeButtonText, mode === "menu" && styles.modeButtonTextActive]}>
              ✏️  직접 입력
            </Text>
          </TouchableOpacity>
        </View>

        {/* Meal type */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>MEAL TYPE</Text>
          <Text style={styles.cardTitle}>식사 유형</Text>
          <View style={styles.mealTypeRow}>
            {(Object.keys(MEAL_TYPES) as MealType[]).map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.mealChip, selectedMeal === type && styles.mealChipActive]}
                onPress={() => setSelectedMeal(type)}
              >
                <Text style={[styles.mealChipText, selectedMeal === type && styles.mealChipTextActive]}>
                  {MEAL_TYPES[type]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Camera mode */}
        {mode === "camera" && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>AI VISION</Text>
            <Text style={styles.cardTitle}>AI 음식 인식</Text>
            <Text style={styles.cardHint}>
              카메라로 찍거나 갤러리에서 사진을 선택하면{"\n"}AI가 음식과 영양 정보를 자동으로 분석해요
            </Text>
            <TouchableOpacity style={styles.aiButton} onPress={() => setCameraVisible(true)}>
              <View style={styles.aiButtonInner}>
                <Text style={styles.aiButtonTitle}>AI Log</Text>
                <Text style={styles.aiButtonSub}>Snapshot or talk to record your meal</Text>
              </View>
              <Text style={styles.aiButtonIcon}>✦</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>또는</Text>
              <View style={styles.divider} />
            </View>

            <TouchableOpacity style={styles.galleryButton} onPress={() => setCameraVisible(true)}>
              <Text style={styles.galleryButtonText}>🖼  갤러리에서 선택</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Text mode */}
        {mode === "menu" && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>TEXT INPUT</Text>
            <Text style={styles.cardTitle}>자유롭게 입력하세요</Text>
            <Text style={styles.cardHint}>
              메뉴명, 중량, 개수를 자유롭게 적어주세요{"\n"}예: "삼겹살 200g과 공깃밥", "바나나 1개"
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="먹은 음식을 입력하세요..."
              placeholderTextColor={COLORS.textSecondary}
              value={textInput}
              onChangeText={setTextInput}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.analyzeButton, isAnalyzing && styles.buttonDisabled]}
              onPress={handleTextAnalyze}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <ActivityIndicator color={COLORS.primaryContainer} size="small" />
              ) : (
                <Text style={styles.analyzeButtonText}>AI 분석하기</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Tips</Text>
          <Text style={styles.tipText}>• 카메라: 음식 사진을 찍으면 AI가 메뉴와 중량을 추정해요</Text>
          <Text style={styles.tipText}>• 직접 입력: "닭가슴살 150g, 밥 반 공기" 처럼 입력하면 돼요</Text>
          <Text style={styles.tipText}>• 결과는 직접 수정할 수 있어요</Text>
        </View>
      </ScrollView>

      <FoodCamera visible={cameraVisible} onClose={() => setCameraVisible(false)} onResult={handleVisionResult} />
      <FoodConfirmSheet
        visible={confirmVisible}
        result={visionResult}
        mealType={selectedMeal}
        onMealTypeChange={setSelectedMeal}
        onConfirm={handleConfirm}
        onClose={() => setConfirmVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 100 },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8 },
  headerLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: COLORS.secondary, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },

  progressCard: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: COLORS.surfaceContainerLowest, borderRadius: 20, padding: 20,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressCalLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  progressBadge: { backgroundColor: COLORS.primaryContainer, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  progressBadgeText: { fontSize: 11, fontWeight: '800', color: COLORS.primary, letterSpacing: 0.5 },

  modeToggle: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 12,
    backgroundColor: COLORS.surfaceContainerLowest, borderRadius: 16, padding: 4,
  },
  modeButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  modeButtonActive: { backgroundColor: COLORS.primary },
  modeButtonText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  modeButtonTextActive: { color: COLORS.primaryContainer, fontWeight: '700' },

  card: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: COLORS.surfaceContainerLowest, borderRadius: 24, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: COLORS.textSecondary, marginBottom: 4 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 8, letterSpacing: -0.3 },
  cardHint: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 16 },

  mealTypeRow: { flexDirection: 'row', gap: 8 },
  mealChip: {
    flex: 1, paddingVertical: 10, borderRadius: 20,
    borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center',
  },
  mealChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  mealChipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  mealChipTextActive: { color: COLORS.primaryContainer, fontWeight: '700' },

  aiButton: {
    backgroundColor: COLORS.primary, borderRadius: 20,
    padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  aiButtonInner: { flex: 1 },
  aiButtonTitle: { fontSize: 20, fontWeight: '800', color: COLORS.primaryContainer, letterSpacing: -0.5 },
  aiButtonSub: { fontSize: 12, color: COLORS.primaryContainer + 'cc', marginTop: 2 },
  aiButtonIcon: { fontSize: 32, color: COLORS.primaryContainer },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 12 },
  divider: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontSize: 12, color: COLORS.textSecondary },

  galleryButton: {
    borderWidth: 1.5, borderColor: COLORS.surfaceContainerHighest,
    borderRadius: 16, paddingVertical: 14, alignItems: 'center',
  },
  galleryButtonText: { color: COLORS.text, fontSize: 14, fontWeight: '600' },

  textArea: {
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: COLORS.text, minHeight: 90, marginBottom: 14,
  },
  analyzeButton: {
    backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  analyzeButtonText: { color: COLORS.primaryContainer, fontWeight: '700', fontSize: 15, letterSpacing: 0.3 },

  tipsCard: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: COLORS.primaryContainer + '20', borderRadius: 20, padding: 16, gap: 6,
  },
  tipsTitle: { fontSize: 13, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  tipText: { fontSize: 13, color: COLORS.text, lineHeight: 20 },
});
