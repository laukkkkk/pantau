import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, withAlpha } from '../theme/colors';
import { createDeteksiHama, getDeteksiHamaList, deleteDeteksiHama } from '../services/api';

const { width } = Dimensions.get('window');

const DIAGNOSES_MAP = {
  'Daun Sehat': {
    rekomendasi: 'Tanaman cabai jawa dalam kondisi sehat dan prima. Lakukan pemeliharaan rutin, penyiraman yang stabil, serta pemupukan berimbang secara berkala.',
    icon: 'checkmark-circle',
    color: colors.success,
    badgeText: 'NORMAL / AMAN'
  },
  'Keriting Daun (Leaf Curl)': {
    rekomendasi: 'Semprot dengan insektisida berbahan aktif abamektin atau imidakloprid untuk mengendalikan hama pembawa virus (thrips/kutu daun). Singkirkan gulma di sekitar tanaman.',
    icon: 'warning',
    color: colors.danger,
    badgeText: 'BAHAYA TINGGI'
  },
  'Bercak Daun (Leaf Spot)': {
    rekomendasi: 'Semprot dengan fungisida berbahan aktif tembaga hidroksida atau mankozeb. Kurangi kelembaban dengan memperbaiki sirkulasi udara dan pangkas daun yang terinfeksi.',
    icon: 'warning',
    color: colors.warning,
    badgeText: 'BAHAYA SEDANG'
  },
  'Kutu Kebul (Whitefly)': {
    rekomendasi: 'Pasang perangkap kuning berperekat di sekitar bedeng. Semprot dengan insektisida nabati (seperti ekstrak daun mimba) atau insektisida kimia sistemik jika serangan parah.',
    icon: 'bug',
    color: colors.warning,
    badgeText: 'BAHAYA SEDANG'
  },
  'Daun Menguning (Yellowish)': {
    rekomendasi: 'Beri pupuk dengan kandungan Nitrogen (N) dan unsur mikro besi (Fe) yang cukup. Periksa drainase tanah untuk menghindari pembusukan akar akibat penyiraman berlebih.',
    icon: 'warning',
    color: colors.warning,
    badgeText: 'BAHAYA SEDANG'
  }
};

function HistoryThumbnail({ uri, diagColor }) {
  const [hasError, setHasError] = useState(false);

  if (!uri || hasError) {
    return (
      <View style={styles.thumbnailPlaceholder}>
        <Ionicons name="leaf-outline" size={26} color={diagColor || colors.primary} />
      </View>
    );
  }

  return (
    <Image 
      source={{ uri }} 
      style={styles.thumbnailImage} 
      onError={() => setHasError(true)}
    />
  );
}

export default function ScanHamaScreen() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const requestPermissions = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (cameraPermission.status !== 'granted' || libraryPermission.status !== 'granted') {
      Alert.alert(
        'Izin Diperlukan',
        'Aplikasi membutuhkan izin kamera dan galeri foto untuk melakukan pemindaian tanaman.'
      );
      return false;
    }
    return true;
  };

  const fetchHistory = async () => {
    if (history.length === 0) {
      setLoadingHistory(true);
    }
    try {
      const response = await getDeteksiHamaList();
      if (response.success && Array.isArray(response.data)) {
        setHistory(response.data);
      } else if (history.length === 0) {
        setHistory([]);
      }
    } catch (err) {
      console.warn('ScanHama fetchHistory error:', err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
      return () => {
        setSelectedImage(null);
        setResult(null);
      };
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  const handleDeleteHistory = (id) => {
    Alert.alert(
      'Hapus Riwayat',
      'Apakah Anda yakin ingin menghapus riwayat pemindaian ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteDeteksiHama(id);
            if (res.success) {
              if (result && result.id === id) {
                clearCurrent();
              }
              fetchHistory();
            } else {
              Alert.alert('Gagal', res.error || 'Gagal menghapus riwayat deteksi.');
            }
          }
        }
      ]
    );
  };

  const handleScan = async (imageUri) => {
    setScanning(true);
    setResult(null);

    // Randomize sedikit titik koordinat di dalam demplot agar tampil tersebar di peta GIS
    const latOffset = (Math.random() - 0.5) * 0.0007;
    const lngOffset = (Math.random() - 0.5) * 0.0007;
    const lat = -6.2084 + latOffset;
    const lng = 106.8460 + lngOffset;

    const response = await createDeteksiHama(imageUri, lat, lng);
    setScanning(false);

    if (response.success && response.data) {
      setResult(response.data);
      fetchHistory(); // Perbarui riwayat
    } else {
      Alert.alert('Gagal Deteksi', response.error || 'Terjadi kesalahan koneksi ke AI service.');
    }
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setSelectedImage(uri);
      handleScan(uri);
    }
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setSelectedImage(uri);
      handleScan(uri);
    }
  };

  const clearCurrent = () => {
    setSelectedImage(null);
    setResult(null);
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Deteksi Penyakit & Hama</Text>
        <Text style={styles.subtitle}>Unggah atau ambil foto daun cabai jawa untuk didiagnosis oleh AI secara realtime.</Text>
      </View>

      {/* Main Scanner Section */}
      <View style={styles.scanCard}>
        {selectedImage ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: selectedImage }} style={styles.previewImage} />
            
            {scanning && (
              <View style={styles.scanOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.overlayText}>Menganalisis foto, mohon tunggu...</Text>
              </View>
            )}

            {!scanning && (
              <TouchableOpacity style={styles.clearBtn} onPress={clearCurrent}>
                <Ionicons name="close" size={20} color="white" />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <Ionicons name="camera-reverse-outline" size={60} color={colors.textMuted} />
            <Text style={styles.placeholderText}>Belum ada foto yang dipilih</Text>
          </View>
        )}

        {!scanning && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.btnSecondary} onPress={pickImage} disabled={scanning}>
              <Ionicons name="images-outline" size={20} color={colors.primary} />
              <Text style={styles.btnSecondaryText}>Galeri</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnPrimary} onPress={takePhoto} disabled={scanning}>
              <Ionicons name="camera" size={20} color="white" />
              <Text style={styles.btnPrimaryText}>Ambil Foto</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Detection Result Details */}
      {result && (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <View style={styles.resultTitleRow}>
              <Ionicons 
                name={DIAGNOSES_MAP[result.nama_hama]?.icon || 'help-circle'} 
                size={24} 
                color={DIAGNOSES_MAP[result.nama_hama]?.color || colors.primary} 
              />
              <Text style={styles.resultPestName}>{result.nama_hama}</Text>
            </View>
            <View style={[
              styles.badge, 
              { backgroundColor: withAlpha(DIAGNOSES_MAP[result.nama_hama]?.color || colors.primary, 0.15) }
            ]}>
              <Text style={[styles.badgeText, { color: DIAGNOSES_MAP[result.nama_hama]?.color }]}>
                {DIAGNOSES_MAP[result.nama_hama]?.badgeText || result.tingkat_bahaya}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Confidence Slider Indicator */}
          {result.ai_details?.confidence !== undefined && (
            <View style={styles.confSection}>
              <View style={styles.confTextRow}>
                <Text style={styles.confLabel}>Tingkat Keyakinan AI:</Text>
                <Text style={styles.confValue}>{Math.round(result.ai_details.confidence * 100)}%</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[
                  styles.progressBarFill, 
                  { 
                    width: `${result.ai_details.confidence * 100}%`,
                    backgroundColor: DIAGNOSES_MAP[result.nama_hama]?.color || colors.primary 
                  }
                ]} />
              </View>
            </View>
          )}

          {/* Recommendation */}
          <View style={styles.recomSection}>
            <Text style={styles.recomLabel}>Rekomendasi Penanganan:</Text>
            <Text style={styles.recomText}>
              {result.ai_details?.rekomendasi || DIAGNOSES_MAP[result.nama_hama]?.rekomendasi || 'Lakukan pengamatan lapangan lanjutan.'}
            </Text>
          </View>
        </View>
      )}

      {/* History Log Section */}
      <View style={styles.historyContainer}>
        <Text style={styles.sectionTitle}>Riwayat Diagnosis Hama</Text>
        
        {loadingHistory ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
        ) : history.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>Belum ada riwayat hasil pemindaian.</Text>
          </View>
        ) : (
          history.map((item) => {
            const diagInfo = DIAGNOSES_MAP[item.nama_hama] || {
              icon: 'help-circle-outline',
              color: colors.textMuted,
              badgeText: item.tingkat_bahaya,
              rekomendasi: 'Lakukan pengamatan lapangan lanjutan.'
            };

            return (
              <View key={item.id} style={styles.historyCard}>
                <HistoryThumbnail uri={item.foto_url} diagColor={diagInfo.color} />

                <View style={styles.historyMainContent}>
                  <View style={styles.historyHeader}>
                    <View style={styles.historyIconName}>
                      <Ionicons name={diagInfo.icon} size={18} color={diagInfo.color} />
                      <Text style={styles.historyPestName}>{item.nama_hama}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.historyTime}>{formatTime(item.timestamp)}</Text>
                      <TouchableOpacity onPress={() => handleDeleteHistory(item.id)} style={{ padding: 2 }}>
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.historyContent}>
                    <Text style={styles.historyRecom} numberOfLines={2}>
                      {diagInfo.rekomendasi}
                    </Text>
                  </View>

                  <View style={styles.historyFooter}>
                    <View style={[
                      styles.smallBadge, 
                      { backgroundColor: withAlpha(diagInfo.color, 0.15) }
                    ]}>
                      <Text style={[styles.smallBadgeText, { color: diagInfo.color }]}>
                        {diagInfo.badgeText}
                      </Text>
                    </View>
                    <Text style={styles.coordinatesText}>
                      Posisi: {item.koordinat?.coordinates ? `${item.koordinat.coordinates[0].toFixed(4)}, ${item.koordinat.coordinates[1].toFixed(4)}` : 'Koordinat default'}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 30,
  },
  header: {
    marginBottom: 25,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 5,
    lineHeight: 20,
  },
  scanCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  imageContainer: {
    width: '100%',
    height: width * 0.55,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'black',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayText: {
    color: 'white',
    marginTop: 10,
    fontWeight: '600',
    fontSize: 14,
  },
  clearBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderContainer: {
    width: '100%',
    height: width * 0.55,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  placeholderText: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 10,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  btnPrimary: {
    flex: 1.1,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginLeft: 8,
  },
  btnPrimaryText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  btnSecondary: {
    flex: 0.9,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginRight: 8,
  },
  btnSecondaryText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  resultCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    marginBottom: 25,
    elevation: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultPestName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  confSection: {
    marginBottom: 16,
  },
  confTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  confLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  confValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  recomSection: {
    backgroundColor: colors.background,
    padding: 14,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  recomLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textMuted,
    marginBottom: 4,
  },
  recomText: {
    fontSize: 13.5,
    color: colors.text,
    lineHeight: 20,
  },
  historyContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 10,
  },
  historyCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  thumbnailImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: colors.background,
    marginRight: 12,
  },
  thumbnailPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyMainContent: {
    flex: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  historyIconName: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyPestName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: 8,
    flexShrink: 1,
  },
  historyTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  historyContent: {
    marginBottom: 10,
  },
  historyRecom: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  smallBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  smallBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  coordinatesText: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
