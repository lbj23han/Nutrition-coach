import { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useAuth } from '../../features/auth/AuthContext';
import { getDailyNutrition, deleteFoodEntry } from '../../services/nutrition';
import { COLORS, MEAL_TYPES } from '../../lib/constants';
import type { DailyNutrition, FoodEntry, MealType } from '../../types';

const ALL_MEALS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function HomeScreen() {
  const { user, profile } = useAuth();
  const [dailyNutrition, setDailyNutrition] = useState<DailyNutrition | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedMeal, setExpandedMeal] = useState<MealType | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const loadData = async () => {
    if (!user) return;
    try {
      const data = await getDailyNutrition(user.id, today);
      setDailyNutrition(data);
    } catch (err) {
      console.error('Failed to load daily nutrition:', err);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, [user]));

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleDeleteEntry = (entry: FoodEntry) => {
    Alert.alert('삭제', `"${entry.food_name}"을(를) 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await deleteFoodEntry(entry.id, user?.id);
          loadData();
        },
      },
    ]);
  };

  const calorieTarget = profile?.daily_calorie_target ?? 2000;
  const proteinTarget = profile?.daily_protein_target ?? 150;
  const carbTarget = profile?.daily_carb_target ?? 250;
  const fatTarget = profile?.daily_fat_target ?? 65;

  const consumed = {
    calories: dailyNutrition?.total_calories ?? 0,
    protein: dailyNutrition?.total_protein ?? 0,
    carbs: dailyNutrition?.total_carbs ?? 0,
    fat: dailyNutrition?.total_fat ?? 0,
  };

  const remaining = calorieTarget - consumed.calories;
  const calorieProgress = Math.min(consumed.calories / calorieTarget, 1);

  const dayOfWeek = new Date().toLocaleDateString('ko-KR', { weekday: 'long' });
  const dateStr = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.dateLabel}>{dayOfWeek}, {dateStr}</Text>
          <Text style={styles.greeting}>안녕하세요, {profile?.name ?? '사용자'}님 👋</Text>
        </View>

        {/* Calorie Card — big hero */}
        <View style={styles.calorieCard}>
          <Text style={styles.calorieCardLabel}>남은 칼로리</Text>
          <View style={styles.calorieMainRow}>
            <View>
              <Text style={[styles.remainingValue, remaining < 0 && { color: COLORS.error }]}>
                {remaining < 0 ? `+${Math.abs(remaining)}` : remaining}
              </Text>
              <Text style={styles.remainingUnit}>kcal {remaining < 0 ? '초과' : ''}</Text>
            </View>
            {/* Ring */}
            <View style={styles.ringContainer}>
              <View style={styles.ringOuter}>
                <View style={[
                  styles.ringFill,
                  {
                    borderColor: calorieProgress >= 1 ? COLORS.error : COLORS.primaryContainer,
                    borderTopColor: 'transparent',
                    transform: [{ rotate: `${calorieProgress * 360}deg` }],
                  }
                ]} />
                <View style={styles.ringInner}>
                  <Text style={styles.ringPct}>{Math.round(calorieProgress * 100)}%</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.calorieFooter}>
            <View>
              <Text style={styles.calorieFooterLabel}>목표</Text>
              <Text style={styles.calorieFooterValue}>{calorieTarget.toLocaleString()} kcal</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[
                styles.progressFill,
                { width: `${calorieProgress * 100}%` as any },
                calorieProgress >= 1 && { backgroundColor: COLORS.error },
              ]} />
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.calorieFooterLabel}>섭취</Text>
              <Text style={styles.calorieFooterValue}>{consumed.calories.toLocaleString()} kcal</Text>
            </View>
          </View>
        </View>

        {/* Macros */}
        <View style={styles.macrosRow}>
          <MacroCard label="단백질" current={consumed.protein} target={proteinTarget} unit="g" color={COLORS.protein} />
          <MacroCard label="탄수화물" current={consumed.carbs} target={carbTarget} unit="g" color={COLORS.carbs} />
          <MacroCard label="지방" current={consumed.fat} target={fatTarget} unit="g" color={COLORS.fat} />
        </View>

        {/* BMR/TDEE */}
        {profile && (
          <View style={styles.energyCard}>
            <Text style={styles.energyTitle}>에너지 정보</Text>
            <View style={styles.energyRow}>
              <View style={styles.energyItem}>
                <Text style={styles.energyLabel}>BMR</Text>
                <Text style={styles.energyValue}>{profile.bmr.toLocaleString()}</Text>
                <Text style={styles.energyUnit}>kcal</Text>
              </View>
              <View style={styles.energyDivider} />
              <View style={styles.energyItem}>
                <Text style={styles.energyLabel}>TDEE</Text>
                <Text style={styles.energyValue}>{profile.tdee.toLocaleString()}</Text>
                <Text style={styles.energyUnit}>kcal</Text>
              </View>
            </View>
          </View>
        )}

        {/* Meals */}
        <View style={styles.mealsCard}>
          <Text style={styles.sectionTitle}>오늘의 식사</Text>

          {ALL_MEALS.map((type, idx) => {
            const entries = dailyNutrition?.entries.filter((e) => e.meal_type === type) ?? [];
            const isExpanded = expandedMeal === type;
            const totalCals = Math.round(entries.reduce((s, e) => s + e.calories, 0));
            const isLast = idx === ALL_MEALS.length - 1;

            return (
              <View key={type}>
                <TouchableOpacity
                  style={[styles.mealRow, isLast && styles.mealRowLast]}
                  onPress={() => setExpandedMeal(isExpanded ? null : type)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.mealName}>{MEAL_TYPES[type]}</Text>
                  <View style={styles.mealRight}>
                    {entries.length > 0 ? (
                      <>
                        <Text style={styles.mealCalories}>{totalCals} kcal</Text>
                        <View style={styles.mealCountBadge}>
                          <Text style={styles.mealCount}>{entries.length}</Text>
                        </View>
                      </>
                    ) : (
                      <Text style={styles.mealEmpty}>기록 없음</Text>
                    )}
                    <Text style={styles.mealChevron}>{isExpanded ? '▲' : '▼'}</Text>
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.entryList}>
                    {entries.length === 0 ? (
                      <TouchableOpacity
                        style={styles.emptyMealRow}
                        onPress={() => router.push('/(tabs)/log')}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.noEntryText}>아직 기록이 없어요</Text>
                        <Text style={styles.noEntryAction}>기록하기 →</Text>
                      </TouchableOpacity>
                    ) : (
                      entries.map((entry) => (
                        <FoodEntryRow
                          key={entry.id}
                          entry={entry}
                          onDelete={() => handleDeleteEntry(entry)}
                        />
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/(tabs)/log')}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function FoodEntryRow({ entry, onDelete }: { entry: FoodEntry; onDelete: () => void }) {
  return (
    <View style={styles.entryRow}>
      <View style={styles.entryInfo}>
        <Text style={styles.entryName}>{entry.food_name}</Text>
        <Text style={styles.entryDetail}>
          {entry.quantity}{entry.unit}
          {'  '}
          <Text style={{ color: COLORS.protein }}>P {entry.protein_g}g</Text>
          {'  '}
          <Text style={{ color: COLORS.carbs }}>C {entry.carbs_g}g</Text>
          {'  '}
          <Text style={{ color: COLORS.fat }}>F {entry.fat_g}g</Text>
        </Text>
      </View>
      <View style={styles.entryRight}>
        <Text style={styles.entryCalories}>{Math.round(entry.calories)}</Text>
        <Text style={styles.entryCalUnit}>kcal</Text>
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
          <Text style={styles.deleteBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MacroCard({ label, current, target, unit, color }: {
  label: string; current: number; target: number; unit: string; color: string;
}) {
  const progress = Math.min(current / target, 1);
  return (
    <View style={styles.macroCard}>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={[styles.macroValue, { color }]}>{current}</Text>
      <Text style={styles.macroTarget}>/ {target}{unit}</Text>
      <View style={styles.macroBar}>
        <View style={[styles.macroFill, { width: `${progress * 100}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 100 },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12 },
  dateLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: COLORS.textSecondary, marginBottom: 4 },
  greeting: { fontSize: 28, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },

  // Calorie card
  calorieCard: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 24, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  calorieCardLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: COLORS.textSecondary, marginBottom: 8 },
  calorieMainRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  remainingValue: { fontSize: 56, fontWeight: '800', color: COLORS.text, letterSpacing: -2 },
  remainingUnit: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  ringContainer: { width: 80, height: 80 },
  ringOuter: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 8, borderColor: COLORS.surfaceContainerHigh,
    justifyContent: 'center', alignItems: 'center',
    position: 'relative',
  },
  ringFill: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    borderWidth: 8, borderColor: COLORS.primaryContainer,
    borderTopColor: 'transparent',
  },
  ringInner: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.surfaceContainerLowest,
    justifyContent: 'center', alignItems: 'center',
  },
  ringPct: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  calorieFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  calorieFooterLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: COLORS.textSecondary },
  calorieFooterValue: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  progressBar: { flex: 1, height: 6, backgroundColor: COLORS.surfaceContainerHighest, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primaryContainer, borderRadius: 3 },

  // Macros
  macrosRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, gap: 8 },
  macroCard: {
    flex: 1, backgroundColor: COLORS.surfaceContainerLowest, borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  macroLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: COLORS.textSecondary, marginBottom: 6 },
  macroValue: { fontSize: 20, fontWeight: '700', marginBottom: 2 },
  macroTarget: { fontSize: 10, color: COLORS.textSecondary, marginBottom: 8 },
  macroBar: { height: 4, backgroundColor: COLORS.surfaceContainerHighest, borderRadius: 2, overflow: 'hidden' },
  macroFill: { height: '100%', borderRadius: 2 },

  // Energy
  energyCard: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: COLORS.surfaceContainer, borderRadius: 20, padding: 20,
  },
  energyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 14 },
  energyRow: { flexDirection: 'row', alignItems: 'center' },
  energyItem: { flex: 1, alignItems: 'center' },
  energyLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: COLORS.textSecondary, marginBottom: 4 },
  energyValue: { fontSize: 22, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  energyUnit: { fontSize: 11, color: COLORS.textSecondary },
  energyDivider: { width: 1, height: 40, backgroundColor: COLORS.border },

  // Meals
  mealsCard: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: COLORS.surfaceContainerLowest, borderRadius: 24, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 4, letterSpacing: -0.3 },
  mealRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.surfaceContainerHighest,
  },
  mealRowLast: { borderBottomWidth: 0 },
  mealName: { fontSize: 15, color: COLORS.text, fontWeight: '700', flex: 1 },
  mealRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mealCalories: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  mealCountBadge: { backgroundColor: COLORS.primaryContainer + '40', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  mealCount: { fontSize: 11, color: COLORS.primary, fontWeight: '700' },
  mealEmpty: { fontSize: 12, color: COLORS.textSecondary },
  mealChevron: { fontSize: 9, color: COLORS.textSecondary },
  entryList: { backgroundColor: COLORS.background, borderRadius: 12, marginTop: 2, marginBottom: 4, paddingVertical: 2 },
  emptyMealRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14 },
  noEntryText: { fontSize: 13, color: COLORS.textSecondary },
  noEntryAction: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
  entryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceContainerHighest },
  entryInfo: { flex: 1 },
  entryName: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
  entryDetail: { fontSize: 12, color: COLORS.textSecondary },
  entryRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  entryCalories: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  entryCalUnit: { fontSize: 10, color: COLORS.textSecondary, marginRight: 8 },
  deleteBtn: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.error + '15', justifyContent: 'center', alignItems: 'center' },
  deleteBtnText: { fontSize: 10, color: COLORS.error, fontWeight: '700' },

  // FAB
  fab: {
    position: 'absolute', bottom: 90, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  fabIcon: { fontSize: 28, color: COLORS.primaryContainer, fontWeight: '300', lineHeight: 30 },
});
