import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Linking, RefreshControl, Modal, Platform, KeyboardAvoidingView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getSiklusList, updateSiklus, getBiayaList, createBiaya, updateBiaya, deleteBiaya, getLaporan, calculateLaporan, getPdfExportUrl } from '../services/api';
import { colors } from '../theme/colors';

const CATEGORIES = ['Benih', 'Pupuk', 'Pestisida', 'Tenaga Kerja', 'Sewa Alat', 'Lainnya'];

const formatNumberWithDots = (val) => {
  if (val === null || val === undefined || val === '') return '';
  const digits = String(val).replace(/\D/g, '');
  if (!digits) return '';
  return parseInt(digits, 10).toLocaleString('id-ID');
};

export default function AccountingScreen() {
  const [activeTab, setActiveTab] = useState('buku'); // 'buku' | 'hpp' | 'bep' | 'labarugi'
  const [siklusList, setSiklusList] = useState([]);
  const [selectedSiklusId, setSelectedSiklusId] = useState(null);
  
  // Cost Form States
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Benih');
  const [deskripsi, setDeskripsi] = useState('');
  const [jumlah, setJumlah] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [editingBiayaId, setEditingBiayaId] = useState(null);

  // Simulation Sliders / Preset Inputs
  const [estimasiHasilPanen, setEstimasiHasilPanen] = useState(1000); // in kg
  const [targetHargaJual, setTargetHargaJual] = useState(25000); // Rp/kg

  // Data Lists & Reports
  const [biayaList, setBiayaList] = useState([]);
  const [laporan, setLaporan] = useState(null);

  // UI Loaders
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const isCycleActive = (s) => {
    if (!s || !s.status) return false;
    const st = s.status.toString().toLowerCase();
    return st === 'berjalan' || st === 'aktif';
  };

  // Fetch cycles list on mount
  const initScreen = async () => {
    setLoading(true);
    const result = await getSiklusList();
    if (result.success && result.data.length > 0) {
      setSiklusList(result.data);
      // Default select the first active/running cycle, otherwise first available
      const active = result.data.find(isCycleActive) || result.data[0];
      setSelectedSiklusId(active.id);
    }
    setLoading(false);
  };

  // Fetch costs and reports when selected cycle changes
  const fetchCycleData = async (siklusId) => {
    if (!siklusId) return;
    try {
      const [biayaResult, laporanResult] = await Promise.all([
        getBiayaList(siklusId),
        getLaporan(siklusId)
      ]);

      if (biayaResult.success) {
        setBiayaList(biayaResult.data);
      }

      if (laporanResult.success && laporanResult.data) {
        setLaporan(laporanResult.data);
        
        // Calculate estimated sell price from current report if present
        const currentSiklus = siklusList.find(s => s.id === siklusId);
        const yieldAmt = currentSiklus?.hasil_panen || 0;
        if (yieldAmt > 0) {
          setEstimasiHasilPanen(yieldAmt);
        }
        
        const parsedPrice = yieldAmt > 0 ? Math.round(parseFloat(laporanResult.data.total_pendapatan) / yieldAmt) : 25000;
        setTargetHargaJual(parsedPrice || 25000);
      } else {
        setLaporan(null);
      }
    } catch (err) {
      console.warn('Accounting fetchCycleData error:', err.message);
    }
  };

  // Auto-refresh cycle list every time the Accounting tab is focused
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const refreshSiklusList = async () => {
        const result = await getSiklusList();
        if (!isMounted) return;

        if (result.success && Array.isArray(result.data)) {
          const freshList = result.data;
          setSiklusList(freshList);

          if (freshList.length === 0) {
            setSelectedSiklusId(null);
            setBiayaList([]);
            setLaporan(null);
          } else {
            setSelectedSiklusId((prevSelectedId) => {
              const exists = freshList.some((s) => String(s.id) === String(prevSelectedId));
              if (exists && prevSelectedId) {
                return prevSelectedId;
              }
              const active = freshList.find(isCycleActive) || freshList[0];
              return active ? active.id : null;
            });
          }
        } else {
          setSiklusList([]);
          setSelectedSiklusId(null);
          setBiayaList([]);
          setLaporan(null);
        }
        setLoading(false);
      };

      refreshSiklusList();

      return () => {
        isMounted = false;
      };
    }, [])
  );

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
    const rawJumlah = jumlah ? jumlah.replace(/\D/g, '') : '';
    if (!selectedCategory || !deskripsi || !rawJumlah || !tanggal) {
      Alert.alert('Gagal', 'Semua kolom form biaya wajib diisi.');
      return;
    }

    setActionLoading(true);
    const payload = {
      kategori: selectedCategory,
      deskripsi,
      jumlah: parseFloat(rawJumlah),
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
      // Reset form & hide modal
      setSelectedCategory('Benih');
      setDeskripsi('');
      setJumlah('');
      setTanggal(new Date().toISOString().split('T')[0]);
      setEditingBiayaId(null);
      setIsFormVisible(false);
      // Reload costs
      fetchCycleData(selectedSiklusId);
    } else {
      Alert.alert('Gagal', res.error || 'Terjadi kesalahan sistem.');
    }
  };

  const handleEditClick = (biaya) => {
    setEditingBiayaId(biaya.id);
    setSelectedCategory(biaya.kategori);
    setDeskripsi(biaya.deskripsi || '');
    setJumlah(formatNumberWithDots(biaya.jumlah));
    setTanggal(biaya.tanggal.split('T')[0]);
    setIsFormVisible(true);
  };

  const handleCancelEdit = () => {
    setEditingBiayaId(null);
    setSelectedCategory('Benih');
    setDeskripsi('');
    setJumlah('');
    setTanggal(new Date().toISOString().split('T')[0]);
    setIsFormVisible(false);
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

  // PDF Export Trigger
  const handleExportPdf = () => {
    if (!selectedSiklusId) return;
    const url = getPdfExportUrl(selectedSiklusId);
    Linking.openURL(url).catch((err) => {
      Alert.alert('Gagal', 'Tidak bisa membuka url download PDF: ' + err.message);
    });
  };

  // Trigger backend report recalculation using local target sell price simulation value
  const handleSaveSimulatedReport = async () => {
    setActionLoading(true);
    if (estimasiHasilPanen > 0) {
      await updateSiklus(selectedSiklusId, { hasil_panen: parseFloat(estimasiHasilPanen) });
    }
    const res = await calculateLaporan(selectedSiklusId, targetHargaJual, estimasiHasilPanen);
    setActionLoading(false);
    
    if (res.success) {
      Alert.alert('Sukses', 'Hitung-hitungan biaya modal & perkiraan untung berhasil disimpan ke database.');
      fetchCycleData(selectedSiklusId);
    } else {
      Alert.alert('Gagal', res.error || 'Gagal menyimpan laporan.');
    }
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

  // Group allocations by category
  const categoryAllocations = CATEGORIES.map(cat => {
    const total = biayaList
      .filter(b => b.kategori === cat)
      .reduce((sum, b) => sum + parseFloat(b.jumlah), 0);
    const percentage = totalBiayaSum > 0 ? (total / totalBiayaSum) * 100 : 0;
    return { category: cat, total, percentage };
  });

  // Dynamic Math for Sliders
  const simulatedHPP = estimasiHasilPanen > 0 ? totalBiayaSum / estimasiHasilPanen : 0;
  const bepVolume = targetHargaJual > 0 ? totalBiayaSum / targetHargaJual : 0;
  const bepOmset = bepVolume * targetHargaJual;
  const projectedRevenue = estimasiHasilPanen * targetHargaJual;
  const projectedNetIncome = projectedRevenue - totalBiayaSum;

  const safetyRatio = bepVolume > 0 ? (estimasiHasilPanen / bepVolume) : 0;
  let safetyStatus = 'Bahaya';
  let safetyColor = colors.danger;
  let safetyProgress = 0.2;
  if (safetyRatio >= 1.5) {
    safetyStatus = 'Aman';
    safetyColor = colors.primary;
    safetyProgress = 0.9;
  } else if (safetyRatio >= 1.0) {
    safetyStatus = 'Rentan';
    safetyColor = '#ff9800'; // Orange
    safetyProgress = 0.55;
  }

  // Auto generated summary text for profit/loss tab
  const getNarrativeSummary = () => {
    if (totalBiayaSum === 0) return 'Belum ada biaya produksi yang tercatat. Silakan tambah pengeluaran untuk memulai hitung-hitungan untung rugi.';
    if (estimasiHasilPanen === 0) return 'Target hasil panen belum diisi di tab Hitung Biaya Modal. Silakan tentukan target hasil panen Anda.';
    
    if (projectedNetIncome >= 0) {
      return `Usaha tani pada musim ini diperkirakan UNTUNG. Dengan biaya modal sebesar Rp ${Math.round(simulatedHPP).toLocaleString('id-ID')}/kg dan harga pasar Rp ${targetHargaJual.toLocaleString('id-ID')}/kg, Anda bisa mendapatkan untung bersih sekitar Rp ${Math.round(projectedNetIncome).toLocaleString('id-ID')}. Target balik modal Anda adalah minimal ${Math.round(bepVolume)} kg hasil panen.`;
    } else {
      return `Peringatan: Perkiraan menunjukkan potensi rugi sebesar Rp ${Math.round(Math.abs(projectedNetIncome)).toLocaleString('id-ID')}. Biaya modal Anda (Rp ${Math.round(simulatedHPP).toLocaleString('id-ID')}/kg) melebihi target harga jual pasar (Rp ${targetHargaJual.toLocaleString('id-ID')}/kg). Disarankan untuk menekan biaya operasional atau mencari harga jual yang lebih tinggi.`;
    }
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
        <Text style={styles.title}>Buku Keuangan</Text>
        <Text style={styles.subtitle}>Kelola keuangan demplot secara mudah, hitung biaya modal & perkiraan balik modal.</Text>
      </View>

      {/* Cycle Selector Capsule */}
      <View style={styles.selectorWrapper}>
        <Text style={styles.inputLabel}>Pilih Musim Tanam:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cyclesScroll}>
          {siklusList.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.cycleBtn, selectedSiklusId === s.id && styles.activeCycleBtn]}
              onPress={() => setSelectedSiklusId(s.id)}
            >
              <Text style={[styles.cycleBtnText, selectedSiklusId === s.id && styles.activeCycleBtnText]}>
                {s.nama} ({isCycleActive(s) ? 'Berjalan' : 'Selesai'})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Carry-Over Banner (if continuation season) */}
      {selectedSiklus?.musim_sebelumnya_id && (
        <View style={styles.carryOverBannerCard}>
          <View style={styles.carryOverBannerHeader}>
            <Ionicons name="git-commit-outline" size={18} color={colors.primary} />
            <Text style={styles.carryOverBannerTitle}>
              Total Musim-Musim Sebelumnya ({selectedSiklus.musim_sebelumnya_nama || 'Lanjutan'})
            </Text>
          </View>
          <Text style={[
            styles.carryOverBannerVal,
            { color: (laporan?.saldo_kumulatif_sebelumnya || 0) >= 0 ? colors.primary : colors.danger }
          ]}>
            {(laporan?.saldo_kumulatif_sebelumnya || 0) >= 0
              ? `+Rp ${(laporan?.saldo_kumulatif_sebelumnya || 0).toLocaleString('id-ID')} (Total Untung Sebelumnya)`
              : `-Rp ${Math.abs(laporan?.saldo_kumulatif_sebelumnya || 0).toLocaleString('id-ID')} (Total Rugi Sebelumnya)`}
          </Text>
          <Text style={styles.carryOverBannerDesc}>
            {(laporan?.saldo_kumulatif_sebelumnya || 0) >= 0
              ? 'Gabungan total untung dari musim-musim sebelumnya dalam rantai ini.'
              : 'Total rugi modal dari musim sebelumnya yang perlu ditutup oleh hasil musim berjalan.'}
          </Text>
        </View>
      )}

      {/* Main Premium Tab bar */}
      <View style={styles.tabBar}>
        {['buku', 'hpp', 'bep', 'labarugi'].map((tab) => {
          let label = 'Buku';
          if (tab === 'hpp') label = 'Hitung Biaya Modal';
          if (tab === 'bep') label = 'Perkiraan Balik Modal';
          if (tab === 'labarugi') label = 'Untung Rugi';

          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabItem, activeTab === tab && styles.activeTabItem]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* TAB 1: BUKU KEUANGAN */}
      {activeTab === 'buku' && (
        <View>
          {/* Ringkasan Cards Grid */}
          <View style={styles.grid}>
            <View style={styles.gridCard}>
              <Text style={styles.gridLabel}>Total Biaya</Text>
              <Text style={[styles.gridValue, { color: colors.text }]}>
                Rp {totalBiayaSum.toLocaleString('id-ID')}
              </Text>
            </View>
            <View style={styles.gridCard}>
              <Text style={styles.gridLabel}>Perkiraan Untung Rugi</Text>
              <Text style={[styles.gridValue, { color: projectedNetIncome >= 0 ? colors.primary : colors.danger }]}>
                Rp {Math.round(projectedNetIncome).toLocaleString('id-ID')}
              </Text>
            </View>
          </View>

          {/* Allocation Progress Bars */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Alokasi Modal Operasional</Text>
            <Text style={styles.cardDesc}>Breakdown alokasi anggaran belanja tani saat ini per kategori.</Text>
            
            {categoryAllocations.map(item => (
              <View key={item.category} style={styles.allocationRow}>
                <View style={styles.allocationHeader}>
                  <Text style={styles.allocationName}>{item.category}</Text>
                  <Text style={styles.allocationAmount}>
                    Rp {item.total.toLocaleString('id-ID')} ({item.percentage.toFixed(1)}%)
                  </Text>
                </View>
                <View style={styles.progressContainer}>
                  <View style={[styles.progressBar, { width: `${Math.max(item.percentage, 2)}%`, backgroundColor: colors.primary }]} />
                </View>
              </View>
            ))}
          </View>

          {/* Action Row */}
          <TouchableOpacity style={styles.addCostBtn} onPress={() => { setEditingBiayaId(null); setIsFormVisible(true); }}>
            <Text style={styles.addCostBtnText}>➕ Catat Pengeluaran Baru</Text>
          </TouchableOpacity>

          {/* Cost History */}
          <Text style={styles.sectionTitle}>Riwayat Transaksi Biaya</Text>
          {biayaList.length > 0 ? (
            biayaList.map((biaya) => (
              <View key={biaya.id} style={styles.costItemCard}>
                <View style={styles.costDetails}>
                  <Text style={styles.costCategory}>{biaya.kategori}</Text>
                  <Text style={styles.costDesc}>{biaya.deskripsi || '-'}</Text>
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
            <Text style={styles.noDataText}>Belum ada riwayat pengeluaran untuk musim tanam ini.</Text>
          )}
        </View>
      )}

      {/* TAB 2: HITUNG BIAYA MODAL */}
      {activeTab === 'hpp' && (
        <View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Hitung Biaya Modal per Kg</Text>
            <Text style={styles.cardDesc}>Tentukan target hasil panen untuk membagi total modal menjadi biaya modal per kg.</Text>
            
            <View style={styles.hppResultContainer}>
              <Text style={styles.hppLargeVal}>Rp {Math.round(simulatedHPP).toLocaleString('id-ID')} <Text style={{ fontSize: 14, color: colors.textMuted }}>/ kg</Text></Text>
              <Text style={styles.hppFormula}>Cara Hitung: Total Modal (Rp {totalBiayaSum.toLocaleString('id-ID')}) ÷ Hasil Panen ({estimasiHasilPanen} kg)</Text>
            </View>

            {/* Slider Inputs for Target Harvest Weight */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Estimasi Hasil Panen Total (kg):</Text>
              <View style={styles.sliderControlRow}>
                <TouchableOpacity style={styles.circleStepBtn} onPress={() => setEstimasiHasilPanen(Math.max(100, estimasiHasilPanen - 100))}>
                  <Text style={styles.stepBtnText}>-</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.numericValueInput}
                  keyboardType="numeric"
                  value={estimasiHasilPanen ? formatNumberWithDots(estimasiHasilPanen) : ''}
                  onChangeText={(val) => setEstimasiHasilPanen(parseInt(val.replace(/\D/g, ''), 10) || 0)}
                />
                <TouchableOpacity style={styles.circleStepBtn} onPress={() => setEstimasiHasilPanen(estimasiHasilPanen + 100)}>
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>

              {/* Preset buttons */}
              <View style={styles.presetRow}>
                {[500, 1000, 2000, 3000, 5000].map(preset => (
                  <TouchableOpacity key={preset} style={styles.presetBtn} onPress={() => setEstimasiHasilPanen(preset)}>
                    <Text style={styles.presetBtnText}>{preset} kg</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Pricing Margin Analysis */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Perkiraan Harga Jual & Untung</Text>
            <Text style={styles.cardDesc}>Perkiraan untung bersih berdasarkan variasi harga jual pasar saat panen.</Text>

            {[15000, 25000, 35000].map((pricePoint) => {
              const diff = pricePoint - simulatedHPP;
              const revenue = pricePoint * estimasiHasilPanen;
              const netProfit = revenue - totalBiayaSum;
              const profitLabel = netProfit >= 0 ? 'Potensi Untung' : 'Potensi Rugi';

              return (
                <View key={pricePoint} style={styles.pricePointCard}>
                  <View>
                    <Text style={styles.pricePointTitle}>Harga Jual: Rp {pricePoint.toLocaleString('id-ID')} / kg</Text>
                    <Text style={styles.pricePointSubtitle}>
                      {profitLabel}: Rp {Math.round(netProfit).toLocaleString('id-ID')}
                    </Text>
                  </View>
                  <View style={[styles.pricePointBadge, { backgroundColor: netProfit >= 0 ? 'rgba(46, 125, 50, 0.08)' : 'rgba(198, 40, 40, 0.08)' }]}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: netProfit >= 0 ? colors.primary : colors.danger }}>
                      {netProfit >= 0 ? `Selisih Untung +Rp ${Math.round(diff).toLocaleString('id-ID')}/kg` : `Rugi Rp ${Math.round(Math.abs(diff)).toLocaleString('id-ID')}/kg`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* TAB 3: PERKIRAAN BALIK MODAL */}
      {activeTab === 'bep' && (
        <View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Perkiraan Balik Modal</Text>
            <Text style={styles.cardDesc}>Analisis jumlah panen dan target uang masuk minimal agar modal tani Anda kembali.</Text>

            <View style={styles.bepGrid}>
              <View style={styles.bepBox}>
                <Text style={styles.bepLabel}>Kg yang Harus Terjual</Text>
                <Text style={styles.bepVal}>{bepVolume.toFixed(1)} kg</Text>
                <Text style={styles.bepDesc}>Hasil panen minimal biar balik modal</Text>
              </View>
              <View style={styles.bepBox}>
                <Text style={styles.bepLabel}>Target Uang Masuk</Text>
                <Text style={styles.bepVal}>Rp {Math.round(bepOmset).toLocaleString('id-ID')}</Text>
                <Text style={styles.bepDesc}>Uang masuk minimal biar balik modal</Text>
              </View>
            </View>

            {/* Slider Inputs for Sell Price Target */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Target Harga Jual Pasar (Rp/kg):</Text>
              <View style={styles.sliderControlRow}>
                <TouchableOpacity style={styles.circleStepBtn} onPress={() => setTargetHargaJual(Math.max(1000, targetHargaJual - 1000))}>
                  <Text style={styles.stepBtnText}>-</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.numericValueInput}
                  keyboardType="numeric"
                  value={targetHargaJual ? formatNumberWithDots(targetHargaJual) : ''}
                  onChangeText={(val) => setTargetHargaJual(parseInt(val.replace(/\D/g, ''), 10) || 0)}
                />
                <TouchableOpacity style={styles.circleStepBtn} onPress={() => setTargetHargaJual(targetHargaJual + 1000)}>
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>

              {/* Preset buttons */}
              <View style={styles.presetRow}>
                {[10000, 15000, 20000, 25000, 35000].map(preset => (
                  <TouchableOpacity key={preset} style={styles.presetBtn} onPress={() => setTargetHargaJual(preset)}>
                    <Text style={styles.presetBtnText}>Rp {preset.toLocaleString('id-ID')}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Safety margin indicator */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tingkat Aman Hasil Panen</Text>
            <Text style={styles.cardDesc}>Menilai risiko gagal panen terhadap batas minimum modal balik.</Text>

            <View style={styles.safetyHeader}>
              <Text style={styles.safetyLabel}>Tingkat Aman Panen: {safetyRatio.toFixed(2)}x lipat</Text>
              <Text style={[styles.safetyStatusText, { color: safetyColor }]}>{safetyStatus.toUpperCase()}</Text>
            </View>

            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${safetyProgress * 100}%`, backgroundColor: safetyColor }]} />
            </View>
            <Text style={styles.safetyInstructions}>
              {safetyStatus === 'Aman' && '✓ Target panen Anda aman jauh di atas batas balik modal.'}
              {safetyStatus === 'Rentan' && '⚠️ Target panen mepet dengan batas balik modal. Hati-hati risiko hama & cuaca.'}
              {safetyStatus === 'Bahaya' && '❌ Bahaya! Perkiraan panen Anda saat ini di bawah batas balik modal.'}
            </Text>
          </View>

          {/* Akumulasi Proyeksi Rantai Musim */}
          {selectedSiklus?.musim_sebelumnya_id && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Total Perkiraan Musim-Musim Sebelumnya</Text>
              <Text style={styles.cardDesc}>Menggabungkan perkiraan musim ini dengan saldo dari musim-musim sebelumnya.</Text>
              <View style={{ gap: 8, marginTop: 10 }}>
                <View style={styles.statementRowSub}>
                  <Text style={styles.statementLabel}>Perkiraan Untung/Rugi Musim Ini</Text>
                  <Text style={[styles.statementVal, { color: projectedNetIncome >= 0 ? colors.primary : colors.danger }]}>
                    {projectedNetIncome < 0 ? `-Rp ${Math.abs(Math.round(projectedNetIncome)).toLocaleString('id-ID')}` : `Rp ${Math.round(projectedNetIncome).toLocaleString('id-ID')}`}
                  </Text>
                </View>
                <View style={styles.statementRowSub}>
                  <Text style={styles.statementLabel}>Saldo Bawaan dari Musim Sebelumnya</Text>
                  <Text style={[styles.statementVal, { color: (laporan?.saldo_kumulatif_sebelumnya || 0) >= 0 ? colors.primary : colors.danger }]}>
                    {(laporan?.saldo_kumulatif_sebelumnya || 0) < 0 ? `-Rp ${Math.abs(Math.round(laporan?.saldo_kumulatif_sebelumnya || 0)).toLocaleString('id-ID')}` : `Rp ${Math.round(laporan?.saldo_kumulatif_sebelumnya || 0).toLocaleString('id-ID')}`}
                  </Text>
                </View>
                <View style={styles.statementDivider} />
                <View style={styles.statementRowSubBold}>
                  <Text style={styles.statementLabelBold}>Total Perkiraan Gabungan Musim</Text>
                  <Text style={[styles.statementValBold, { color: (projectedNetIncome + (laporan?.saldo_kumulatif_sebelumnya || 0)) >= 0 ? colors.primary : colors.danger }]}>
                    {(projectedNetIncome + (laporan?.saldo_kumulatif_sebelumnya || 0)) < 0 ? `-Rp ${Math.abs(Math.round(projectedNetIncome + (laporan?.saldo_kumulatif_sebelumnya || 0))).toLocaleString('id-ID')}` : `Rp ${Math.round(projectedNetIncome + (laporan?.saldo_kumulatif_sebelumnya || 0)).toLocaleString('id-ID')}`}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Save Calculations CTA */}
          <TouchableOpacity style={styles.saveCalcBtn} onPress={handleSaveSimulatedReport} disabled={actionLoading}>
            <Text style={styles.saveCalcBtnText}>💾 Simpan Perkiraan ke Database</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* TAB 4: LAPORAN UNTUNG RUGI */}
      {activeTab === 'labarugi' && (
        <View>
          {/* Statement Sheet Card */}
          <View style={styles.card}>
            <Text style={styles.statementTitle}>Perkiraan Laporan Untung Rugi</Text>
            <Text style={styles.statementSubtitle}>Musim: {selectedSiklus?.nama || 'Demplot Utama'}</Text>
            <View style={styles.statementDivider} />

            <View style={styles.statementRow}>
              <Text style={styles.statementLabelBold}>PENDAPATAN</Text>
            </View>
            <View style={styles.statementRowSub}>
              <Text style={styles.statementLabel}>Hasil Penjualan Panen ({estimasiHasilPanen} kg × Rp {targetHargaJual.toLocaleString('id-ID')})</Text>
              <Text style={styles.statementVal}>Rp {projectedRevenue.toLocaleString('id-ID')}</Text>
            </View>
            <View style={[styles.statementRow, { marginTop: 10 }]}>
              <Text style={styles.statementLabelBold}>BEBAN OPERASIONAL</Text>
            </View>

            {categoryAllocations.map(item => (
              <View key={item.category} style={styles.statementRowSub}>
                <Text style={styles.statementLabel}>Beban {item.category}</Text>
                <Text style={styles.statementVal}>Rp {item.total.toLocaleString('id-ID')}</Text>
              </View>
            ))}

            <View style={styles.statementRowSubBold}>
              <Text style={styles.statementLabelBold}>Total Beban Operasional</Text>
              <Text style={styles.statementValBold}>Rp {totalBiayaSum.toLocaleString('id-ID')}</Text>
            </View>

            <View style={styles.statementDoubleDivider} />

            <View style={styles.statementRowNet}>
              <Text style={styles.statementNetTitle}>
                {selectedSiklus?.musim_sebelumnya_id ? 'UNTUNG BERSIH (MUSIM INI)' : 'PERKIRAAN UNTUNG BERSIH'}
              </Text>
              <Text style={[styles.statementNetVal, { color: projectedNetIncome >= 0 ? colors.primary : colors.danger }]}>
                {projectedNetIncome < 0 ? `-Rp ${Math.abs(Math.round(projectedNetIncome)).toLocaleString('id-ID')}` : `Rp ${Math.round(projectedNetIncome).toLocaleString('id-ID')}`}
              </Text>
            </View>

            {selectedSiklus?.musim_sebelumnya_id && (
              <>
                <View style={[styles.statementRowSub, { marginTop: 10 }]}>
                  <Text style={styles.statementLabel}>Saldo Bawaan dari Musim Sebelumnya</Text>
                  <Text style={[styles.statementVal, { color: (laporan?.saldo_kumulatif_sebelumnya || 0) >= 0 ? colors.primary : colors.danger }]}>
                    {(laporan?.saldo_kumulatif_sebelumnya || 0) < 0 ? `-Rp ${Math.abs(Math.round(laporan?.saldo_kumulatif_sebelumnya || 0)).toLocaleString('id-ID')}` : `Rp ${Math.round(laporan?.saldo_kumulatif_sebelumnya || 0).toLocaleString('id-ID')}`}
                  </Text>
                </View>
                <View style={styles.statementDoubleDivider} />
                <View style={styles.statementRowNet}>
                  <Text style={styles.statementNetTitle}>TOTAL UNTUNG / RUGI (GABUNGAN MUSIM)</Text>
                  <Text style={[styles.statementNetVal, { color: (projectedNetIncome + (laporan?.saldo_kumulatif_sebelumnya || 0)) >= 0 ? colors.primary : colors.danger }]}>
                    {(projectedNetIncome + (laporan?.saldo_kumulatif_sebelumnya || 0)) < 0 ? `-Rp ${Math.abs(Math.round(projectedNetIncome + (laporan?.saldo_kumulatif_sebelumnya || 0))).toLocaleString('id-ID')}` : `Rp ${Math.round(projectedNetIncome + (laporan?.saldo_kumulatif_sebelumnya || 0)).toLocaleString('id-ID')}`}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Narrative Autogenerated Analysis */}
          <View style={styles.narrativeCard}>
            <Text style={styles.narrativeTitle}>📊 Analisis Buku Keuangan</Text>
            <Text style={styles.narrativeText}>{getNarrativeSummary()}</Text>
          </View>

          {/* Export PDF Button */}
          <TouchableOpacity style={styles.exportPdfBtnLarge} onPress={handleExportPdf}>
            <Text style={styles.exportPdfBtnTextLarge}>📄 Export Laporan PDF Resmi</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* COST MODAL FORM */}
      <Modal visible={isFormVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                <Text style={styles.modalTitle}>{editingBiayaId ? 'Edit Catatan Biaya' : 'Catat Biaya Produksi Baru'}</Text>
                
                {/* Category selection chip group */}
                <Text style={styles.inputLabel}>Pilih Kategori:</Text>
                <View style={styles.chipGroup}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.chipBtn, selectedCategory === cat && styles.activeChipBtn]}
                      onPress={() => setSelectedCategory(cat)}
                    >
                      <Text style={[styles.chipText, selectedCategory === cat && styles.activeChipText]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Deskripsi / Nama Rincian Pengeluaran</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Contoh: Pupuk Urea 50kg, Upah Harian Penyiangan"
                    placeholderTextColor={colors.textMuted}
                    value={deskripsi}
                    onChangeText={setDeskripsi}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Jumlah Pengeluaran (Rp)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Contoh: 150.000"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={jumlah}
                    onChangeText={(text) => setJumlah(formatNumberWithDots(text))}
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
                  <TouchableOpacity style={[styles.submitBtn, { flex: 1, marginRight: 10 }]} onPress={handleSaveBiaya} disabled={actionLoading}>
                    <Text style={styles.submitBtnText}>{editingBiayaId ? 'Update' : 'Simpan Transaksi'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelEdit}>
                    <Text style={styles.cancelBtnText}>Batal</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  selectorWrapper: {
    marginBottom: 20,
  },
  cyclesScroll: {
    marginTop: 8,
  },
  cycleBtn: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 8,
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  activeTabItem: {
    backgroundColor: 'rgba(46, 125, 50, 0.08)',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  gridCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 4,
  },
  gridLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 5,
  },
  gridValue: {
    fontSize: 16,
    fontWeight: 'bold',
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
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 15,
    lineHeight: 18,
  },
  allocationRow: {
    marginBottom: 12,
  },
  allocationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  allocationName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  allocationAmount: {
    fontSize: 12,
    color: colors.textMuted,
  },
  progressContainer: {
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  addCostBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  addCostBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.card,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
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
  },
  costDesc: {
    fontSize: 12,
    color: colors.textMuted,
    marginVertical: 2,
  },
  costDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  costActionWrapper: {
    alignItems: 'flex-end',
  },
  costAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
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
    textAlign: 'center',
    marginVertical: 20,
  },
  hppResultContainer: {
    backgroundColor: 'rgba(46, 125, 50, 0.06)',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  hppLargeVal: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  hppFormula: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 8,
  },
  sliderControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  circleStepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepBtnText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  numericValueInput: {
    flex: 1,
    maxWidth: 150,
    height: 48,
    backgroundColor: 'rgba(0,0,0,0.015)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginHorizontal: 15,
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  presetBtn: {
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    margin: 4,
  },
  presetBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  pricePointCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.01)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pricePointTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text,
  },
  pricePointSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  pricePointBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bepGrid: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  bepBox: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.01)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  bepLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 6,
  },
  bepVal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  bepDesc: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },
  safetyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  safetyLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  safetyStatusText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  safetyInstructions: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 10,
    lineHeight: 16,
  },
  saveCalcBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  saveCalcBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.card,
  },
  statementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  statementSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  statementDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 15,
  },
  statementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  statementRowSub: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 12,
    marginBottom: 4,
  },
  statementRowSubBold: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 6,
  },
  statementLabel: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    marginRight: 8,
  },
  statementVal: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'right',
  },
  statementLabelBold: {
    flex: 1,
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
    marginRight: 8,
  },
  statementValBold: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'right',
  },
  statementDoubleDivider: {
    height: 3,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.textMuted,
    marginVertical: 15,
  },
  statementRowNet: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statementNetTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text,
    marginRight: 8,
  },
  statementNetVal: {
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  narrativeCard: {
    backgroundColor: 'rgba(0,0,0,0.015)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  narrativeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  narrativeText: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
  exportPdfBtnLarge: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 30,
  },
  exportPdfBtnTextLarge: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
    marginTop: 6,
  },
  chipBtn: {
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  activeChipBtn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  activeChipText: {
    color: colors.card,
    fontWeight: 'bold',
  },
  formGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.015)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    marginTop: 6,
  },
  btnRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.card,
  },
  cancelBtn: {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  carryOverBannerCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  carryOverBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  carryOverBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  carryOverBannerVal: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 2,
  },
  carryOverBannerDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
});
