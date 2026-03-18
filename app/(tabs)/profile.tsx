import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../features/auth/AuthContext';
import { signOut } from '../../services/auth';
import { COLORS, FITNESS_GOALS, ACTIVITY_LEVELS } from '../../lib/constants';
import type { FitnessGoal } from '../../types';

export default function ProfileScreen() {
  const { user, profile, isDemoMode, logoutDemo } = useAuth();
  const [isSigning, setIsSigning] = useState(false);

  const handleSignOut = async () => {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          setIsSigning(true);
          if (isDemoMode) {
            logoutDemo();
            router.replace('/(auth)/login');
            return;
          }
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>프로필을 설정해주세요</Text>
          <TouchableOpacity style={styles.setupButton} onPress={() => router.push('/onboarding')}>
            <Text style={styles.setupButtonText}>프로필 설정하기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const goalInfo = FITNESS_GOALS[profile.goal];
  const activityInfo = ACTIVITY_LEVELS[profile.activity_level];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.memberSince}>Member Profile</Text>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            {isDemoMode && (
              <View style={styles.demoBadge}>
                <Text style={styles.demoBadgeText}>데모 모드</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.editButton} onPress={() => router.push('/onboarding')}>
            <Text style={styles.editButtonText}>수정</Text>
          </TouchableOpacity>
        </View>

        {/* Body stats bento */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>체중</Text>
            <Text style={styles.statValue}>{profile.weight_kg}</Text>
            <Text style={styles.statUnit}>kg</Text>
          </View>
          {profile.body_fat_percentage != null ? (
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>체지방률</Text>
              <Text style={styles.statValue}>{profile.body_fat_percentage}</Text>
              <Text style={styles.statUnit}>%</Text>
            </View>
          ) : (
            <TouchableOpacity style={[styles.statCard, styles.statCardEmpty]} onPress={() => router.push('/onboarding')}>
              <Text style={styles.statLabelEmpty}>체지방률</Text>
              <Text style={styles.statAddText}>+ 추가</Text>
            </TouchableOpacity>
          )}
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>키</Text>
            <Text style={styles.statValue}>{profile.height_cm}</Text>
            <Text style={styles.statUnit}>cm</Text>
          </View>
        </View>

        {/* Goal card */}
        <View style={[styles.goalCard, { borderLeftColor: goalInfo.color }]}>
          <View style={styles.goalLeft}>
            <Text style={styles.goalEmoji}>{goalInfo.emoji}</Text>
            <View>
              <Text style={[styles.goalLabel, { color: goalInfo.color }]}>{goalInfo.label}</Text>
              <Text style={styles.goalDesc}>{goalInfo.description}</Text>
              <Text style={styles.goalDetail}>{goalInfo.detail}</Text>
            </View>
          </View>
        </View>

        {/* Energy stats */}
        <View style={styles.card}>
          <Text style={styles.cardSectionLabel}>ENERGY STATS</Text>
          <Text style={styles.cardSectionTitle}>대사량</Text>
          <Text style={styles.formulaText}>
            {profile.body_fat_percentage != null
              ? 'Katch-McArdle 공식 (체지방률 기반)'
              : 'Mifflin-St Jeor 공식'}
          </Text>
          <View style={styles.energyRow}>
            <View style={styles.energyItem}>
              <Text style={styles.energyLabel}>BMR</Text>
              <Text style={styles.energyValue}>{profile.bmr.toLocaleString()}</Text>
              <Text style={styles.energyUnit}>kcal</Text>
              <Text style={styles.energyDesc}>완전 휴식 시 소모</Text>
            </View>
            <View style={styles.energyDivider} />
            <View style={styles.energyItem}>
              <Text style={styles.energyLabel}>TDEE</Text>
              <Text style={styles.energyValue}>{profile.tdee.toLocaleString()}</Text>
              <Text style={styles.energyUnit}>kcal</Text>
              <Text style={styles.energyDesc}>{activityInfo.label}</Text>
            </View>
          </View>
          <View style={styles.surplusRow}>
            <Text style={styles.surplusLabel}>목표 조정</Text>
            <Text style={[
              styles.surplusValue,
              { color: profile.daily_calorie_target > profile.tdee ? COLORS.secondary : COLORS.primary }
            ]}>
              {profile.daily_calorie_target > profile.tdee
                ? `+${profile.daily_calorie_target - profile.tdee}`
                : profile.daily_calorie_target < profile.tdee
                  ? `-${profile.tdee - profile.daily_calorie_target}`
                  : '±0'} kcal
            </Text>
          </View>
        </View>

        {/* Daily targets */}
        <View style={styles.card}>
          <Text style={styles.cardSectionLabel}>DAILY TARGETS</Text>
          <Text style={styles.cardSectionTitle}>일일 목표</Text>

          <View style={styles.calorieTargetCard}>
            <Text style={styles.calorieTargetLabel}>칼로리</Text>
            <View style={styles.calorieTargetRow}>
              <Text style={styles.calorieTargetValue}>{profile.daily_calorie_target.toLocaleString()}</Text>
              <Text style={styles.calorieTargetUnit}>kcal</Text>
            </View>
          </View>

          <View style={styles.macroTargetRow}>
            <MacroTarget label="단백질" value={profile.daily_protein_target} unit="g" color={COLORS.protein} pct={Math.round(profile.daily_protein_target * 4 / profile.daily_calorie_target * 100)} />
            <MacroTarget label="탄수화물" value={profile.daily_carb_target} unit="g" color={COLORS.carbs} pct={Math.round(profile.daily_carb_target * 4 / profile.daily_calorie_target * 100)} />
            <MacroTarget label="지방" value={profile.daily_fat_target} unit="g" color={COLORS.fat} pct={Math.round(profile.daily_fat_target * 9 / profile.daily_calorie_target * 100)} />
          </View>

          <Text style={styles.proteinBasis}>
            {profile.lean_body_mass != null
              ? `단백질: LBM ${profile.lean_body_mass}kg 기준`
              : `단백질: 체중 ${profile.weight_kg}kg 기준`}
          </Text>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          {isSigning
            ? <ActivityIndicator color={COLORS.error} />
            : <Text style={styles.signOutText}>로그아웃</Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

function MacroTarget({ label, value, unit, color, pct }: { label: string; value: number; unit: string; color: string; pct: number }) {
  return (
    <View style={macroTargetStyles.container}>
      <View style={[macroTargetStyles.dot, { backgroundColor: color }]} />
      <Text style={macroTargetStyles.label}>{label}</Text>
      <Text style={[macroTargetStyles.value, { color }]}>{value}{unit}</Text>
      <Text style={macroTargetStyles.pct}>{pct}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary },
  setupButton: { backgroundColor: COLORS.primary, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14 },
  setupButtonText: { color: COLORS.primaryContainer, fontWeight: '700', fontSize: 15 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16,
  },
  memberSince: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: COLORS.primary, marginBottom: 4 },
  name: { fontSize: 26, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  email: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  demoBadge: { backgroundColor: COLORS.secondaryContainer + '40', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4, alignSelf: 'flex-start' },
  demoBadgeText: { fontSize: 11, color: COLORS.secondary, fontWeight: '700' },
  editButton: { backgroundColor: COLORS.secondaryContainer + '60', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8 },
  editButtonText: { color: COLORS.secondary, fontWeight: '700', fontSize: 14 },

  statsGrid: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, gap: 8 },
  statCard: {
    flex: 1, backgroundColor: COLORS.surfaceContainerLowest, borderRadius: 20, padding: 16,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  statCardEmpty: { borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed' },
  statLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: COLORS.textSecondary, marginBottom: 6 },
  statLabelEmpty: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: COLORS.textSecondary, marginBottom: 6 },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  statUnit: { fontSize: 11, color: COLORS.textSecondary },
  statAddText: { fontSize: 14, color: COLORS.primary, fontWeight: '700', marginTop: 4 },

  goalCard: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: COLORS.surfaceContainerLowest, borderRadius: 20, padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  goalLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  goalEmoji: { fontSize: 28 },
  goalLabel: { fontSize: 17, fontWeight: '800' },
  goalDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  goalDetail: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4, fontStyle: 'italic' },

  card: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: COLORS.surfaceContainerLowest, borderRadius: 24, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardSectionLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: COLORS.textSecondary, marginBottom: 4 },
  cardSectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 12, letterSpacing: -0.3 },
  formulaText: { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic', marginBottom: 16 },

  energyRow: { flexDirection: 'row', alignItems: 'center' },
  energyItem: { flex: 1, alignItems: 'center' },
  energyLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: COLORS.textSecondary, marginBottom: 4 },
  energyValue: { fontSize: 24, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  energyUnit: { fontSize: 11, color: COLORS.textSecondary },
  energyDesc: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
  energyDivider: { width: 1, height: 50, backgroundColor: COLORS.border },
  surplusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.surfaceContainerHighest },
  surplusLabel: { fontSize: 13, color: COLORS.textSecondary },
  surplusValue: { fontSize: 16, fontWeight: '800' },

  calorieTargetCard: { backgroundColor: COLORS.background, borderRadius: 16, padding: 16, marginBottom: 12, alignItems: 'center' },
  calorieTargetLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: COLORS.textSecondary, marginBottom: 4 },
  calorieTargetRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  calorieTargetValue: { fontSize: 36, fontWeight: '800', color: COLORS.primary, letterSpacing: -1 },
  calorieTargetUnit: { fontSize: 14, color: COLORS.textSecondary },
  macroTargetRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  proteinBasis: { fontSize: 11, color: COLORS.textSecondary, fontStyle: 'italic' },

  signOutButton: {
    marginHorizontal: 16, marginTop: 4, marginBottom: 40,
    borderWidth: 1.5, borderColor: COLORS.error + '40',
    borderRadius: 16, paddingVertical: 14, alignItems: 'center',
  },
  signOutText: { color: COLORS.error, fontWeight: '700', fontSize: 15 },
});

const macroTargetStyles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: COLORS.background,
    borderRadius: 16, padding: 12, alignItems: 'center', gap: 3,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600' },
  value: { fontSize: 16, fontWeight: '800' },
  pct: { fontSize: 11, color: COLORS.textSecondary },
});
