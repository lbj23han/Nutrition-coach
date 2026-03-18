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

  // Camera & confirm sheet state
  const [cameraVisible, setCameraVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [visionResult, setVisionResult] = useState<VisionFoodResult | null>(
    null,
  );

  // Handle vision result from camera
  const handleVisionResult = (result: VisionFoodResult) => {
    setVisionResult(result);
    setConfirmVisible(true);
  };

  // Handle text analyze
  const handleTextAnalyze = async () => {
    if (!textInput.trim()) {
      Alert.alert(
        "알림",
        '음식명을 입력해주세요.\n예: "밥 한 공기와 김치", "아메리카노 한 잔"',
      );
      return;
    }
    setIsAnalyzing(true);
    try {
      const result = await analyzeFoodWithAI(textInput.trim());
      if (!result) throw new Error("분석 실패");

      // Convert single food result to VisionFoodResult format
      const vr: VisionFoodResult = {
        description: `"${textInput.trim()}" 분석 결과`,
        items: [result],
      };
      setVisionResult(vr);
      setConfirmVisible(true);
    } catch {
      Alert.alert("오류", "분석에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle confirmed items → log all
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
          }),
        ),
      );

      const totalCal = Math.round(items.reduce((s, i) => s + i.calories, 0));
      Alert.alert(
        "기록 완료 ✓",
        `${items.length}개 항목 (${totalCal} kcal) 기록됐습니다!`,
      );
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
      >
        <View style={styles.header}>
          <Text style={styles.title}>식사 기록</Text>
        </View>

        {/* Mode toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === "camera" && styles.modeButtonActive,
            ]}
            onPress={() => setMode("camera")}
          >
            <Text
              style={[
                styles.modeButtonText,
                mode === "camera" && styles.modeButtonTextActive,
              ]}
            >
              📷 카메라
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === "menu" && styles.modeButtonActive,
            ]}
            onPress={() => setMode("menu")}
          >
            <Text
              style={[
                styles.modeButtonText,
                mode === "menu" && styles.modeButtonTextActive,
              ]}
            >
              ✏️ 직접 입력
            </Text>
          </TouchableOpacity>
        </View>

        {/* Meal type selector */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>식사 유형</Text>
          <View style={styles.mealTypeRow}>
            {(Object.keys(MEAL_TYPES) as MealType[]).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.mealChip,
                  selectedMeal === type && styles.mealChipActive,
                ]}
                onPress={() => setSelectedMeal(type)}
              >
                <Text
                  style={[
                    styles.mealChipText,
                    selectedMeal === type && styles.mealChipTextActive,
                  ]}
                >
                  {MEAL_TYPES[type]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Camera mode */}
        {mode === "camera" && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>AI 음식 인식</Text>
            <Text style={styles.hint}>
              카메라로 찍거나 갤러리에서 사진을 선택하면{"\n"}AI가 음식과 영양
              정보를 자동으로 분석해요
            </Text>

            <TouchableOpacity
              style={styles.cameraButton}
              onPress={() => setCameraVisible(true)}
            >
              <Text style={styles.cameraButtonIcon}>📷</Text>
              <Text style={styles.cameraButtonText}>카메라로 촬영</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>또는</Text>
              <View style={styles.divider} />
            </View>

            <TouchableOpacity
              style={styles.galleryButton}
              onPress={() => {
                // Trigger gallery via camera component with gallery flag
                setCameraVisible(true);
              }}
            >
              <Text style={styles.galleryButtonText}>🖼 갤러리에서 선택</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Text mode */}
        {mode === "menu" && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>자유롭게 입력하세요</Text>
            <Text style={styles.hint}>
              메뉴명, 중량, 개수를 자유롭게 적어주세요{"\n"}예: "삼겹살 200g과
              공깃밥", "바나나 1개"
            </Text>

            <TextInput
              style={styles.textArea}
              placeholder="먹은 음식을 입력하세요..."
              value={textInput}
              onChangeText={setTextInput}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[
                styles.analyzeButton,
                isAnalyzing && styles.buttonDisabled,
              ]}
              onPress={handleTextAnalyze}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.analyzeButtonText}>🔍 AI 분석</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 팁</Text>
          <Text style={styles.tipText}>
            • 카메라: 음식 사진을 찍으면 AI가 메뉴와 중량을 추정해요
          </Text>
          <Text style={styles.tipText}>
            • 직접 입력: "닭가슴살 150g, 밥 반 공기" 처럼 입력하면 돼요
          </Text>
          <Text style={styles.tipText}>• 결과는 직접 수정할 수 있어요</Text>
        </View>
      </ScrollView>

      {/* Camera Modal */}
      <FoodCamera
        visible={cameraVisible}
        onClose={() => setCameraVisible(false)}
        onResult={handleVisionResult}
      />

      {/* Confirm Sheet */}
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
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: "bold", color: COLORS.text },
  modeToggle: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  modeButtonActive: { backgroundColor: COLORS.primary },
  modeButtonText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  modeButtonTextActive: { color: COLORS.white, fontWeight: "700" },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 6,
  },
  hint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  mealTypeRow: { flexDirection: "row", gap: 8 },
  mealChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  mealChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  mealChipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  mealChipTextActive: { color: COLORS.white, fontWeight: "600" },
  cameraButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: "center",
    gap: 8,
  },
  cameraButtonIcon: { fontSize: 36 },
  cameraButtonText: { color: COLORS.white, fontSize: 16, fontWeight: "600" },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
    gap: 12,
  },
  divider: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontSize: 13, color: COLORS.textSecondary },
  galleryButton: {
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  galleryButtonText: { color: COLORS.accent, fontSize: 15, fontWeight: "600" },
  textArea: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    minHeight: 90,
    marginBottom: 14,
  },
  analyzeButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.5 },
  analyzeButtonText: { color: COLORS.white, fontWeight: "600", fontSize: 15 },
  tipsCard: {
    marginHorizontal: 16,
    marginBottom: 32,
    backgroundColor: COLORS.primaryLight + "15",
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primaryDark,
    marginBottom: 4,
  },
  tipText: { fontSize: 13, color: COLORS.text, lineHeight: 20 },
});
