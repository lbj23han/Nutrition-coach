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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>안녕하세요, {profile?.name ?? '사용자'}님! 👋</Text>
          <Text style={styles.date}>{formatDate(today)}</Text>
        </View>

        {/* Calorie Card */}
        <View style={styles.calorieCard}>
          <View style={styles.calorieRow}>
            <View style={styles.calorieItem}>
              <Text style={styles.calorieLabel}>목표</Text>
              <Text style={styles.calorieValue}>{calorieTarget}</Text>
              <Text style={styles.calorieUnit}>kcal</Text>
            </View>
            <View style={styles.calorieDivider} />
            <View style={styles.calorieMain}>
              <Text style={[styles.remainingValue, remaining < 0 && { color: COLORS.error }]}>
                {remaining < 0 ? `+${Math.abs(remaining)}` : remaining}
              </Text>
              <Text style={styles.remainingLabel}>{remaining < 0 ? '초과' : '남은 칼로리'}</Text>
              <View style={styles.progressBar}>
                <View style={[
                  styles.progressFill,
                  { width: `${calorieProgress * 100}%` as any },
                  calorieProgress >= 1 && styles.progressOver,
                ]} />
              </View>
            </View>
            <View style={styles.calorieDivider} />
            <View style={styles.calorieItem}>
              <Text style={styles.calorieLabel}>섭취</Text>
              <Text style={styles.calorieValue}>{consumed.calories}</Text>
              <Text style={styles.calorieUnit}>kcal</Text>
            </View>
          </View>
        </View>

        {/* Macros */}
        <View style={styles.macrosCard}>
          <Text style={styles.sectionTitle}>3대 영양소</Text>
          <View style={styles.macrosRow}>
            <MacroItem label="단백질" current={consumed.protein} target={proteinTarget} unit="g" color={COLORS.protein} />
            <MacroItem label="탄수화물" current={consumed.carbs} target={carbTarget} unit="g" color={COLORS.carbs} />
            <MacroItem label="지방" current={consumed.fat} target={fatTarget} unit="g" color={COLORS.fat} />
          </View>
        </View>

        {/* Meal Sections */}
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

function MacroItem({ label, current, target, unit, color }: {
  label: string; current: number; target: number; unit: string; color: string;
}) {
  const progress = Math.min(current / target, 1);
  return (
    <View style={macroStyles.container}>
      <Text style={macroStyles.label}>{label}</Text>
      <Text style={[macroStyles.value, { color }]}>
        {current}<Text style={macroStyles.unit}>/{target}{unit}</Text>
      </Text>
      <View style={macroStyles.bar}>
        <View style={[macroStyles.fill, { width: `${progress * 100}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  greeting: { fontSize: 22, fontWeight: 'bold', color: COLORS.text },
  date: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  calorieCard: {
    margin: 16, backgroundColor: COLORS.surface, borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  calorieRow: { flexDirection: 'row', alignItems: 'center' },
  calorieItem: { alignItems: 'center', flex: 1 },
  calorieLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  calorieValue: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
  calorieUnit: { fontSize: 11, color: COLORS.textSecondary },
  calorieDivider: { width: 1, height: 50, backgroundColor: COLORS.border, marginHorizontal: 8 },
  calorieMain: { flex: 2, alignItems: 'center' },
  remainingValue: { fontSize: 36, fontWeight: 'bold', color: COLORS.primary },
  remainingLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 8 },
  progressBar: { width: '100%', height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  progressOver: { backgroundColor: COLORS.error },
  macrosCard: {
    marginHorizontal: 16, marginBottom: 16, backgroundColor: COLORS.surface, borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 16 },
  macrosRow: { flexDirection: 'row', gap: 12 },
  mealsCard: {
    marginHorizontal: 16, marginBottom: 24, backgroundColor: COLORS.surface, borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  mealRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  mealRowLast: { borderBottomWidth: 0 },
  mealName: { fontSize: 15, color: COLORS.text, fontWeight: '600', flex: 1 },
  mealRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mealCalories: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  mealCountBadge: {
    backgroundColor: COLORS.primary + '18', borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  mealCount: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  mealEmpty: { fontSize: 13, color: COLORS.textSecondary },
  mealChevron: { fontSize: 10, color: COLORS.textSecondary },
  entryList: {
    backgroundColor: COLORS.background, borderRadius: 10,
    marginTop: 2, marginBottom: 4, paddingVertical: 2,
  },
  emptyMealRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 14,
  },
  noEntryText: { fontSize: 13, color: COLORS.textSecondary },
  noEntryAction: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  entryRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  entryInfo: { flex: 1 },
  entryName: { fontSize: 14, fontWeight: '500', color: COLORS.text, marginBottom: 2 },
  entryDetail: { fontSize: 12, color: COLORS.textSecondary },
  entryRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  entryCalories: { fontSize: 15, fontWeight: '700', color: COLORS.calories },
  entryCalUnit: { fontSize: 10, color: COLORS.textSecondary, marginRight: 8 },
  deleteBtn: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.error + '15', justifyContent: 'center', alignItems: 'center',
  },
  deleteBtnText: { fontSize: 10, color: COLORS.error, fontWeight: '700' },
});

const macroStyles = StyleSheet.create({
  container: { flex: 1 },
  label: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  value: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  unit: { fontSize: 11, color: COLORS.textSecondary, fontWeight: 'normal' },
  bar: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
