import { useState } from 'react';
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
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../features/auth/AuthContext';
import { createOrUpdateUserProfile } from '../services/auth';
import { calculateAll } from '../lib/calculations';
import { COLORS, ACTIVITY_LEVELS, FITNESS_GOALS } from '../lib/constants';
import type { ActivityLevel, FitnessGoal } from '../types';

const TOTAL_STEPS = 4;

export default function OnboardingScreen() {
  const { user, isDemoMode, updateDemoProfile, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Step 1
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');

  // Step 2
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');

  // Step 3
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');

  // Step 4
  const [goal, setGoal] = useState<FitnessGoal>('lean_bulk');

  const canNext = () => {
    if (step === 1) return name.trim() && age && parseInt(age) > 0 && parseInt(age) < 120;
    if (step === 2) return height && weight && parseFloat(height) > 0 && parseFloat(weight) > 0;
    if (step === 3) return true;
    if (step === 4) return true;
    return false;
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      handleSave();
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const metrics = {
        weight_kg: parseFloat(weight),
        height_cm: parseFloat(height),
        age: parseInt(age),
        gender,
        body_fat_percentage: bodyFat ? parseFloat(bodyFat) : undefined,
        activity_level: activityLevel,
        goal,
      };

      const calc = calculateAll(metrics);

      const profileData = {
        name: name.trim(),
        age: parseInt(age),
        gender,
        height_cm: parseFloat(height),
        weight_kg: parseFloat(weight),
        body_fat_percentage: bodyFat ? parseFloat(bodyFat) : undefined,
        lean_body_mass: calc.lean_body_mass,
        activity_level: activityLevel,
        goal,
        bmr: calc.bmr,
        tdee: calc.tdee,
        daily_calorie_target: calc.daily_calorie_target,
        daily_protein_target: calc.daily_protein_target,
        daily_carb_target: calc.daily_carb_target,
        daily_fat_target: calc.daily_fat_target,
      };

      if (isDemoMode) {
        // Demo mode: save to memory only
        updateDemoProfile(profileData);
      } else {
        await createOrUpdateUserProfile(user.id, profileData);
        await refreshProfile();
      }

      router.replace('/(tabs)');
    } catch (err) {
      Alert.alert('오류', '프로필 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View
            key={i}
            style={[styles.progressDot, i + 1 <= step && styles.progressDotActive]}
          />
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {step === 1 && (
          <StepBasicInfo
            name={name} setName={setName}
            age={age} setAge={setAge}
            gender={gender} setGender={setGender}
          />
        )}
        {step === 2 && (
          <StepBodyMetrics
            height={height} setHeight={setHeight}
            weight={weight} setWeight={setWeight}
            bodyFat={bodyFat} setBodyFat={setBodyFat}
          />
        )}
        {step === 3 && (
          <StepActivityLevel
            activityLevel={activityLevel}
            setActivityLevel={setActivityLevel}
          />
        )}
        {step === 4 && (
          <StepGoal goal={goal} setGoal={setGoal} />
        )}
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigation}>
        {step > 1 && (
          <TouchableOpacity style={styles.backButton} onPress={() => setStep(step - 1)}>
            <Text style={styles.backButtonText}>← 이전</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.nextButton,
            !canNext() && styles.nextButtonDisabled,
            step > 1 && styles.nextButtonFlex,
          ]}
          onPress={handleNext}
          disabled={!canNext() || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.nextButtonText}>
              {step === TOTAL_STEPS ? '시작하기 🚀' : '다음 →'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function StepBasicInfo({ name, setName, age, setAge, gender, setGender }: any) {
  return (
    <View>
      <Text style={stepStyles.stepLabel}>STEP 1 / 4</Text>
      <Text style={stepStyles.title}>기본 정보</Text>
      <Text style={stepStyles.subtitle}>정확한 분석을 위해 알려주세요</Text>

      <Text style={stepStyles.label}>이름 (닉네임)</Text>
      <TextInput
        style={stepStyles.input}
        value={name}
        onChangeText={setName}
        placeholder="이름을 입력하세요"
        autoFocus
      />

      <Text style={stepStyles.label}>나이</Text>
      <TextInput
        style={stepStyles.input}
        value={age}
        onChangeText={setAge}
        placeholder="만 나이"
        keyboardType="number-pad"
      />

      <Text style={stepStyles.label}>성별</Text>
      <View style={stepStyles.segmentRow}>
        {(['male', 'female', 'other'] as const).map((g) => (
          <TouchableOpacity
            key={g}
            style={[stepStyles.segment, gender === g && stepStyles.segmentActive]}
            onPress={() => setGender(g)}
          >
            <Text style={[stepStyles.segmentText, gender === g && stepStyles.segmentTextActive]}>
              {g === 'male' ? '남성' : g === 'female' ? '여성' : '기타'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const BODY_FAT_REFERENCE = [
  { label: '운동선수', male: '6–13%', female: '14–20%' },
  { label: '피트니스', male: '14–17%', female: '21–24%' },
  { label: '표준 건강', male: '18–24%', female: '25–31%' },
  { label: '비만 기준', male: '25%+', female: '32%+' },
];

function StepBodyMetrics({ height, setHeight, weight, setWeight, bodyFat, setBodyFat }: any) {
  const [showRef, setShowRef] = useState(false);

  return (
    <View>
      <Text style={stepStyles.stepLabel}>STEP 2 / 4</Text>
      <Text style={stepStyles.title}>신체 측정</Text>
      <Text style={stepStyles.subtitle}>체지방률을 알면 더 정밀한 계산이 가능해요</Text>

      <View style={stepStyles.row}>
        <View style={{ flex: 1 }}>
          <Text style={stepStyles.label}>키</Text>
          <View style={stepStyles.inputWithUnit}>
            <TextInput
              style={[stepStyles.input, { flex: 1 }]}
              value={height}
              onChangeText={setHeight}
              placeholder="175"
              keyboardType="decimal-pad"
            />
            <Text style={stepStyles.unit}>cm</Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={stepStyles.label}>체중</Text>
          <View style={stepStyles.inputWithUnit}>
            <TextInput
              style={[stepStyles.input, { flex: 1 }]}
              value={weight}
              onChangeText={setWeight}
              placeholder="70"
              keyboardType="decimal-pad"
            />
            <Text style={stepStyles.unit}>kg</Text>
          </View>
        </View>
      </View>

      <View style={stepStyles.bodyFatSection}>
        <View style={stepStyles.bodyFatHeader}>
          <Text style={stepStyles.label}>체지방률 (선택)</Text>
          <View style={stepStyles.optionalBadge}>
            <Text style={stepStyles.optionalText}>선택사항</Text>
          </View>
        </View>
        <View style={stepStyles.inputWithUnit}>
          <TextInput
            style={[stepStyles.input, { flex: 1 }]}
            value={bodyFat}
            onChangeText={setBodyFat}
            placeholder="모르면 비워두세요"
            keyboardType="decimal-pad"
          />
          <Text style={stepStyles.unit}>%</Text>
        </View>

        {/* 참고표 토글 */}
        <TouchableOpacity
          style={stepStyles.refToggle}
          onPress={() => setShowRef(!showRef)}
        >
          <Text style={stepStyles.refToggleText}>
            {showRef ? '▲ 참고 수치 닫기' : '▼ 내 체지방률이 몇 %일지 모르겠어요'}
          </Text>
        </TouchableOpacity>

        {showRef && (
          <View style={stepStyles.refCard}>
            <Text style={stepStyles.refTitle}>📊 일반적인 체지방률 기준</Text>
            <View style={stepStyles.refRow}>
              <Text style={[stepStyles.refCell, stepStyles.refHeader]}>분류</Text>
              <Text style={[stepStyles.refCell, stepStyles.refHeader]}>남성</Text>
              <Text style={[stepStyles.refCell, stepStyles.refHeader]}>여성</Text>
            </View>
            {BODY_FAT_REFERENCE.map((row) => (
              <View key={row.label} style={stepStyles.refRow}>
                <Text style={stepStyles.refCell}>{row.label}</Text>
                <Text style={[stepStyles.refCell, { color: COLORS.accent }]}>{row.male}</Text>
                <Text style={[stepStyles.refCell, { color: COLORS.secondary }]}>{row.female}</Text>
              </View>
            ))}
            <View style={stepStyles.refAiHint}>
              <Text style={stepStyles.refAiText}>
                🤖 더 정확하게 알고 싶다면 앱 시작 후{'\n'}
                <Text style={{ fontWeight: '700' }}>AI 코치</Text>에게 "내 체지방률 추정해줘"라고 물어보세요{'\n'}
                키·체중·나이·성별로 대략적인 추정이 가능합니다
              </Text>
            </View>
          </View>
        )}

        <Text style={stepStyles.bodyFatHint}>
          💡 입력 시 → Katch-McArdle 공식 (LBM 기반 BMR){'\n'}
          미입력 시 → Mifflin-St Jeor 공식으로 자동 계산
        </Text>
      </View>
    </View>
  );
}

function StepActivityLevel({ activityLevel, setActivityLevel }: any) {
  return (
    <View>
      <Text style={stepStyles.stepLabel}>STEP 3 / 4</Text>
      <Text style={stepStyles.title}>활동 수준</Text>
      <Text style={stepStyles.subtitle}>일상 + 운동을 합산해서 선택하세요</Text>

      {(Object.entries(ACTIVITY_LEVELS) as [ActivityLevel, any][]).map(([key, val]) => (
        <TouchableOpacity
          key={key}
          style={[stepStyles.optionCard, activityLevel === key && stepStyles.optionCardActive]}
          onPress={() => setActivityLevel(key)}
        >
          <View style={stepStyles.optionCardContent}>
            <View style={{ flex: 1 }}>
              <Text style={[stepStyles.optionLabel, activityLevel === key && stepStyles.optionLabelActive]}>
                {val.label}
              </Text>
              <Text style={stepStyles.optionDesc}>{val.description}</Text>
            </View>
            {activityLevel === key && <Text style={stepStyles.checkmark}>✓</Text>}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function StepGoal({ goal, setGoal }: any) {
  return (
    <View>
      <Text style={stepStyles.stepLabel}>STEP 4 / 4</Text>
      <Text style={stepStyles.title}>목표 선택</Text>
      <Text style={stepStyles.subtitle}>목표에 맞는 칼로리와 탄단지를 계산해드려요</Text>

      {(Object.entries(FITNESS_GOALS) as [FitnessGoal, any][]).map(([key, val]) => (
        <TouchableOpacity
          key={key}
          style={[
            stepStyles.goalCard,
            goal === key && stepStyles.goalCardActive,
            goal === key && { borderColor: val.color },
          ]}
          onPress={() => setGoal(key)}
        >
          <View style={stepStyles.goalCardContent}>
            <Text style={stepStyles.goalEmoji}>{val.emoji}</Text>
            <View style={{ flex: 1 }}>
              <View style={stepStyles.goalTitleRow}>
                <Text style={[stepStyles.goalLabel, goal === key && { color: val.color }]}>
                  {val.label}
                </Text>
                <Text style={stepStyles.goalDesc}>{val.description}</Text>
              </View>
              <Text style={stepStyles.goalDetail}>{val.detail}</Text>
            </View>
            {goal === key && (
              <View style={[stepStyles.goalCheck, { backgroundColor: val.color }]}>
                <Text style={stepStyles.goalCheckText}>✓</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 16,
    paddingBottom: 8,
  },
  progressDot: {
    width: 60,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  progressDotActive: { backgroundColor: COLORS.primary },
  content: { padding: 24, paddingBottom: 16 },
  navigation: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingBottom: 32,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  backButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '500' },
  nextButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonFlex: { flex: 1 },
  nextButtonDisabled: { opacity: 0.4 },
  nextButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
});

const stepStyles = StyleSheet.create({
  stepLabel: { fontSize: 12, color: COLORS.primary, fontWeight: '600', letterSpacing: 1, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: 'bold', color: COLORS.text, marginBottom: 6 },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, marginBottom: 28, lineHeight: 22 },
  label: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500', marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  row: { flexDirection: 'row', gap: 12 },
  inputWithUnit: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unit: { fontSize: 15, color: COLORS.textSecondary, fontWeight: '500', width: 24 },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segment: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  segmentActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  segmentText: { fontSize: 15, color: COLORS.textSecondary, fontWeight: '500' },
  segmentTextActive: { color: COLORS.white, fontWeight: '700' },
  bodyFatSection: { marginTop: 8 },
  bodyFatHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 8 },
  optionalBadge: {
    backgroundColor: COLORS.secondary + '20',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  optionalText: { fontSize: 11, color: COLORS.secondary, fontWeight: '600' },
  bodyFatHint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginTop: 10,
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 10,
  },
  refToggle: {
    marginTop: 10,
    paddingVertical: 8,
  },
  refToggleText: {
    fontSize: 13,
    color: COLORS.accent,
    fontWeight: '500',
  },
  refCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  refTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
  },
  refRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  refCell: {
    flex: 1,
    fontSize: 12,
    color: COLORS.text,
    textAlign: 'center',
  },
  refHeader: {
    fontWeight: '700',
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  refAiHint: {
    marginTop: 10,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  refAiText: {
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 18,
  },
  optionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  optionCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '08' },
  optionCardContent: { flexDirection: 'row', alignItems: 'center' },
  optionLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 3 },
  optionLabelActive: { color: COLORS.primaryDark },
  optionDesc: { fontSize: 13, color: COLORS.textSecondary },
  checkmark: { fontSize: 18, color: COLORS.primary, fontWeight: 'bold', marginLeft: 8 },
  goalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  goalCardActive: { backgroundColor: '#FAFAFA' },
  goalCardContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  goalEmoji: { fontSize: 28 },
  goalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  goalLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  goalDesc: { fontSize: 12, color: COLORS.textSecondary },
  goalDetail: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  goalCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  goalCheckText: { color: COLORS.white, fontSize: 13, fontWeight: 'bold' },
});
