import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Linking, RefreshControl } from 'react-native';
import { getSiklusList, getBiayaList, createBiaya, updateBiaya, deleteBiaya, getLaporan, calculateLaporan, getPdfExportUrl } from '../services/api';
import { colors } from '../theme/colors';

export default function AccountingScreen() {
  const [siklusList, setSiklusList] = useState([]);
  const [selectedSiklusId, setSelectedSiklusId] = useState(null);
  
  // Cost Form States
  const [kategori, setKategori] = useState('');
  const [jumlah, setJumlah] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [editingBiayaId, setEditingBiayaId] = useState(null);

  // Profit/HPP Estimation States
  const [hargaJualEstimasi, setHargaJualEstimasi] = useState('');

  // Data Lists & Reports
  const [biayaList, setBiayaList] = useState([]);
  const [laporan, setLaporan] = useState(null);

  // UI Loaders
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch cycles list on mount
  const initScreen = async () => {
    setLoading(true);
    const result = await getSiklusList();
    if (result.success && result.data.length > 0) {
      setSiklusList(result.data);
      // Default select the first active cycle
      const active = result.data.find(s => s.status === 'berjalan') || result.data[0];
      setSelectedSiklusId(active.id);
    }
    setLoading(false);
  };

  // Fetch costs and reports when selected cycle changes
  const fetchCycleData = async (siklusId) => {
    if (!siklusId) return;
    const biayaResult = await getBiayaList(siklusId);
    if (biayaResult.success) {
      setBiayaList(biayaResult.data);
    }

    const laporanResult = await getLaporan(siklusId);
    if (laporanResult.success) {
      setLaporan(laporanResult.data);
      if (laporanResult.data && !hargaJualEstimasi) {
        // Prefill estimated price if available
        const estimasiPrice = (parseFloat(laporanResult.data.total_pendapatan) / parseFloat(laporanResult.data.hasil_panen)) || '';
        setHargaJualEstimasi(estimasiPrice ? Math.round(estimasiPrice).toString() : '');
      }
    } else {
      setLaporan(null);
    }
  };

  useEffect(() => {
    initScreen();
  }, []);

  useEffect(() => {
    if (selectedSiklusId) {
      fetchCycleData(selectedSiklusId);
    }
  }, [selectedSiklusId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await initScreen();
    if (selectedSiklusId) {
      await fetchCycleData(selectedSiklusId);
    }
    setRefreshing(false);
  };

  // CRUD Costs Logic
  const handleSaveBiaya = async () => {
    if (!kategori || !jumlah || !tanggal) {
      Alert.alert('Gagal', 'Semua kolom form biaya wajib diisi.');
      return;
    }

    setActionLoading(true);
    const payload = {
      kategori,
      jumlah: parseFloat(jumlah),
      tanggal,
      siklus_id: selectedSiklusId
    };

    let res;
    if (editingBiayaId) {
      res = await updateBiaya(editingBiayaId, payload);
    } else {
      res = await createBiaya(payload);
    }

    setActionLoading(false);
    if (res.success) {
      Alert.alert('Sukses', editingBiayaId ? 'Pengeluaran berhasil diubah.' : 'Pengeluaran berhasil dicatat.');
      // Reset form
      setKategori('');
      setJumlah('');
      setTanggal(new Date().toISOString().split('T')[0]);
      setEditingBiayaId(null);
      // Reload costs
      fetchCycleData(selectedSiklusId);
    } else {
      Alert.alert('Gagal', res.error || 'Terjadi kesalahan sistem.');
    }
  };

  const handleEditClick = (biaya) => {
    setEditingBiayaId(biaya.id);
    setKategori(biaya.kategori);
    setJumlah(parseFloat(biaya.jumlah).toString());
    setTanggal(biaya.tanggal.split('T')[0]);
  };

  const handleCancelEdit = () => {
    setEditingBiayaId(null);
    setKategori('');
    setJumlah('');
    setTanggal(new Date().toISOString().split('T')[0]);
  };

  const handleDeleteClick = (id) => {
    Alert.alert(
      'Hapus Pengeluaran',
      'Apakah Anda yakin ingin menghapus data pengeluaran ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            const res = await deleteBiaya(id);
            setActionLoading(false);
            if (res.success) {
              fetchCycleData(selectedSiklusId);
            } else {
              Alert.alert('Gagal', 'Gagal menghapus biaya.');
            }
          }
        }
      ]
    );
  };

  // Financial Calculations Trigger
  const handleCalculate = async () => {
    if (!hargaJualEstimasi) {
      Alert.alert('Gagal', 'Harga jual estimasi per kg wajib diisi.');
      return;
    }

    const currentSiklus = siklusList.find(s => s.id === selectedSiklusId);
    if (!currentSiklus || !currentSiklus.hasil_panen) {
      Alert.alert('Perhatian', 'Siklus tanam terpilih belum panen atau hasil panen belum tercatat (panen di-set 0 kg). HPP dihitung 0.');
    }

    setActionLoading(true);
    const res = await calculateLaporan(selectedSiklusId, hargaJualEstimasi);
    setActionLoading(false);
    
    if (res.success) {
      Alert.alert('Sukses', 'Kalkulasi HPP & keuntungan berhasil disimpan.');
      fetchCycleData(selectedSiklusId);
    } else {
      Alert.alert('Gagal', res.error || 'Gagal menghitung laporan.');
    }
  };

  // PDF Export Trigger
  const handleExportPdf = () => {
    if (!selectedSiklusId) return;
    const url = getPdfExportUrl(selectedSiklusId);
    Linking.openURL(url).catch((err) => {
      Alert.alert('Gagal', 'Tidak bisa membuka url download PDF: ' + err.message);
    });
  };

  const getActiveSiklus = () => {
    return siklusList.find(s => s.id === selectedSiklusId);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Memuat modul akuntansi...</Text>
      </View>
    );
  }

  const selectedSiklus = getActiveSiklus();
  const totalBiayaSum = biayaList.reduce((sum, item) => sum + parseFloat(item.jumlah), 0);

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
        <Text style={styles.title}>Modul Akunting</Text>
        <Text style={styles.subtitle}>Kelola pengeluaran operasional dan pantau kalkulasi HPP.</Text>
      </View>

      {/* Cycle Selector Dropdown */}
      <View style={styles.selectorWrapper}>
        <Text style={styles.inputLabel}>Pilih Siklus Tanam:</Text>
        <View style={styles.cyclesContainer}>
          {siklusList.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.cycleBtn, selectedSiklusId === s.id && styles.activeCycleBtn]}
              onPress={() => setSelectedSiklusId(s.id)}
            >
              <Text style={[styles.cycleBtnText, selectedSiklusId === s.id && styles.activeCycleBtnText]}>
                {s.nama} ({s.status === 'selesai' ? 'Selesai' : 'Aktif'})
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Primary Financial Projections (HPP / Profit / Earnings) */}
      <View style={styles.projectionCard}>
        <Text style={styles.projHeader}>Rangkuman Keuangan</Text>
        <View style={styles.projRow}>
          <Text style={styles.projLabel}>Total Biaya Operasional</Text>
          <Text style={styles.projVal}>Rp {totalBiayaSum.toLocaleString('id-ID')}</Text>
        </View>
        <View style={styles.projRow}>
          <Text style={styles.projLabel}>Hasil Panen</Text>
          <Text style={styles.projVal}>{selectedSiklus?.hasil_panen ? `${selectedSiklus.hasil_panen} kg` : 'Belum Panen'}</Text>
        </View>
        <View style={styles.projDivider} />
        <View style={styles.projRow}>
          <Text style={styles.projLabelBold}>HPP / Kilogram (kg)</Text>
          <Text style={styles.projValBold}>
            {laporan ? `Rp ${Math.round(parseFloat(laporan.hpp)).toLocaleString('id-ID')}` : 'Rp --'}
          </Text>
        </View>
        <View style={styles.projRow}>
          <Text style={styles.projLabelBold}>Estimasi Keuntungan</Text>
          <Text style={[styles.projValBold, { color: laporan?.keuntungan >= 0 ? colors.success : colors.danger }]}>
            {laporan ? `Rp ${Math.round(parseFloat(laporan.keuntungan)).toLocaleString('id-ID')}` : 'Rp --'}
          </Text>
        </View>
      </View>

      {/* Action Buttons for PDF Export */}
      {laporan && (
        <TouchableOpacity style={styles.exportPdfBtn} onPress={handleExportPdf}>
          <Text style={styles.exportPdfBtnText}>📄 Unduh Laporan PDF Resmi</Text>
        </TouchableOpacity>
      )}

      {/* Calculator Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Kalkulator Proyeksi HPP</Text>
        <Text style={styles.cardDesc}>Masukkan estimasi harga jual per kg untuk menghitung HPP & proyeksi laba bersih demplot.</Text>
        
        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>Estimasi Harga Jual (Rp/kg)</Text>
          <TextInput
            style={styles.input}
            placeholder="Contoh: 6500"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={hargaJualEstimasi}
            onChangeText={setHargaJualEstimasi}
          />
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleCalculate} disabled={actionLoading}>
          <Text style={styles.submitBtnText}>Hitung & Simpan Laporan</Text>
        </TouchableOpacity>
      </View>

      {/* Cost Entry Form */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{editingBiayaId ? 'Edit Catatan Biaya' : 'Catat Biaya Produksi Baru'}</Text>
        
        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>Kategori / Rincian Pengeluaran</Text>
          <TextInput
            style={styles.input}
            placeholder="Contoh: Pupuk NPK Phonska, Upah Harian"
            placeholderTextColor={colors.textMuted}
            value={kategori}
            onChangeText={setKategori}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>Jumlah Pengeluaran (Rp)</Text>
          <TextInput
            style={styles.input}
            placeholder="Contoh: 150000"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={jumlah}
            onChangeText={setJumlah}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>Tanggal Pengeluaran (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            placeholder="Contoh: 2026-07-15"
            placeholderTextColor={colors.textMuted}
            value={tanggal}
            onChangeText={setTanggal}
          />
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity 
            style={[styles.submitBtn, { flex: 1, marginRight: editingBiayaId ? 10 : 0 }]} 
            onPress={handleSaveBiaya} 
            disabled={actionLoading}
          >
            <Text style={styles.submitBtnText}>{editingBiayaId ? 'Update' : 'Simpan Transaksi'}</Text>
          </TouchableOpacity>

          {editingBiayaId && (
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelEdit} disabled={actionLoading}>
              <Text style={styles.cancelBtnText}>Batal</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Costs List Grid */}
      <Text style={styles.sectionTitle}>Riwayat Biaya Produksi</Text>
      {biayaList.length > 0 ? (
        biayaList.map((biaya) => (
          <View key={biaya.id} style={styles.costItemCard}>
            <View style={styles.costDetails}>
              <Text style={styles.costCategory}>{biaya.kategori}</Text>
              <Text style={styles.costDate}>{new Date(biaya.tanggal).toLocaleDateString('id-ID')}</Text>
            </View>
            <View style={styles.costActionWrapper}>
              <Text style={styles.costAmount}>Rp {parseFloat(biaya.jumlah).toLocaleString('id-ID')}</Text>
              <View style={styles.costActionBtnRow}>
                <TouchableOpacity style={styles.editBtn} onPress={() => handleEditClick(biaya)}>
                  <Text style={styles.actionBtnText}>Ubah</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteClick(biaya.id)}>
                  <Text style={styles.actionBtnText}>Hapus</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.noDataText}>Belum ada riwayat pengeluaran untuk siklus tanam ini.</Text>
      )}
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
    paddingTop: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: colors.textMuted,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 5,
  },
  selectorWrapper: {
    marginBottom: 20,
  },
  cyclesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  cycleBtn: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    marginBottom: 10,
  },
  activeCycleBtn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cycleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  activeCycleBtnText: {
    color: colors.card,
  },
  projectionCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  projHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.card,
    marginBottom: 15,
  },
  projRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  projLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  projVal: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.card,
  },
  projDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginVertical: 12,
  },
  projLabelBold: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.card,
  },
  projValBold: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.card,
  },
  exportPdfBtn: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  exportPdfBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 5,
  },
  cardDesc: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 15,
  },
  formGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
  },
  btnRow: {
    flexDirection: 'row',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 5,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.card,
  },
  cancelBtn: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 5,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    marginTop: 10,
  },
  costItemCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costDetails: {
    flex: 1,
  },
  costCategory: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  costDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  costActionWrapper: {
    alignItems: 'flex-end',
  },
  costAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  costActionBtnRow: {
    flexDirection: 'row',
  },
  editBtn: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  deleteBtn: {
    backgroundColor: 'rgba(211, 47, 47, 0.06)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  noDataText: {
    fontSize: 13,
    color: colors.textMuted,
    marginVertical: 10,
    textAlign: 'center',
  },
});
