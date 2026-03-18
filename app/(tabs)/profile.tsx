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
          <TouchableOpacity
            style={styles.setupButton}
            onPress={() => router.push('/onboarding')}
          >
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
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            {isDemoMode && (
              <View style={styles.demoBadge}>
                <Text style={styles.demoBadgeText}>데모 모드</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push('/onboarding')}
          >
            <Text style={styles.editButtonText}>수정</Text>
          </TouchableOpacity>
        </View>

        {/* Goal card */}
        <View style={[styles.goalCard, { borderLeftColor: goalInfo.color }]}>
          <Text style={styles.goalEmoji}>{goalInfo.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.goalLabel, { color: goalInfo.color }]}>{goalInfo.label}</Text>
            <Text style={styles.goalDesc}>{goalInfo.description}</Text>
          </View>
        </View>

        {/* Body stats */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>신체 측정</Text>
          <View style={styles.statsGrid}>
            <StatItem label="키" value={`${profile.height_cm}`} unit="cm" />
            <StatItem label="체중" value={`${profile.weight_kg}`} unit="kg" />
            {profile.body_fat_percentage != null && (
              <StatItem label="체지방률" value={`${profile.body_fat_percentage}`} unit="%" color={COLORS.secondary} />
            )}
            {profile.lean_body_mass != null && (
              <StatItem label="제지방량(LBM)" value={`${profile.lean_body_mass}`} unit="kg" color={COLORS.accent} />
            )}
          </View>
          {profile.body_fat_percentage == null && (
            <TouchableOpacity
              style={styles.addBfButton}
              onPress={() => router.push('/onboarding')}
            >
              <Text style={styles.addBfText}>+ 체지방률 입력하면 더 정확해요</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Metabolic stats */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>대사량</Text>
          <Text style={styles.bfFormula}>
            {profile.body_fat_percentage != null
              ? '📐 Katch-McArdle 공식 (LBM 기반)'
              : '📐 Mifflin-St Jeor 공식'}
          </Text>
          <View style={styles.metaRow}>
            <MetaItem
              label="기초대사량(BMR)"
              value={profile.bmr}
              unit="kcal"
              desc="완전 휴식 시 소모"
              color={COLORS.protein}
            />
            <MetaItem
              label="활동대사량(TDEE)"
              value={profile.tdee}
              unit="kcal"
              desc={`활동: ${activityInfo.label}`}
              color={COLORS.accent}
            />
          </View>
          <View style={styles.surplusRow}>
            <Text style={styles.surplusLabel}>목표 조정</Text>
            <Text style={[
              styles.surplusValue,
              { color: profile.daily_calorie_target > profile.tdee ? COLORS.error : COLORS.primary }
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
          <Text style={styles.sectionTitle}>일일 목표</Text>
          <View style={styles.targetRow}>
            <TargetBig label="칼로리" value={profile.daily_calorie_target} unit="kcal" color={COLORS.calories} />
          </View>
          <View style={styles.macroRow}>
            <TargetMacro label="단백질" value={profile.daily_protein_target} unit="g" color={COLORS.protein} pct={Math.round(profile.daily_protein_target * 4 / profile.daily_calorie_target * 100)} />
            <TargetMacro label="탄수화물" value={profile.daily_carb_target} unit="g" color={COLORS.carbs} pct={Math.round(profile.daily_carb_target * 4 / profile.daily_calorie_target * 100)} />
            <TargetMacro label="지방" value={profile.daily_fat_target} unit="g" color={COLORS.fat} pct={Math.round(profile.daily_fat_target * 9 / profile.daily_calorie_target * 100)} />
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

function StatItem({ label, value, unit, color = COLORS.text }: { label: string; value: string; unit: string; color?: string }) {
  return (
    <View style={statStyles.container}>
      <Text style={statStyles.label}>{label}</Text>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.unit}>{unit}</Text>
    </View>
  );
}

function MetaItem({ label, value, unit, desc, color }: { label: string; value: number; unit: string; desc: string; color: string }) {
  return (
    <View style={metaStyles.container}>
      <Text style={metaStyles.label}>{label}</Text>
      <Text style={[metaStyles.value, { color }]}>{value.toLocaleString()}</Text>
      <Text style={metaStyles.unit}>{unit}</Text>
      <Text style={metaStyles.desc}>{desc}</Text>
    </View>
  );
}

function TargetBig({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <View style={targetStyles.bigContainer}>
      <Text style={targetStyles.bigLabel}>{label}</Text>
      <View style={targetStyles.bigValueRow}>
        <Text style={[targetStyles.bigValue, { color }]}>{value.toLocaleString()}</Text>
        <Text style={targetStyles.bigUnit}>{unit}</Text>
      </View>
    </View>
  );
}

function TargetMacro({ label, value, unit, color, pct }: { label: string; value: number; unit: string; color: string; pct: number }) {
  return (
    <View style={targetStyles.macroContainer}>
      <View style={[targetStyles.macroDot, { backgroundColor: color }]} />
      <Text style={targetStyles.macroLabel}>{label}</Text>
      <Text style={[targetStyles.macroValue, { color }]}>{value}{unit}</Text>
      <Text style={targetStyles.macroPct}>{pct}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary },
  setupButton: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  setupButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 15 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: 24,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  name: { fontSize: 22, fontWeight: 'bold', color: COLORS.text },
  email: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  demoBadge: { backgroundColor: COLORS.secondary + '20', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4, alignSelf: 'flex-start' },
  demoBadgeText: { fontSize: 11, color: COLORS.secondary, fontWeight: '600' },
  editButton: { backgroundColor: COLORS.primary + '15', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  editButtonText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
  },
  goalEmoji: { fontSize: 28 },
  goalLabel: { fontSize: 17, fontWeight: '700' },
  goalDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  addBfButton: { marginTop: 12, paddingVertical: 8 },
  addBfText: { fontSize: 13, color: COLORS.accent },
  bfFormula: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 12, fontStyle: 'italic' },
  metaRow: { flexDirection: 'row', gap: 12 },
  surplusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  surplusLabel: { fontSize: 13, color: COLORS.textSecondary },
  surplusValue: { fontSize: 16, fontWeight: '700' },
  targetRow: { marginBottom: 12 },
  macroRow: { flexDirection: 'row', gap: 8 },
  proteinBasis: { fontSize: 11, color: COLORS.textSecondary, marginTop: 10, fontStyle: 'italic' },
  signOutButton: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: COLORS.error + '50',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: { color: COLORS.error, fontWeight: '600', fontSize: 15 },
});

const statStyles = StyleSheet.create({
  container: { alignItems: 'center', minWidth: 80 },
  label: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 4 },
  value: { fontSize: 22, fontWeight: 'bold' },
  unit: { fontSize: 11, color: COLORS.textSecondary },
});

const metaStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 12, padding: 12 },
  label: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 6 },
  value: { fontSize: 24, fontWeight: 'bold' },
  unit: { fontSize: 11, color: COLORS.textSecondary },
  desc: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
});

const targetStyles = StyleSheet.create({
  bigContainer: { backgroundColor: COLORS.background, borderRadius: 12, padding: 14, alignItems: 'center' },
  bigLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  bigValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  bigValue: { fontSize: 36, fontWeight: 'bold' },
  bigUnit: { fontSize: 14, color: COLORS.textSecondary },
  macroContainer: { flex: 1, backgroundColor: COLORS.background, borderRadius: 12, padding: 12, alignItems: 'center', gap: 3 },
  macroDot: { width: 8, height: 8, borderRadius: 4 },
  macroLabel: { fontSize: 11, color: COLORS.textSecondary },
  macroValue: { fontSize: 16, fontWeight: '700' },
  macroPct: { fontSize: 11, color: COLORS.textSecondary },
});
