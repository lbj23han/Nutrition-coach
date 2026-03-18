import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useAuth } from '../../features/auth/AuthContext';
import { getWeeklyNutrition } from '../../services/nutrition';
import { COLORS, FITNESS_GOALS } from '../../lib/constants';
import type { DailyNutrition } from '../../types';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W - 64;

const KCAL_PER_KG = 7700;
const WEEKS = 12;

function buildWeightProjection(
  currentWeight: number,
  dailyDelta: number,
  weeks: number
): { week: number; predicted: number }[] {
  const weeklyDelta = (dailyDelta * 7) / KCAL_PER_KG;
  return Array.from({ length: weeks + 1 }, (_, i) => ({
    week: i,
    predicted: Math.round((currentWeight + weeklyDelta * i) * 10) / 10,
  }));
}

export default function StatsScreen() {
  const { user, profile } = useAuth();
  const [weeklyData, setWeeklyData] = useState<DailyNutrition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    getWeeklyNutrition(user.id, today)
      .then(setWeeklyData)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [user]);

  const calorieTarget = profile?.daily_calorie_target ?? 2000;
  const tdee = profile?.tdee ?? 2000;
  const currentWeight = profile?.weight_kg ?? 70;
  const dailyDelta = calorieTarget - tdee;

  const weeklyAvg = weeklyData.length > 0 ? {
    calories: Math.round(weeklyData.reduce((s, d) => s + d.total_calories, 0) / weeklyData.length),
    protein: Math.round(weeklyData.reduce((s, d) => s + d.total_protein, 0) / weeklyData.length),
    carbs: Math.round(weeklyData.reduce((s, d) => s + d.total_carbs, 0) / weeklyData.length),
    fat: Math.round(weeklyData.reduce((s, d) => s + d.total_fat, 0) / weeklyData.length),
  } : null;

  const targetProjection = buildWeightProjection(currentWeight, dailyDelta, WEEKS);
  const actualAvgDelta = weeklyAvg ? weeklyAvg.calories - tdee : null;
  const actualProjection = actualAvgDelta !== null
    ? buildWeightProjection(currentWeight, actualAvgDelta, WEEKS)
    : null;

  const goalInfo = profile ? FITNESS_GOALS[profile.goal] : null;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      </SafeAreaView>
    );
  }

  const adherencePct = weeklyAvg
    ? Math.min(Math.round((weeklyAvg.calories / calorieTarget) * 100), 130)
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerLabel}>Weekly Stats</Text>
          <Text style={styles.title}>주간 통계</Text>
        </View>

        {/* Summary bento row */}
        {weeklyAvg ? (
          <View style={styles.bentoRow}>
            <View style={[styles.bentoCard, styles.bentoCardPrimary]}>
              <Text style={styles.bentoLabelLight}>평균 칼로리</Text>
              <Text style={styles.bentoValueLarge}>{weeklyAvg.calories.toLocaleString()}</Text>
              <Text style={styles.bentoUnitLight}>kcal / day</Text>
              {adherencePct !== null && (
                <View style={styles.adherenceBadge}>
                  <Text style={styles.adherenceBadgeText}>{adherencePct}% 달성</Text>
                </View>
              )}
            </View>
            <View style={styles.bentoColumn}>
              <MacroMiniCard label="단백질" value={weeklyAvg.protein} unit="g" color={COLORS.protein} target={profile?.daily_protein_target} />
              <MacroMiniCard label="탄수화물" value={weeklyAvg.carbs} unit="g" color={COLORS.carbs} target={profile?.daily_carb_target} />
              <MacroMiniCard label="지방" value={weeklyAvg.fat} unit="g" color={COLORS.fat} target={profile?.daily_fat_target} />
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>기록된 식사 데이터가 없습니다</Text>
            <Text style={styles.emptyHint}>식사를 기록하면 주간 통계가 표시됩니다</Text>
          </View>
        )}

        {/* Calorie bar chart */}
        <View style={styles.card}>
          <Text style={styles.cardSectionLabel}>CALORIE TREND</Text>
          <Text style={styles.cardSectionTitle}>최근 7일 칼로리</Text>
          <View style={styles.barChart}>
            {weeklyData.length > 0 ? weeklyData.map((day, index) => {
              const pct = Math.min(day.total_calories / calorieTarget, 1.3);
              const isToday = index === weeklyData.length - 1;
              const dayName = new Date(day.date).toLocaleDateString('ko-KR', { weekday: 'short' });
              return (
                <View key={day.date} style={styles.barWrapper}>
                  <Text style={styles.barCalorie}>
                    {day.total_calories > 0 ? (day.total_calories >= 1000 ? `${(day.total_calories / 1000).toFixed(1)}k` : day.total_calories) : ''}
                  </Text>
                  <View style={styles.barTrack}>
                    <View style={[
                      styles.barFill,
                      { height: `${Math.max(pct * 100, 2)}%` as any },
                      isToday && styles.barFillToday,
                      pct >= 1.1 && styles.barFillOver,
                    ]} />
                  </View>
                  <Text style={[styles.barDay, isToday && styles.barDayToday]}>{dayName}</Text>
                </View>
              );
            }) : (
              <View style={styles.chartEmpty}>
                <Text style={styles.chartEmptyText}>데이터 없음</Text>
              </View>
            )}
          </View>
          <View style={styles.targetLineRow}>
            <View style={styles.targetLineDash} />
            <Text style={styles.targetNote}>목표 {calorieTarget.toLocaleString()} kcal</Text>
          </View>
        </View>

        {/* Macro breakdown */}
        {weeklyAvg && (
          <View style={styles.card}>
            <Text style={styles.cardSectionLabel}>MACROS</Text>
            <Text style={styles.cardSectionTitle}>영양소 비율</Text>
            <MacroBar
              protein={weeklyAvg.protein}
              carbs={weeklyAvg.carbs}
              fat={weeklyAvg.fat}
            />
            <View style={styles.macroLegendRow}>
              <MacroLegend label="단백질" value={weeklyAvg.protein} unit="g" color={COLORS.protein} kcal={weeklyAvg.protein * 4} />
              <MacroLegend label="탄수화물" value={weeklyAvg.carbs} unit="g" color={COLORS.carbs} kcal={weeklyAvg.carbs * 4} />
              <MacroLegend label="지방" value={weeklyAvg.fat} unit="g" color={COLORS.fat} kcal={weeklyAvg.fat * 9} />
            </View>
          </View>
        )}

        {/* AI Weight Prediction */}
        <View style={styles.card}>
          <View style={styles.predictionHeader}>
            <View>
              <Text style={styles.cardSectionLabel}>AI FORECAST</Text>
              <Text style={styles.cardSectionTitle}>체중 예측</Text>
            </View>
            {goalInfo && (
              <View style={[styles.goalBadge, { backgroundColor: goalInfo.color + '20' }]}>
                <Text style={[styles.goalBadgeText, { color: goalInfo.color }]}>
                  {goalInfo.emoji} {goalInfo.label}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.deltaCard}>
            <Text style={styles.deltaLabel}>일일 {dailyDelta >= 0 ? '잉여' : '결핍'}</Text>
            <Text style={[styles.deltaValue, { color: dailyDelta >= 0 ? COLORS.error : COLORS.primary }]}>
              {dailyDelta >= 0 ? '+' : ''}{dailyDelta} kcal
            </Text>
            <Text style={styles.deltaDesc}>
              주당 <Text style={{ fontWeight: '800', color: dailyDelta >= 0 ? COLORS.error : COLORS.primary }}>
                {dailyDelta >= 0 ? '+' : ''}{Math.round((dailyDelta * 7) / KCAL_PER_KG * 10) / 10} kg
              </Text> 예측
            </Text>
          </View>

          <WeightLineChart
            targetData={targetProjection}
            actualData={actualProjection}
            currentWeight={currentWeight}
          />

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
              <Text style={styles.legendText}>목표 칼로리 기준</Text>
            </View>
            {actualProjection && (
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.secondary }]} />
                <Text style={styles.legendText}>실제 섭취 기준</Text>
              </View>
            )}
          </View>

          <View style={styles.milestones}>
            {[4, 8, 12].map((week) => {
              const pred = targetProjection[week];
              const diff = Math.round((pred.predicted - currentWeight) * 10) / 10;
              return (
                <View key={week} style={styles.milestone}>
                  <Text style={styles.milestoneWeek}>{week}주 후</Text>
                  <Text style={[styles.milestoneWeight, { color: diff >= 0 ? COLORS.error : COLORS.primary }]}>
                    {pred.predicted}
                  </Text>
                  <Text style={styles.milestoneWeightUnit}>kg</Text>
                  <Text style={[styles.milestoneDiff, { color: diff >= 0 ? COLORS.error : COLORS.primary }]}>
                    {diff >= 0 ? '+' : ''}{diff}
                  </Text>
                </View>
              );
            })}
          </View>

          <Text style={styles.disclaimer}>
            * 개인 대사량 차이로 실제 결과는 다를 수 있습니다. 근육량 변화, 수분 등은 반영되지 않습니다.
          </Text>
        </View>

        {/* Daily detail */}
        {weeklyData.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardSectionLabel}>DAILY LOG</Text>
            <Text style={styles.cardSectionTitle}>일별 상세</Text>
            {weeklyData.map((day, index) => {
              const isToday = index === weeklyData.length - 1;
              const calPct = Math.min(day.total_calories / calorieTarget, 1);
              return (
                <View key={day.date} style={[styles.dayRow, index < weeklyData.length - 1 && styles.dayRowBorder]}>
                  <View style={styles.dayLeft}>
                    <Text style={[styles.dayDate, isToday && styles.dayDateToday]}>
                      {isToday ? '오늘' : new Date(day.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </Text>
                    <View style={styles.dayCalBar}>
                      <View style={[styles.dayCalBarFill, { width: `${calPct * 100}%` as any }]} />
                    </View>
                  </View>
                  <View style={styles.dayRight}>
                    <Text style={styles.dayCalories}>{day.total_calories.toLocaleString()}</Text>
                    <Text style={styles.dayCalUnit}>kcal</Text>
                  </View>
                  <View style={styles.dayMacros}>
                    <Text style={[styles.dayMacro, { color: COLORS.protein }]}>P{day.total_protein}g</Text>
                    <Text style={[styles.dayMacro, { color: COLORS.carbs }]}>C{day.total_carbs}g</Text>
                    <Text style={[styles.dayMacro, { color: COLORS.fat }]}>F{day.total_fat}g</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function MacroMiniCard({ label, value, unit, color, target }: {
  label: string; value: number; unit: string; color: string; target?: number;
}) {
  const pct = target ? Math.round((value / target) * 100) : null;
  return (
    <View style={miniCardStyles.container}>
      <View style={[miniCardStyles.dot, { backgroundColor: color }]} />
      <Text style={miniCardStyles.label}>{label}</Text>
      <Text style={[miniCardStyles.value, { color }]}>{value}{unit}</Text>
      {pct !== null && <Text style={miniCardStyles.pct}>{pct}%</Text>}
    </View>
  );
}

function MacroBar({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const total = protein * 4 + carbs * 4 + fat * 9;
  if (total === 0) return null;
  const pPct = Math.round((protein * 4 / total) * 100);
  const cPct = Math.round((carbs * 4 / total) * 100);
  const fPct = 100 - pPct - cPct;
  return (
    <View style={macroBarStyles.track}>
      <View style={[macroBarStyles.fill, { flex: pPct, backgroundColor: COLORS.protein }]} />
      <View style={[macroBarStyles.fill, { flex: cPct, backgroundColor: COLORS.carbs }]} />
      <View style={[macroBarStyles.fill, { flex: fPct, backgroundColor: COLORS.fat }]} />
    </View>
  );
}

function MacroLegend({ label, value, unit, color, kcal }: {
  label: string; value: number; unit: string; color: string; kcal: number;
}) {
  return (
    <View style={macroLegendStyles.container}>
      <View style={[macroLegendStyles.dot, { backgroundColor: color }]} />
      <Text style={macroLegendStyles.label}>{label}</Text>
      <Text style={[macroLegendStyles.value, { color }]}>{value}{unit}</Text>
      <Text style={macroLegendStyles.kcal}>{Math.round(kcal)} kcal</Text>
    </View>
  );
}

function WeightLineChart({
  targetData,
  actualData,
  currentWeight,
}: {
  targetData: { week: number; predicted: number }[];
  actualData: { week: number; predicted: number }[] | null;
  currentWeight: number;
}) {
  const H = 150;
  const W = CHART_W;
  const allValues = [
    ...targetData.map((d) => d.predicted),
    ...(actualData ?? []).map((d) => d.predicted),
  ];
  const minVal = Math.min(...allValues) - 1;
  const maxVal = Math.max(...allValues) + 1;
  const range = maxVal - minVal || 1;

  const toX = (week: number) => (week / WEEKS) * (W - 32);
  const toY = (val: number) => H - ((val - minVal) / range) * H;

  return (
    <View style={{ height: H + 28, marginVertical: 12 }}>
      <Text style={[styles.axisLabel, { top: 0, left: 0 }]}>{maxVal.toFixed(1)}kg</Text>
      <Text style={[styles.axisLabel, { bottom: 20, left: 0 }]}>{minVal.toFixed(1)}kg</Text>

      <View style={[styles.currentLine, { top: toY(currentWeight), left: 32, width: W - 32 }]} />

      <View style={{ position: 'absolute', left: 32, top: 0, width: W - 32, height: H }}>
        {targetData.map((pt, i) => {
          const x = toX(pt.week);
          const y = toY(pt.predicted);
          const nextPt = targetData[i + 1];
          return (
            <View key={`t-${i}`}>
              {nextPt && (
                <ConnectingLine x1={x} y1={y} x2={toX(nextPt.week)} y2={toY(nextPt.predicted)} color={COLORS.primary} />
              )}
              <View style={[styles.dot, { left: x - 4, top: y - 4, backgroundColor: COLORS.primary }]} />
            </View>
          );
        })}

        {actualData?.map((pt, i) => {
          const x = toX(pt.week);
          const y = toY(pt.predicted);
          const nextPt = actualData[i + 1];
          return (
            <View key={`a-${i}`}>
              {nextPt && (
                <ConnectingLine x1={x} y1={y} x2={toX(nextPt.week)} y2={toY(nextPt.predicted)} color={COLORS.secondary} />
              )}
              <View style={[styles.dot, { left: x - 3, top: y - 3, width: 6, height: 6, backgroundColor: COLORS.secondary }]} />
            </View>
          );
        })}
      </View>

      {[0, 4, 8, 12].map((w) => (
        <Text key={w} style={[styles.axisLabel, { bottom: 0, left: 32 + toX(w) - 10 }]}>
          {w === 0 ? '현재' : `${w}주`}
        </Text>
      ))}
    </View>
  );
}

function ConnectingLine({ x1, y1, x2, y2, color }: {
  x1: number; y1: number; x2: number; y2: number; color: string;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  return (
    <View style={{
      position: 'absolute', left: x1, top: y1,
      width: length, height: 2,
      backgroundColor: color, opacity: 0.7,
      transform: [{ rotate: `${angle}deg` }],
      transformOrigin: '0 50%',
    }} />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8 },
  headerLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: COLORS.primary, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },

  bentoRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, gap: 8 },
  bentoCard: {
    flex: 1.2, backgroundColor: COLORS.primary, borderRadius: 24, padding: 18,
    justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  bentoCardPrimary: {},
  bentoLabelLight: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: COLORS.primaryContainer + 'cc', marginBottom: 4 },
  bentoValueLarge: { fontSize: 32, fontWeight: '800', color: COLORS.primaryContainer, letterSpacing: -1 },
  bentoUnitLight: { fontSize: 11, color: COLORS.primaryContainer + '99', marginBottom: 12 },
  adherenceBadge: { backgroundColor: COLORS.primaryContainer, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  adherenceBadgeText: { fontSize: 11, fontWeight: '800', color: COLORS.primary },

  bentoColumn: { flex: 1, gap: 6 },

  emptyCard: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: COLORS.surfaceContainerLowest, borderRadius: 24, padding: 28,
    alignItems: 'center', gap: 8,
  },
  emptyText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  emptyHint: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },

  card: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: COLORS.surfaceContainerLowest, borderRadius: 24, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardSectionLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: COLORS.textSecondary, marginBottom: 4 },
  cardSectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 16, letterSpacing: -0.3 },

  barChart: { flexDirection: 'row', height: 140, alignItems: 'flex-end', gap: 4 },
  barWrapper: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barCalorie: { fontSize: 8, color: COLORS.textSecondary, marginBottom: 2 },
  barTrack: {
    width: '100%', height: 100, backgroundColor: COLORS.background,
    borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end',
  },
  barFill: { width: '100%', backgroundColor: COLORS.primaryContainer, borderRadius: 6 },
  barFillToday: { backgroundColor: COLORS.primary },
  barFillOver: { backgroundColor: COLORS.error },
  barDay: { fontSize: 10, color: COLORS.textSecondary, marginTop: 4 },
  barDayToday: { color: COLORS.primary, fontWeight: '700' },
  chartEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  chartEmptyText: { color: COLORS.textSecondary, fontSize: 13 },
  targetLineRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  targetLineDash: { flex: 1, height: 1, backgroundColor: COLORS.border },
  targetNote: { fontSize: 11, color: COLORS.textSecondary, fontStyle: 'italic' },

  macroLegendRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },

  predictionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  goalBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  goalBadgeText: { fontSize: 12, fontWeight: '700' },

  deltaCard: {
    backgroundColor: COLORS.background, borderRadius: 16, padding: 16, marginBottom: 4,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  deltaLabel: { fontSize: 12, color: COLORS.textSecondary, flex: 1 },
  deltaValue: { fontSize: 20, fontWeight: '800' },
  deltaDesc: { fontSize: 12, color: COLORS.textSecondary },

  currentLine: { position: 'absolute', height: 1, backgroundColor: COLORS.border },
  dot: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  axisLabel: { position: 'absolute', fontSize: 10, color: COLORS.textSecondary },
  legendRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: COLORS.textSecondary },

  milestones: { flexDirection: 'row', gap: 8, marginTop: 16 },
  milestone: {
    flex: 1, alignItems: 'center', backgroundColor: COLORS.background,
    borderRadius: 16, padding: 14,
  },
  milestoneWeek: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: COLORS.textSecondary, marginBottom: 6 },
  milestoneWeight: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  milestoneWeightUnit: { fontSize: 11, color: COLORS.textSecondary },
  milestoneDiff: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  disclaimer: { fontSize: 11, color: COLORS.textSecondary, marginTop: 14, lineHeight: 17, fontStyle: 'italic' },

  dayRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 8 },
  dayRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.background },
  dayLeft: { flex: 1.2, gap: 4 },
  dayDate: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  dayDateToday: { color: COLORS.primary },
  dayCalBar: { height: 4, backgroundColor: COLORS.background, borderRadius: 2, overflow: 'hidden' },
  dayCalBarFill: { height: 4, backgroundColor: COLORS.primaryContainer, borderRadius: 2 },
  dayRight: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  dayCalories: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  dayCalUnit: { fontSize: 11, color: COLORS.textSecondary },
  dayMacros: { flexDirection: 'row', gap: 6 },
  dayMacro: { fontSize: 11, fontWeight: '600' },
});

const miniCardStyles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: COLORS.surfaceContainerLowest, borderRadius: 14, padding: 10,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 11, color: COLORS.textSecondary, flex: 1 },
  value: { fontSize: 13, fontWeight: '800' },
  pct: { fontSize: 10, color: COLORS.textSecondary },
});

const macroBarStyles = StyleSheet.create({
  track: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2 },
  fill: { height: 12, borderRadius: 6 },
});

const macroLegendStyles = StyleSheet.create({
  container: { alignItems: 'center', gap: 3 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { fontSize: 10, color: COLORS.textSecondary },
  value: { fontSize: 15, fontWeight: '800' },
  kcal: { fontSize: 10, color: COLORS.textSecondary },
});
