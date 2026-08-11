import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
  KeyboardAvoidingView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { colors, withAlpha } from '../theme/colors';
import {
  getJadwalKegiatan,
  createJadwalKegiatan,
  updateJadwalKegiatan,
  deleteJadwalKegiatan,
  getRekomendasiPupuk,
  createRekomendasiPupuk,
  updateRekomendasiPupuk,
  deleteRekomendasiPupuk
} from '../services/api';

// Konfigurasi notifikasi jika di platform native
if (Platform.OS !== 'web') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (err) {
    console.warn('[Notifications] Gagal setNotificationHandler (Expo Go / SDK limitation):', err.message);
  }
}

export default function KegiatanScreen() {
  const [activeTab, setActiveTab] = useState('jadwal'); // 'jadwal' | 'rekomendasi'
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // States untuk Jadwal (hanya kategori Tani)
  const [jadwalList, setJadwalList] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [namaKegiatan, setNamaKegiatan] = useState('');
  const [tanggalKegiatan, setTanggalKegiatan] = useState('');
  const [deskripsiKegiatan, setDeskripsiKegiatan] = useState('');

  // States untuk Rekomendasi
  const [rekomendasiList, setRekomendasiList] = useState([]);
  const [selectedBedengId, setSelectedBedengId] = useState(1);

  // Setup permission & notifications
  useEffect(() => {
    async function requestPermission() {
      if (Platform.OS !== 'web') {
        const isExpoGo =
          Constants.executionEnvironment === ExecutionEnvironment?.StoreClient ||
          Constants.appOwnership === 'expo';

        if (isExpoGo) {
          console.log('[Notifications] Berjalan di Expo Go: Permintaan izin notifikasi remote dilewati (keterbatasan SDK 53+).');
          return;
        }

        try {
          const { status } = await Notifications.requestPermissionsAsync();
          if (status !== 'granted') {
            console.log('Permission for local notifications not granted');
          }
        } catch (err) {
          console.warn('[Notifications] Gagal meminta izin notifikasi:', err.message);
        }
      }
    }
    requestPermission();
    fetchData();
  }, []);

  const fetchData = async () => {
    const isCurrentListEmpty = activeTab === 'jadwal' ? jadwalList.length === 0 : rekomendasiList.length === 0;
    if (isCurrentListEmpty) {
      setLoading(true);
    }
    try {
      if (activeTab === 'jadwal') {
        const res = await getJadwalKegiatan('Tani');
        if (res.success && Array.isArray(res.data)) {
          setJadwalList(res.data);
        } else if (jadwalList.length === 0) {
          setJadwalList([]);
        }
      } else {
        const res = await getRekomendasiPupuk();
        if (res.success && Array.isArray(res.data)) {
          setRekomendasiList(res.data);
        } else if (rekomendasiList.length === 0) {
          setRekomendasiList([]);
        }
      }
    } catch (e) {
      console.warn('Kegiatan fetchData error:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'jadwal') {
        const res = await getJadwalKegiatan('Tani');
        if (res.success) setJadwalList(res.data);
      } else {
        const res = await getRekomendasiPupuk();
        if (res.success) setRekomendasiList(res.data);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [activeTab])
  );

  // Penjadwalan notifikasi H-1 sebelum kegiatan
  const scheduleNotification = async (title, dateStr) => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Notifikasi Terjadwal (Web Simulator)',
        `Notifikasi pengingat H-1 untuk "${title}" dijadwalkan pada tanggal ${dateStr}`
      );
      return;
    }

    try {
      const taskDate = new Date(dateStr);
      const reminderTime = new Date(taskDate.getTime() - 24 * 60 * 60 * 1000); // H-1
      const now = new Date();

      let trigger;
      let noteMsg = '';
      if (reminderTime > now) {
        trigger = reminderTime;
        noteMsg = 'Pengingat dikirim H-1 sebelum kegiatan.';
      } else {
        // Jika H-1 sudah lewat, jadwalkan 5 detik kemudian untuk testing instan
        trigger = new Date(now.getTime() + 5 * 1000);
        noteMsg = 'Agenda kurang dari 24 jam. Notifikasi demo dikirim dalam 5 detik.';
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🔔 Pengingat Kegiatan Tani`,
          body: `Besok ada agenda "${title}". Harap persiapkan kebutuhan demplot Anda.`,
          sound: true,
        },
        trigger,
      });

      Alert.alert('Sukses Penjadwalan', 'Jadwal dan alarm pengingat berhasil disimpan.');
    } catch (error) {
      console.warn('Gagal menjadwalkan notifikasi (Expo Go/Native limitation):', error.message);
      Alert.alert(
        'Info Penjadwalan',
        'Jadwal berhasil disimpan.'
      );
    }
  };

  // Submit Jadwal Baru
  const handleCreateJadwal = async () => {
    if (!namaKegiatan || !tanggalKegiatan) {
      Alert.alert('Galat', 'Nama kegiatan dan Tanggal wajib diisi.');
      return;
    }

    // Validasi format tanggal sederhana YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(tanggalKegiatan)) {
      Alert.alert('Galat', 'Gunakan format tanggal YYYY-MM-DD (contoh: 2026-07-20)');
      return;
    }

    try {
      const payload = {
        nama_kegiatan: namaKegiatan,
        tanggal: `${tanggalKegiatan}T08:00:00.000Z`,
        status: 'BELUM_MULAI',
        deskripsi: deskripsiKegiatan,
        kategori: 'Tani' // Selalu Tani — Ormawa dipisah dari tampilan petani
      };

      const res = await createJadwalKegiatan(payload);
      if (res.success) {
        setNamaKegiatan('');
        setTanggalKegiatan('');
        setDeskripsiKegiatan('');
        setModalVisible(false);
        fetchData();

        // Jadwalkan notifikasi local H-1
        scheduleNotification(payload.nama_kegiatan, payload.tanggal);
      } else {
        Alert.alert('Gagal', res.error || 'Gagal menyimpan jadwal.');
      }
    } catch (e) {
      console.warn(e);
    }
  };

  // Toggle Selesai Jadwal
  const handleToggleJadwalStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'SELESAI' ? 'BELUM_MULAI' : 'SELESAI';
    try {
      const res = await updateJadwalKegiatan(id, { status: nextStatus });
      if (res.success) {
        fetchData();
      }
    } catch (e) {
      console.warn(e);
    }
  };

  // Kalkulasi Rekomendasi Baru
  const handleHitungRekomendasi = async () => {
    setLoading(true);
    try {
      const res = await createRekomendasiPupuk({
        bedeng_id: String(selectedBedengId),
        bedeng_nama: `Bedeng ${selectedBedengId}`
      });
      if (res.success) {
        Alert.alert('Berhasil', `Rekomendasi pupuk untuk Bedeng ${selectedBedengId} berhasil dibuat.`);
        fetchData();
      } else {
        Alert.alert('Gagal', res.error || 'Gagal kalkulasi rekomendasi.');
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  // Toggle Selesai Rekomendasi Pupuk
  const handleToggleRekomendasiStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'SELESAI' ? 'BELUM_SELESAI' : 'SELESAI';
    try {
      const res = await updateRekomendasiPupuk(id, { status: nextStatus });
      if (res.success) {
        fetchData();
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleDeleteJadwal = (id) => {
    Alert.alert(
      'Hapus Jadwal',
      'Apakah Anda yakin ingin menghapus jadwal kegiatan ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteJadwalKegiatan(id);
            if (res.success) {
              fetchData();
            } else {
              Alert.alert('Gagal', res.error || 'Gagal menghapus jadwal.');
            }
          }
        }
      ]
    );
  };

  const handleDeleteRekomendasi = (id) => {
    Alert.alert(
      'Hapus Rekomendasi',
      'Apakah Anda yakin ingin menghapus log rekomendasi ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteRekomendasiPupuk(id);
            if (res.success) {
              fetchData();
            } else {
              Alert.alert('Gagal', res.error || 'Gagal menghapus rekomendasi.');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      {/* Segmented Control (Tabs) */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'jadwal' && styles.tabButtonActive]}
          onPress={() => setActiveTab('jadwal')}
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            color={activeTab === 'jadwal' ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.tabText, activeTab === 'jadwal' && styles.tabTextActive]}>
            Jadwal Tani
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'rekomendasi' && styles.tabButtonActive]}
          onPress={() => setActiveTab('rekomendasi')}
        >
          <Ionicons
            name="flask-outline"
            size={18}
            color={activeTab === 'rekomendasi' ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.tabText, activeTab === 'rekomendasi' && styles.tabTextActive]}>
            Saran Pupuk
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
            />
          }
        >
          {activeTab === 'jadwal' ? (
            // ================== TAB JADWAL TANI ==================
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Jadwal Kerja Tani</Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setModalVisible(true)}
                >
                  <Ionicons name="add" size={20} color={colors.card} />
                  <Text style={styles.addButtonText}>Tambah</Text>
                </TouchableOpacity>
              </View>

              {jadwalList.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="clipboard-outline" size={48} color={colors.textMuted} />
                  <Text style={styles.emptyText}>Belum ada agenda terdaftar.</Text>
                </View>
              ) : (
                jadwalList.map((item) => (
                  <View key={item.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{item.nama_kegiatan}</Text>
                        <Text style={styles.cardDate}>
                          <Ionicons name="time-outline" size={12} color={colors.textMuted} />{' '}
                          {formatDate(item.tanggal)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.statusBadge,
                          item.status === 'SELESAI' ? styles.badgeSuccess : styles.badgeWarning
                        ]}
                        onPress={() => handleToggleJadwalStatus(item.id, item.status)}
                      >
                        <Ionicons
                          name={item.status === 'SELESAI' ? 'checkmark-circle' : 'ellipse-outline'}
                          size={14}
                          color={item.status === 'SELESAI' ? colors.success : colors.warning}
                        />
                        <Text
                          style={[
                            styles.badgeText,
                            { color: item.status === 'SELESAI' ? colors.success : colors.warning }
                          ]}
                        >
                          {item.status === 'SELESAI' ? 'Selesai' : 'Belum Mulai'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {item.deskripsi ? (
                      <Text style={styles.cardDescription}>{item.deskripsi}</Text>
                    ) : null}

                    {/* Alarm Indicator & Delete Action */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                      <View style={styles.reminderRow}>
                        <Ionicons name="notifications-outline" size={14} color={colors.textMuted} />
                        <Text style={styles.reminderLabel}>
                          Notifikasi Pengingat H-1 Aktif
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => handleDeleteJadwal(item.id)} style={{ padding: 4 }}>
                        <Ionicons name="trash-outline" size={18} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          ) : (
            // ================== TAB REKOMENDASI ==================
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Sistem Rekomendasi IoT</Text>
                <TouchableOpacity
                  style={styles.calcButton}
                  onPress={handleHitungRekomendasi}
                >
                  <Ionicons name="sync-outline" size={16} color={colors.card} />
                  <Text style={styles.calcButtonText}>Kalkulasi</Text>
                </TouchableOpacity>
              </View>

              {/* Selector Bedeng Lahan */}
              <View style={styles.bedengSelectorCard}>
                <Text style={styles.bedengSelectorTitle}>Pilih Bedeng Target Kalkulasi:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bedengSelectorScroll}>
                  {Array.from({ length: 16 }).map((_, idx) => {
                    const bedengNo = idx + 1;
                    const isSelected = selectedBedengId === bedengNo;
                    return (
                      <TouchableOpacity
                        key={bedengNo}
                        style={[styles.bedengChip, isSelected && styles.activeBedengChip]}
                        onPress={() => setSelectedBedengId(bedengNo)}
                      >
                        <Text style={[styles.bedengChipText, isSelected && styles.activeBedengChipText]}>
                          Bedeng {bedengNo}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {rekomendasiList.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="flask-outline" size={48} color={colors.textMuted} />
                  <Text style={styles.emptyText}>Gunakan tombol Kalkulasi untuk mengolah data IoT.</Text>
                </View>
              ) : (
                rekomendasiList.map((item) => (
                  <View key={item.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.recTitle}>Rekomendasi Pemupukan - {item.bedeng_nama || 'Bedeng 1'}</Text>
                        <Text style={styles.cardDate}>
                          <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />{' '}
                          {formatDate(item.tanggal)}
                        </Text>
                      </View>

                      {/* Status checkbox */}
                      <TouchableOpacity
                        style={[
                          styles.statusBadge,
                          item.status === 'SELESAI' ? styles.badgeSuccess : styles.badgeWarning
                        ]}
                        onPress={() => handleToggleRekomendasiStatus(item.id, item.status)}
                      >
                        <Ionicons
                          name={item.status === 'SELESAI' ? 'checkmark-circle' : 'ellipse-outline'}
                          size={14}
                          color={item.status === 'SELESAI' ? colors.success : colors.warning}
                        />
                        <Text
                          style={[
                            styles.badgeText,
                            { color: item.status === 'SELESAI' ? colors.success : colors.warning }
                          ]}
                        >
                          {item.status === 'SELESAI' ? 'Selesai' : 'Belum Selesai'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Sensor stats chips - pH and Kelembaban only */}
                    <View style={styles.sensorGrid}>
                      <View style={styles.sensorChip}>
                        <Text style={styles.sensorLabel}>pH Tanah</Text>
                        <Text style={styles.sensorVal}>{item.kandungan_sensor?.pH?.toFixed(2) || '-'}</Text>
                      </View>
                      <View style={styles.sensorChip}>
                        <Text style={styles.sensorLabel}>Kelembaban</Text>
                        <Text style={styles.sensorVal}>{item.kandungan_sensor?.kelembaban ? `${item.kandungan_sensor.kelembaban.toFixed(1)}%` : '-'}</Text>
                      </View>
                    </View>

                    <View style={styles.recTextContainer}>
                      <Text style={styles.recSectionTitle}>Tindakan:</Text>
                      <Text style={styles.recBodyText}>{item.rekomendasi}</Text>

                      <Text style={[styles.recSectionTitle, { marginTop: 8 }]}>Dosis Kerja:</Text>
                      <Text style={styles.dosisVal}>{item.dosis}</Text>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                      <TouchableOpacity onPress={() => handleDeleteRekomendasi(item.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 }}>
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                        <Text style={{ fontSize: 12, color: colors.danger, fontWeight: '600' }}>Hapus Log</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Modal Form Jadwal Baru */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Tambah Kegiatan Tani</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm}>
                <Text style={styles.inputLabel}>Nama Kegiatan</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: Pemupukan Susulan Urea"
                  placeholderTextColor={colors.textMuted}
                  value={namaKegiatan}
                  onChangeText={setNamaKegiatan}
                />

                <Text style={styles.inputLabel}>Tanggal Kegiatan</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Format: YYYY-MM-DD (Contoh: 2026-07-20)"
                  placeholderTextColor={colors.textMuted}
                  value={tanggalKegiatan}
                  onChangeText={setTanggalKegiatan}
                />

                <Text style={styles.inputLabel}>Deskripsi</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Tuliskan catatan detail kegiatan tani..."
                  placeholderTextColor={colors.textMuted}
                  multiline={true}
                  numberOfLines={3}
                  value={deskripsiKegiatan}
                  onChangeText={setDeskripsiKegiatan}
                />

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleCreateJadwal}
                >
                  <Text style={styles.submitBtnText}>Simpan & Jadwalkan Alarm</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: withAlpha(colors.primary, 0.12),
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 30,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  addButtonText: {
    color: colors.card,
    fontSize: 12,
    fontWeight: 'bold',
  },
  calcButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  calcButtonText: {
    color: colors.card,
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
    gap: 12,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  recTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.primary,
  },
  cardDate: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  cardDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
  },
  badgeSuccess: {
    backgroundColor: withAlpha(colors.success, 0.15),
    borderColor: withAlpha(colors.success, 0.3),
  },
  badgeWarning: {
    backgroundColor: withAlpha(colors.warning, 0.15),
    borderColor: withAlpha(colors.warning, 0.3),
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    marginTop: 4,
    gap: 4,
  },
  reminderLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  sensorGrid: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
  },
  sensorChip: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  sensorLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  sensorVal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 2,
  },
  recTextContainer: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  recSectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  recBodyText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
    marginTop: 2,
  },
  dosisVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.success,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalForm: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: colors.text,
    fontSize: 14,
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  submitBtnText: {
    color: colors.card,
    fontSize: 14,
    fontWeight: 'bold',
  },
  subTabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  subTabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subTabButtonActive: {
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  subTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  subTabTextActive: {
    color: colors.primary,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: withAlpha(colors.primary, 0.1),
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  chipTextActive: {
    color: colors.primary,
  },
  bedengSelectorCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  bedengSelectorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  bedengSelectorScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  bedengChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    marginRight: 6,
  },
  activeBedengChip: {
    borderColor: colors.primary,
    backgroundColor: withAlpha(colors.primary, 0.1),
  },
  bedengChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  activeBedengChipText: {
    color: colors.primary,
    fontWeight: '700',
  }
});
