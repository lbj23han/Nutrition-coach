// 웹 전용 폴백
// Metro: .native.tsx → iOS/Android, .tsx → web
// expo-camera는 이 파일에 임포트되지 않으므로 웹 번들에 포함되지 않음.

import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../lib/constants';
import { analyzeFoodImage, RateLimitError, type VisionFoodResult } from '../../services/openai';

interface FoodCameraProps {
  visible: boolean;
  onClose: () => void;
  onResult: (result: VisionFoodResult) => void;
}

// 웹에서 blob/object URL → base64 변환
async function blobUriToBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function FoodCamera({ visible, onClose, onResult }: FoodCameraProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handlePickImage = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (picked.canceled || !picked.assets[0]) return;

    setIsAnalyzing(true);
    try {
      const base64 = await blobUriToBase64(picked.assets[0].uri);
      const result = await analyzeFoodImage(base64);
      onResult(result);
      onClose();
    } catch (err) {
      if (err instanceof RateLimitError) {
        Alert.alert('사용 한도 초과', 'AI 사용 횟수(10회)를 모두 소진했습니다.');
      } else {
        Alert.alert('분석 실패', '음식을 인식하지 못했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.iconBox}>
            <Text style={styles.icon}>✦</Text>
          </View>

          <Text style={styles.title}>AI 음식 인식</Text>
          <Text style={styles.desc}>
            사진을 업로드하면 AI가 음식 종류와{'\n'}영양 정보를 자동으로 분석해드려요
          </Text>

          {isAnalyzing ? (
            <View style={styles.analyzingBox}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.analyzingText}>AI가 분석 중...</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadButton} onPress={handlePickImage}>
              <Text style={styles.uploadButtonText}>📁  사진 선택하기</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.closeButton} onPress={onClose} disabled={isAnalyzing}>
            <Text style={styles.closeText}>닫기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    paddingBottom: 40,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, marginBottom: 8,
  },
  iconBox: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: COLORS.primaryContainer + '40',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  icon: { fontSize: 32, color: COLORS.primary },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  desc: {
    fontSize: 14, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 22,
  },
  analyzingBox: { alignItems: 'center', gap: 12, paddingVertical: 16 },
  analyzingText: { fontSize: 14, color: COLORS.textSecondary },
  uploadButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 18, paddingHorizontal: 32, paddingVertical: 16,
    width: '100%', alignItems: 'center', marginTop: 8,
  },
  uploadButtonText: { color: COLORS.primaryContainer, fontWeight: '700', fontSize: 16 },
  closeButton: { marginTop: 4, paddingVertical: 8 },
  closeText: { color: COLORS.textSecondary, fontSize: 15 },
});
