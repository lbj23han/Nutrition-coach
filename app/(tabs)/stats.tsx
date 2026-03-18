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
const CHART_W = SCREEN_W - 64; // card padding

// 1kg 지방 ≈ 7700 kcal
const KCAL_PER_KG = 7700;
const WEEKS = 12;

function buildWeightProjection(
  currentWeight: number,
  dailyDelta: number, // kcal surplus/deficit per day
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

  // Projection based on target
  const targetProjection = buildWeightProjection(currentWeight, dailyDelta, WEEKS);
  // Projection based on actual avg intake (if available)
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>통계</Text>
          <Text style={styles.subtitle}>영양 현황 · AI 체중 예측</Text>
        </View>

        {/* Weekly Average */}
        {weeklyAvg && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>주간 평균 섭취</Text>
            <View style={styles.avgGrid}>
              <AvgItem label="칼로리" value={weeklyAvg.calories} unit="kcal" color={COLORS.calories} target={calorieTarget} />
              <AvgItem label="단백질" value={weeklyAvg.protein} unit="g" color={COLORS.protein} target={profile?.daily_protein_target} />
              <AvgItem label="탄수화물" value={weeklyAvg.carbs} unit="g" color={COLORS.carbs} target={profile?.daily_carb_target} />
              <AvgItem label="지방" value={weeklyAvg.fat} unit="g" color={COLORS.fat} target={profile?.daily_fat_target} />
            </View>
          </View>
        )}

        {/* Daily calorie bar chart */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>최근 7일 칼로리</Text>
          <View style={styles.barChart}>
            {weeklyData.map((day, index) => {
              const pct = Math.min(day.total_calories / calorieTarget, 1.3);
              const isToday = index === weeklyData.length - 1;
              const dayName = new Date(day.date).toLocaleDateString('ko-KR', { weekday: 'short' });
              return (
                <View key={day.date} style={styles.barWrapper}>
                  <Text style={styles.barCalorie}>{day.total_calories > 0 ? day.total_calories : ''}</Text>
                  <View style={styles.barTrack}>
                    <View style={[
                      styles.barFill,
                      { height: `${pct * 100}%` as any },
                      isToday && styles.barFillToday,
                      pct >= 1.1 && styles.barFillOver,
                    ]} />
                  </View>
                  <Text style={[styles.barDay, isToday && styles.barDayToday]}>{dayName}</Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.targetNote}>— 목표: {calorieTarget} kcal</Text>
        </View>

        {/* AI Weight Prediction */}
        <View style={styles.card}>
          <View style={styles.predictionHeader}>
            <Text style={styles.sectionTitle}>AI 체중 예측</Text>
            {goalInfo && (
              <View style={[styles.goalBadge, { backgroundColor: goalInfo.color + '20' }]}>
                <Text style={[styles.goalBadgeText, { color: goalInfo.color }]}>
                  {goalInfo.emoji} {goalInfo.label}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.predictionDesc}>
            현재 목표 칼로리 기준으로 {WEEKS}주 후 예측 체중을 계산합니다.{'\n'}
            매일 {Math.abs(dailyDelta)} kcal {dailyDelta >= 0 ? '과잉' : '부족'} → 주당{' '}
            <Text style={{ fontWeight: '700', color: dailyDelta >= 0 ? COLORS.error : COLORS.primary }}>
              {dailyDelta >= 0 ? '+' : ''}{Math.round((dailyDelta * 7) / KCAL_PER_KG * 10) / 10} kg
            </Text>
          </Text>

          {/* Line chart */}
          <WeightLineChart
            targetData={targetProjection}
            actualData={actualProjection}
            currentWeight={currentWeight}
          />

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
              <Text style={styles.legendText}>목표 칼로리 기준 예측</Text>
            </View>
            {actualProjection && (
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.secondary, borderStyle: 'dashed' }]} />
                <Text style={styles.legendText}>실제 섭취 기준 예측</Text>
              </View>
            )}
          </View>

          {/* Milestone */}
          <View style={styles.milestones}>
            {[4, 8, 12].map((week) => {
              const pred = targetProjection[week];
              const diff = Math.round((pred.predicted - currentWeight) * 10) / 10;
              return (
                <View key={week} style={styles.milestone}>
                  <Text style={styles.milestoneWeek}>{week}주 후</Text>
                  <Text style={[styles.milestoneWeight, { color: diff >= 0 ? COLORS.error : COLORS.primary }]}>
                    {pred.predicted} kg
                  </Text>
                  <Text style={[styles.milestoneDiff, { color: diff >= 0 ? COLORS.error : COLORS.primary }]}>
                    {diff >= 0 ? '+' : ''}{diff} kg
                  </Text>
                </View>
              );
            })}
          </View>

          <Text style={styles.disclaimer}>
            * 개인 대사량 차이로 실제 결과는 다를 수 있습니다.{'\n'}
            근육량 변화, 수분 등은 반영되지 않습니다.
          </Text>
        </View>

        {/* Daily detail */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>일별 상세</Text>
          {weeklyData.map((day) => (
            <View key={day.date} style={styles.dayRow}>
              <Text style={styles.dayDate}>
                {new Date(day.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
              </Text>
              <Text style={styles.dayCalories}>{day.total_calories} kcal</Text>
              <View style={styles.dayMacros}>
                <Text style={[styles.dayMacro, { color: COLORS.protein }]}>P {day.total_protein}g</Text>
                <Text style={[styles.dayMacro, { color: COLORS.carbs }]}>C {day.total_carbs}g</Text>
                <Text style={[styles.dayMacro, { color: COLORS.fat }]}>F {day.total_fat}g</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Simple SVG-free line chart using absolute positioned views
function WeightLineChart({
  targetData,
  actualData,
  currentWeight,
}: {
  targetData: { week: number; predicted: number }[];
  actualData: { week: number; predicted: number }[] | null;
  currentWeight: number;
}) {
  const H = 160;
  const W = CHART_W;
  const allValues = [
    ...targetData.map((d) => d.predicted),
    ...(actualData ?? []).map((d) => d.predicted),
  ];
  const minVal = Math.min(...allValues) - 1;
  const maxVal = Math.max(...allValues) + 1;
  const range = maxVal - minVal || 1;

  const toX = (week: number) => (week / WEEKS) * W;
  const toY = (val: number) => H - ((val - minVal) / range) * H;

  return (
    <View style={{ height: H + 24, marginVertical: 12 }}>
      {/* Y axis labels */}
      <Text style={[styles.axisLabel, { top: 0, left: 0 }]}>{maxVal.toFixed(1)}kg</Text>
      <Text style={[styles.axisLabel, { bottom: 20, left: 0 }]}>{minVal.toFixed(1)}kg</Text>

      {/* Current weight line */}
      <View style={[styles.currentLine, {
        top: toY(currentWeight),
        left: 32,
        width: W - 32,
      }]} />

      {/* Chart area */}
      <View style={{ position: 'absolute', left: 32, top: 0, width: W - 32, height: H }}>
        {/* Dots + connecting lines for target */}
        {targetData.map((pt, i) => {
          const x = toX(pt.week) * ((W - 32) / W);
          const y = toY(pt.predicted);
          const nextPt = targetData[i + 1];
          return (
            <View key={`t-${i}`}>
              {nextPt && (
                <ConnectingLine
                  x1={x} y1={y}
                  x2={toX(nextPt.week) * ((W - 32) / W)}
                  y2={toY(nextPt.predicted)}
                  color={COLORS.primary}
                />
              )}
              <View style={[styles.dot, { left: x - 4, top: y - 4, backgroundColor: COLORS.primary }]} />
            </View>
          );
        })}

        {/* Dots + connecting lines for actual */}
        {actualData?.map((pt, i) => {
          const x = toX(pt.week) * ((W - 32) / W);
          const y = toY(pt.predicted);
          const nextPt = actualData[i + 1];
          return (
            <View key={`a-${i}`}>
              {nextPt && (
                <ConnectingLine
                  x1={x} y1={y}
                  x2={toX(nextPt.week) * ((W - 32) / W)}
                  y2={toY(nextPt.predicted)}
                  color={COLORS.secondary}
                />
              )}
              <View style={[styles.dot, { left: x - 3, top: y - 3, width: 6, height: 6, backgroundColor: COLORS.secondary }]} />
            </View>
          );
        })}
      </View>

      {/* X axis week labels */}
      {[0, 4, 8, 12].map((w) => (
        <Text key={w} style={[styles.axisLabel, {
          bottom: 0,
          left: 32 + toX(w) * ((W - 32) / W) - 10,
        }]}>{w === 0 ? '현재' : `${w}주`}</Text>
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
      position: 'absolute',
      left: x1,
      top: y1,
      width: length,
      height: 2,
      backgroundColor: color,
      opacity: 0.7,
      transform: [{ rotate: `${angle}deg` }],
      transformOrigin: '0 50%',
    }} />
  );
}

function AvgItem({ label, value, unit, color, target }: {
  label: string; value: number; unit: string; color: string; target?: number;
}) {
  const pct = target ? Math.round((value / target) * 100) : null;
  return (
    <View style={avgStyles.container}>
      <Text style={avgStyles.label}>{label}</Text>
      <Text style={[avgStyles.value, { color }]}>{value}</Text>
      <Text style={avgStyles.unit}>{unit}</Text>
      {pct !== null && (
        <Text style={[avgStyles.pct, { color: pct >= 90 && pct <= 110 ? COLORS.primary : COLORS.secondary }]}>
          {pct}%
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  card: {
    marginHorizontal: 16, marginBottom: 16, backgroundColor: COLORS.surface,
    borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  avgGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  barChart: { flexDirection: 'row', height: 160, alignItems: 'flex-end', gap: 6, paddingHorizontal: 4 },
  barWrapper: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barCalorie: { fontSize: 9, color: COLORS.textSecondary, marginBottom: 2 },
  barTrack: {
    width: '100%', height: 120, backgroundColor: COLORS.border,
    borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end',
  },
  barFill: { width: '100%', backgroundColor: COLORS.primaryLight, borderRadius: 4 },
  barFillToday: { backgroundColor: COLORS.primary },
  barFillOver: { backgroundColor: COLORS.error },
  barDay: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
  barDayToday: { color: COLORS.primary, fontWeight: '600' },
  targetNote: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'right', marginTop: 6, fontStyle: 'italic' },
  predictionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  goalBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  goalBadgeText: { fontSize: 12, fontWeight: '600' },
  predictionDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 4 },
  currentLine: { position: 'absolute', height: 1, backgroundColor: COLORS.border, borderStyle: 'dashed' },
  dot: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  axisLabel: { position: 'absolute', fontSize: 10, color: COLORS.textSecondary },
  legendRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: COLORS.textSecondary },
  milestones: { flexDirection: 'row', gap: 8, marginTop: 16 },
  milestone: {
    flex: 1, alignItems: 'center', backgroundColor: COLORS.background,
    borderRadius: 12, padding: 10,
  },
  milestoneWeek: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 4 },
  milestoneWeight: { fontSize: 18, fontWeight: 'bold' },
  milestoneDiff: { fontSize: 11, fontWeight: '600' },
  disclaimer: { fontSize: 11, color: COLORS.textSecondary, marginTop: 12, lineHeight: 17, fontStyle: 'italic' },
  dayRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dayDate: { fontSize: 14, color: COLORS.text, width: 60 },
  dayCalories: { fontSize: 14, fontWeight: '500', color: COLORS.text, width: 80 },
  dayMacros: { flex: 1, flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  dayMacro: { fontSize: 12 },
});

const avgStyles = StyleSheet.create({
  container: { alignItems: 'center', flex: 1 },
  label: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 4 },
  value: { fontSize: 20, fontWeight: 'bold' },
  unit: { fontSize: 11, color: COLORS.textSecondary },
  pct: { fontSize: 11, fontWeight: '600', marginTop: 2 },
});
