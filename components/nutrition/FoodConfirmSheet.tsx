import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { COLORS, MEAL_TYPES } from '../../lib/constants';
import type { MealType } from '../../types';
import type { VisionFoodResult } from '../../services/openai';

export interface ConfirmedFoodItem {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface FoodConfirmSheetProps {
  visible: boolean;
  result: VisionFoodResult | null;
  mealType: MealType;
  onMealTypeChange: (type: MealType) => void;
  onConfirm: (items: ConfirmedFoodItem[]) => void;
  onClose: () => void;
}

export function FoodConfirmSheet({
  visible,
  result,
  mealType,
  onMealTypeChange,
  onConfirm,
  onClose,
}: FoodConfirmSheetProps) {
  const [items, setItems] = useState<ConfirmedFoodItem[]>([]);

  // Sync items when result changes
  useState(() => {
    if (result) {
      setItems(result.items.map((i) => ({ ...i })));
    }
  });

  if (!visible || !result) return null;

  // Initialize from result if items are empty
  const displayItems = items.length > 0 ? items : result.items.map((i) => ({ ...i }));

  const updateItem = (index: number, field: keyof ConfirmedFoodItem, value: string) => {
    const updated = [...displayItems];
    if (field === 'name' || field === 'unit') {
      updated[index] = { ...updated[index], [field]: value };
    } else {
      updated[index] = { ...updated[index], [field]: parseFloat(value) || 0 };
    }
    setItems(updated);
  };

  const removeItem = (index: number) => {
    setItems(displayItems.filter((_, i) => i !== index));
  };

  const totalCalories = displayItems.reduce((s, i) => s + (i.calories || 0), 0);

  const handleConfirm = () => {
    if (displayItems.length === 0) return;
    onConfirm(displayItems);
    setItems([]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelText}>취소</Text>
            </TouchableOpacity>
            <Text style={styles.title}>분석 결과 확인</Text>
            <TouchableOpacity
              style={[styles.confirmButton, displayItems.length === 0 && styles.confirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={displayItems.length === 0}
            >
              <Text style={styles.confirmButtonText}>기록</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* AI description */}
            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionIcon}>🤖</Text>
              <Text style={styles.descriptionText}>{result.description}</Text>
            </View>

            {/* Meal type selector */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>식사 유형</Text>
              <View style={styles.mealTypeRow}>
                {(Object.keys(MEAL_TYPES) as MealType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.mealChip, mealType === type && styles.mealChipActive]}
                    onPress={() => onMealTypeChange(type)}
                  >
                    <Text style={[styles.mealChipText, mealType === type && styles.mealChipTextActive]}>
                      {MEAL_TYPES[type]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Food items */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                인식된 음식 <Text style={styles.totalCalories}>총 {Math.round(totalCalories)} kcal</Text>
              </Text>
              <Text style={styles.editHint}>항목을 직접 수정할 수 있어요</Text>

              {displayItems.map((item, index) => (
                <FoodItemCard
                  key={index}
                  item={item}
                  onUpdate={(field, value) => updateItem(index, field, value)}
                  onRemove={() => removeItem(index)}
                />
              ))}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function FoodItemCard({
  item,
  onUpdate,
  onRemove,
}: {
  item: ConfirmedFoodItem;
  onUpdate: (field: keyof ConfirmedFoodItem, value: string) => void;
  onRemove: () => void;
}) {
  return (
    <View style={cardStyles.container}>
      <View style={cardStyles.topRow}>
        <TextInput
          style={cardStyles.nameInput}
          value={item.name}
          onChangeText={(v) => onUpdate('name', v)}
          placeholder="음식명"
        />
        <View style={cardStyles.quantityRow}>
          <TextInput
            style={cardStyles.quantityInput}
            value={String(item.quantity)}
            onChangeText={(v) => onUpdate('quantity', v)}
            keyboardType="decimal-pad"
          />
          <TextInput
            style={cardStyles.unitInput}
            value={item.unit}
            onChangeText={(v) => onUpdate('unit', v)}
            placeholder="단위"
          />
        </View>
        <TouchableOpacity style={cardStyles.removeButton} onPress={onRemove}>
          <Text style={cardStyles.removeText}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={cardStyles.macroRow}>
        <MacroField
          label="칼로리"
          value={item.calories}
          unit="kcal"
          color={COLORS.calories}
          onChange={(v) => onUpdate('calories', v)}
        />
        <MacroField
          label="단백질"
          value={item.protein}
          unit="g"
          color={COLORS.protein}
          onChange={(v) => onUpdate('protein', v)}
        />
        <MacroField
          label="탄수화물"
          value={item.carbs}
          unit="g"
          color={COLORS.carbs}
          onChange={(v) => onUpdate('carbs', v)}
        />
        <MacroField
          label="지방"
          value={item.fat}
          unit="g"
          color={COLORS.fat}
          onChange={(v) => onUpdate('fat', v)}
        />
      </View>
    </View>
  );
}

function MacroField({
  label,
  value,
  unit,
  color,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={macroStyles.container}>
      <Text style={macroStyles.label}>{label}</Text>
      <View style={[macroStyles.inputRow, { borderColor: color }]}>
        <TextInput
          style={[macroStyles.input, { color }]}
          value={String(Math.round(value * 10) / 10)}
          onChangeText={onChange}
          keyboardType="decimal-pad"
        />
        <Text style={macroStyles.unit}>{unit}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cancelText: { fontSize: 16, color: COLORS.textSecondary },
  title: { fontSize: 17, fontWeight: '600', color: COLORS.text },
  confirmButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  confirmButtonDisabled: { opacity: 0.4 },
  confirmButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 15 },
  descriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: 16,
    padding: 14,
    backgroundColor: COLORS.primaryLight + '20',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  descriptionIcon: { fontSize: 20 },
  descriptionText: { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 20 },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  totalCalories: { fontSize: 13, color: COLORS.calories, fontWeight: 'normal' },
  editHint: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 12 },
  mealTypeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  mealChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  mealChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  mealChipText: { fontSize: 13, color: COLORS.textSecondary },
  mealChipTextActive: { color: COLORS.white, fontWeight: '600' },
});

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  nameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 4,
  },
  quantityRow: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  quantityInput: {
    width: 52,
    textAlign: 'center',
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  unitInput: {
    width: 40,
    textAlign: 'center',
    fontSize: 13,
    color: COLORS.textSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeText: { color: COLORS.error, fontSize: 12, fontWeight: '600' },
  macroRow: { flexDirection: 'row', gap: 8 },
});

const macroStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  label: { fontSize: 10, color: COLORS.textSecondary, marginBottom: 4 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 2,
    width: '100%',
    justifyContent: 'center',
  },
  input: { fontSize: 14, fontWeight: '600', textAlign: 'right', flex: 1 },
  unit: { fontSize: 10, color: COLORS.textSecondary },
});
