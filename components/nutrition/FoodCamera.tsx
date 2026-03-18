import { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { COLORS } from '../../lib/constants';
import { analyzeFoodImage, type VisionFoodResult } from '../../services/openai';

interface FoodCameraProps {
  visible: boolean;
  onClose: () => void;
  onResult: (result: VisionFoodResult) => void;
}

export function FoodCamera({ visible, onClose, onResult }: FoodCameraProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [facing] = useState<CameraType>('back');
  const cameraRef = useRef<CameraView>(null);

  const compressAndEncode = async (uri: string): Promise<string> => {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    return result.base64!;
  };

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    setIsAnalyzing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: false, quality: 0.7 });
      if (!photo) throw new Error('사진 촬영 실패');
      const base64 = await compressAndEncode(photo.uri);
      const result = await analyzeFoodImage(base64);
      onResult(result);
      onClose();
    } catch {
      Alert.alert('분석 실패', '음식을 인식하지 못했습니다. 다시 시도해주세요.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]) return;

    setIsAnalyzing(true);
    try {
      const base64 = await compressAndEncode(result.assets[0].uri);
      const analysisResult = await analyzeFoodImage(base64);
      onResult(analysisResult);
      onClose();
    } catch {
      Alert.alert('분석 실패', '음식을 인식하지 못했습니다. 다시 시도해주세요.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!visible) return null;

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <SafeAreaView style={styles.permissionContainer}>
          <Text style={styles.permissionText}>카메라 권한이 필요합니다</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>권한 허용</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.galleryButton} onPress={handleGallery}>
            <Text style={styles.galleryButtonText}>갤러리에서 선택</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>닫기</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
          {/* Overlay */}
          <SafeAreaView style={styles.overlay}>
            <View style={styles.topBar}>
              <TouchableOpacity style={styles.topButton} onPress={onClose}>
                <Text style={styles.topButtonText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.topTitle}>음식 촬영</Text>
              <TouchableOpacity style={styles.topButton} onPress={handleGallery}>
                <Text style={styles.topButtonText}>🖼</Text>
              </TouchableOpacity>
            </View>

            {/* Focus frame */}
            <View style={styles.frameContainer}>
              <View style={styles.frame}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
              </View>
              <Text style={styles.frameHint}>음식이 프레임 안에 오도록 맞춰주세요</Text>
            </View>

            <View style={styles.bottomBar}>
              {isAnalyzing ? (
                <View style={styles.analyzingContainer}>
                  <ActivityIndicator size="large" color={COLORS.white} />
                  <Text style={styles.analyzingText}>AI가 음식을 분석 중...</Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
                  <View style={styles.captureButtonInner} />
                </TouchableOpacity>
              )}
            </View>
          </SafeAreaView>
        </CameraView>
      </View>
    </Modal>
  );
}

const CORNER_SIZE = 24;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  topButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topButtonText: { color: COLORS.white, fontSize: 18 },
  topTitle: { color: COLORS.white, fontSize: 17, fontWeight: '600' },
  frameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  frame: {
    width: 280,
    height: 280,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: COLORS.white,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH },
  frameHint: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    textAlign: 'center',
  },
  bottomBar: {
    alignItems: 'center',
    paddingBottom: 48,
    height: 140,
    justifyContent: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  captureButtonInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: COLORS.white,
  },
  analyzingContainer: { alignItems: 'center', gap: 12 },
  analyzingText: { color: COLORS.white, fontSize: 15, fontWeight: '500' },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: COLORS.background, gap: 16 },
  permissionText: { fontSize: 18, color: COLORS.text, textAlign: 'center' },
  permissionButton: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
  permissionButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 16 },
  galleryButton: { backgroundColor: COLORS.accent, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
  galleryButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 16 },
  closeButton: { marginTop: 8 },
  closeButtonText: { color: COLORS.textSecondary, fontSize: 15 },
});
