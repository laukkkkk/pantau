import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  Platform
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import {
  getDashboardRingkasan,
  createSiklus,
  updateSiklus,
  deleteSiklus,
  getLahanProfile,
  getBedengList,
  getLatestSensor,
  getSensorHistory,
  getDeviceAssignments,
  updateDeviceAssignment
} from '../services/api';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');

// List pilihan baku komoditas / jenis tanaman
const KOMODITAS_OPTIONS = ['Cabai Jawa', 'Padi', 'Jagung', 'Tomat', 'Bawang Merah', 'Lainnya'];

// Data Poligon Tutupan Lahan Desa Pancawati
const LAND_COVERS = [
  {
    id: 'hutan',
    name: 'Hutan / Vegetasi Keras',
    color: '#2e7d32',
    fillColor: 'rgba(46, 125, 50, 0.25)',
    coordinates: [
      { latitude: -6.7160, longitude: 106.8570 },
      { latitude: -6.7100, longitude: 106.8570 },
      { latitude: -6.7100, longitude: 106.8600 },
      { latitude: -6.7160, longitude: 106.8600 },
      { latitude: -6.7160, longitude: 106.8570 }
    ]
  },
  {
    id: 'sawah',
    name: 'Sawah / Pertanian',
    color: '#8bc34a',
    fillColor: 'rgba(139, 195, 74, 0.25)',
    coordinates: [
      { latitude: -6.7150, longitude: 106.8520 },
      { latitude: -6.7110, longitude: 106.8520 },
      { latitude: -6.7110, longitude: 106.8560 },
      { latitude: -6.7150, longitude: 106.8560 },
      { latitude: -6.7150, longitude: 106.8520 }
    ]
  },
  {
    id: 'permukiman',
    name: 'Permukiman / Jalan',
    color: '#ff5252',
    fillColor: 'rgba(244, 67, 54, 0.25)',
    coordinates: [
      { latitude: -6.7100, longitude: 106.8500 },
      { latitude: -6.7080, longitude: 106.8500 },
      { latitude: -6.7080, longitude: 106.8530 },
      { latitude: -6.7100, longitude: 106.8530 },
      { latitude: -6.7100, longitude: 106.8500 }
    ]
  },
  {
    id: 'perairan',
    name: 'Perairan / Sungai',
    color: '#2196f3',
    fillColor: 'rgba(33, 150, 243, 0.25)',
    coordinates: [
      { latitude: -6.7160, longitude: 106.8480 },
      { latitude: -6.7140, longitude: 106.8480 },
      { latitude: -6.7140, longitude: 106.8510 },
      { latitude: -6.7160, longitude: 106.8510 },
      { latitude: -6.7160, longitude: 106.8480 }
    ]
  }
];

// Conditional native import for react-native-maps to prevent web webpack build issues
let MapView, Marker, Polygon;
if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
    Polygon = Maps.Polygon;
  } catch (err) {
    console.warn('Failed to load react-native-maps on native wrapper:', err.message);
  }
}

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);

  // GIS Data States
  const [lahan, setLahan] = useState(null);
  const [bedengs, setBedengs] = useState([]);

  // Bedeng Selection & Monitoring States
  const [selectedBedengId, setSelectedBedengId] = useState(1);
  const [bedengDropdownVisible, setBedengDropdownVisible] = useState(false);
  const [latestSensor, setLatestSensor] = useState(null);
  const [sensorHistory, setSensorHistory] = useState([]);
  const [selectedHistoryParam, setSelectedHistoryParam] = useState('kelembaban');
  const [alerts, setAlerts] = useState([]);

  // Modal Form States for Adding a Cycle
  const [modalVisible, setModalVisible] = useState(false);
  const [newSiklusNama, setNewSiklusNama] = useState('');
  const [selectedKomoditasOption, setSelectedKomoditasOption] = useState('Cabai Jawa');
  const [customKomoditasText, setCustomKomoditasText] = useState('');
  const [newSiklusTanggal, setNewSiklusTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  // Modal States for Finishing a Cycle
  const [finishModalVisible, setFinishModalVisible] = useState(false);
  const [finishingSiklusItem, setFinishingSiklusItem] = useState(null);
  const [hasilPanenInput, setHasilPanenInput] = useState('');
  const [tanggalPanenInput, setTanggalPanenInput] = useState(new Date().toISOString().split('T')[0]);
  const [finishingSubmitting, setFinishingSubmitting] = useState(false);

  // State untuk Kelola Penempatan Alat
  const [devices, setDevices] = useState([]);
  const [updatingDevice, setUpdatingDevice] = useState(null);
  const [assignmentModalVisible, setAssignmentModalVisible] = useState(false);

  // Helper untuk tingkat kesegaran data (data staleness)
  const getStalenessInfo = (timestampString) => {
    if (!timestampString) return { text: 'Belum ada data', color: '#757575', status: 'stale' };
    const dateVal = new Date(timestampString);
    if (isNaN(dateVal.getTime())) {
      return { text: 'Belum ada data', color: '#757575', status: 'stale' };
    }
    
    const diffMs = new Date() - dateVal;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return { text: 'Baru saja', color: '#2e7d32', status: 'fresh' };
    }
    if (diffMins < 60) {
      return { text: `Diperbarui ${diffMins} menit lalu`, color: '#2e7d32', status: 'fresh' };
    }
    if (diffHours < 24) {
      return { text: `Diperbarui ${diffHours} jam lalu`, color: '#f57c00', status: 'medium' };
    }
    return { text: `Diperbarui ${diffDays} hari lalu`, color: '#d32f2f', status: 'stale' };
  };

  // Load all dashboard data in parallel
  const fetchAllData = async (targetBedeng) => {
    const bedengId = targetBedeng || selectedBedengId || 1;
    try {
      const [dashboardResult, lahanResult, bedengResult, latestResult, historyResult, deviceResult] = await Promise.all([
        getDashboardRingkasan(),
        getLahanProfile(),
        getBedengList(),
        getLatestSensor(bedengId),
        getSensorHistory(bedengId),
        getDeviceAssignments()
      ]);

      if (dashboardResult.success && dashboardResult.data) {
        setDashboardData(dashboardResult.data);
      }

      if (lahanResult.success) {
        setLahan(lahanResult.data);
      }

      if (bedengResult.success && bedengResult.data.length > 0) {
        setBedengs(bedengResult.data);
        if (!selectedBedengId && bedengResult.data[0]?.id) {
          setSelectedBedengId(bedengResult.data[0].id);
        }
      }

      if (latestResult.success && latestResult.data) {
        setLatestSensor(latestResult.data);
        checkSensorThresholds(latestResult.data);
      } else {
        setLatestSensor(null);
        setAlerts([]);
      }

      if (historyResult.success && historyResult.data) {
        setSensorHistory(historyResult.data);
      } else {
        setSensorHistory([]);
      }

      if (deviceResult.success && deviceResult.data) {
        setDevices(deviceResult.data);
      }
    } catch (err) {
      console.warn('Dashboard fetchAllData error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAssignmentModal = (device) => {
    setUpdatingDevice(device);
    setAssignmentModalVisible(true);
  };

  const handleSaveDeviceAssignment = async (bedengId) => {
    if (!updatingDevice) return;
    setAssignmentModalVisible(false);
    setLoading(true);
    
    const res = await updateDeviceAssignment(updatingDevice.id, bedengId);
    if (res.success) {
      Alert.alert('Sukses', `Sensor ${updatingDevice.id} berhasil ditugaskan ke bedeng.`);
      await fetchAllData();
    } else {
      Alert.alert('Gagal', res.error || 'Terjadi kesalahan saat memindahkan alat.');
    }
    setLoading(false);
    setUpdatingDevice(null);
  };

  const fetchSensorData = async (bedengId) => {
    try {
      const [latestResult, historyResult] = await Promise.all([
        getLatestSensor(bedengId),
        getSensorHistory(bedengId),
      ]);

      if (latestResult.success && latestResult.data) {
        setLatestSensor(latestResult.data);
        checkSensorThresholds(latestResult.data);
      } else {
        setLatestSensor(null);
        setAlerts([]);
      }

      if (historyResult.success && historyResult.data) {
        setSensorHistory(historyResult.data);
      } else {
        setSensorHistory([]);
      }
    } catch (err) {
      console.warn('Dashboard fetchSensorData error:', err.message);
    }
  };

  const checkSensorThresholds = (data) => {
    const newAlerts = [];
    if (data.kelembaban < 65) {
      newAlerts.push(`Kelembaban tanah terlalu kering (${data.kelembaban}%). Atur debit pengairan.`);
    } else if (data.kelembaban > 85) {
      newAlerts.push(`Kelembaban tanah terlalu basah (${data.kelembaban}%). Kurangi penyiraman.`);
    }

    if (data.pH < 6.0) {
      newAlerts.push(`pH tanah terlalu asam (${data.pH} pH). Disarankan tabur kapur dolomit.`);
    } else if (data.pH > 7.2) {
      newAlerts.push(`pH tanah terlalu basa (${data.pH} pH).`);
    }
    setAlerts(newAlerts);
  };

  const handleInit = async () => {
    setLoading(true);
    await fetchAllData();
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchAllData();
    }, [])
  );

  const handleSelectBedeng = async (bedengId) => {
    setSelectedBedengId(bedengId);
    setBedengDropdownVisible(false);
    await fetchSensorData(bedengId);
  };

  // Handler Tambah Siklus Baru dengan Validasi
  const handleAddSiklusSubmit = async () => {
    const trimmedNama = newSiklusNama.trim();
    if (!trimmedNama || trimmedNama.length < 3) {
      Alert.alert('Validasi Gagal', 'Nama siklus tanam minimal 3 karakter.');
      return;
    }

    const finalKomoditas = selectedKomoditasOption === 'Lainnya' ? customKomoditasText.trim() : selectedKomoditasOption;
    if (!finalKomoditas) {
      Alert.alert('Validasi Gagal', 'Komoditas / jenis tanaman wajib diisi.');
      return;
    }

    if (!newSiklusTanggal.trim()) {
      Alert.alert('Validasi Gagal', 'Tanggal mulai tanam wajib diisi.');
      return;
    }

    setSubmitting(true);
    const result = await createSiklus({
      nama: trimmedNama,
      tanaman: finalKomoditas,
      tanggal_tanam: newSiklusTanggal.trim()
    });
    setSubmitting(false);

    if (result.success) {
      Alert.alert('Sukses', 'Siklus tanam baru berhasil dibuat.');
      setNewSiklusNama('');
      setSelectedKomoditasOption('Cabai Jawa');
      setCustomKomoditasText('');
      setNewSiklusTanggal(new Date().toISOString().split('T')[0]);
      setModalVisible(false);
      fetchAllData();
    } else {
      Alert.alert('Gagal', result.error || 'Terjadi kesalahan sistem.');
    }
  };

  // Handler Buka Modal Tandai Selesai
  const handleOpenFinishModal = (item) => {
    setFinishingSiklusItem(item);
    setHasilPanenInput(item.hasil_panen ? item.hasil_panen.toString() : '');
    setTanggalPanenInput(new Date().toISOString().split('T')[0]);
    setFinishModalVisible(true);
  };

  // Handler Submit Tandai Selesai
  const handleFinishSiklusSubmit = async () => {
    if (!finishingSiklusItem) return;

    if (!hasilPanenInput.trim() || isNaN(parseFloat(hasilPanenInput)) || parseFloat(hasilPanenInput) <= 0) {
      Alert.alert('Validasi Gagal', 'Hasil panen wajib diisi angka positif (kg).');
      return;
    }

    setFinishingSubmitting(true);
    const res = await updateSiklus(finishingSiklusItem.id, {
      status: 'selesai',
      hasil_panen: parseFloat(hasilPanenInput),
      tanggal_panen: tanggalPanenInput.trim()
    });
    setFinishingSubmitting(false);

    if (res.success) {
      Alert.alert('Sukses', `Siklus "${finishingSiklusItem.nama}" berhasil ditandai selesai.`);
      setFinishModalVisible(false);
      setFinishingSiklusItem(null);
      setHasilPanenInput('');
      fetchAllData();
    } else {
      Alert.alert('Gagal', res.error || 'Gagal mengubah status siklus.');
    }
  };

  // Handler Hapus Siklus Tanam
  const handleDeleteSiklusClick = (item) => {
    Alert.alert(
      'Hapus Siklus Tanam',
      `Apakah Anda yakin ingin menghapus siklus "${item.nama}" beserta seluruh data biayanya?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteSiklus(item.id);
            if (res.success) {
              Alert.alert('Sukses', 'Siklus tanam berhasil dihapus.');
              fetchAllData();
            } else {
              Alert.alert('Gagal', res.error || 'Gagal menghapus siklus tanam.');
            }
          }
        }
      ]
    );
  };

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Selamat Pagi 🌅';
    if (hrs < 16) return 'Selamat Siang ☀️';
    if (hrs < 19) return 'Selamat Sore 🌤️';
    return 'Selamat Malam 🌙';
  };

  const formatRupiah = (value) => {
    if (value === undefined || value === null) return 'Rp 0';
    try {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    } catch (e) {
      return 'Rp ' + value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getCurrentMonthName = () => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return months[new Date().getMonth()];
  };

  const getPolygonLatLngs = (polygonBatas) => {
    const target = polygonBatas || (lahan && lahan.polygon_batas);
    if (!target || !target.coordinates) return [];
    const ring = target.coordinates[0];
    return ring.map(pt => ({
      latitude: parseFloat(pt[0]),
      longitude: parseFloat(pt[1])
    }));
  };

  const getCenterLatLng = () => {
    if (lahan && lahan.koordinat_center && lahan.koordinat_center.coordinates) {
      return {
        latitude: parseFloat(lahan.koordinat_center.coordinates[0]),
        longitude: parseFloat(lahan.koordinat_center.coordinates[1])
      };
    }
    // Default coordinate (Desa Pancawati, Caringin, Bogor)
    return { latitude: -6.71275, longitude: 106.853778 };
  };

  const getChartData = () => {
    if (sensorHistory.length === 0) {
      return { labels: ['-'], datasets: [{ data: [0] }] };
    }

    const labels = sensorHistory.map((item, index) => {
      if (index % 6 === 0) {
        const d = new Date(item.timestamp);
        return `${d.getDate()}/${d.getMonth() + 1}`;
      }
      return '';
    });

    const values = sensorHistory.map(item => item[selectedHistoryParam] || 0);

    return {
      labels,
      datasets: [
        {
          data: values,
          color: (opacity = 1) => selectedHistoryParam === 'kelembaban' ? colors.humidityColor : colors.phColor,
          strokeWidth: 3
        }
      ]
    };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Memuat dashboard...</Text>
      </View>
    );
  }

  const siklus = dashboardData?.siklus_aktif;
  const totalSiklus = dashboardData?.total_siklus_aktif || 0;
  const totalBiaya = dashboardData?.total_biaya_bulan_ini || 0;
  const siklusHistory = dashboardData?.siklus_history || [];

  const selectedBedengObj = bedengs.find(b => b.id === selectedBedengId);
  const selectedBedengName = selectedBedengObj?.nama || (selectedBedengObj?.nomor_bedeng ? `Bedeng ${selectedBedengObj.nomor_bedeng}` : `Bedeng ${selectedBedengId}`);
  const centerCoord = getCenterLatLng();
  const polygonCoords = getPolygonLatLngs();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />
      }
    >
      {/* Header Selamat Datang */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.title}>Pantau Demplot</Text>
        </View>
        <TouchableOpacity style={styles.refreshIconBtn} onPress={handleRefresh}>
          <Ionicons name="refresh" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* SECTION 1: PETA GIS DEMPLOT */}
      <Text style={styles.sectionTitle}>Peta Demplot Lahan</Text>
      <View style={styles.mapContainerCard}>
        {Platform.OS !== 'web' && MapView ? (
          <View style={{ flex: 1, position: 'relative' }}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: centerCoord.latitude,
                longitude: centerCoord.longitude,
                latitudeDelta: 0.008,
                longitudeDelta: 0.008,
              }}
            >
              {/* Land Cover Overlays */}
              {LAND_COVERS.map((lc) => (
                <Polygon
                  key={lc.id}
                  coordinates={lc.coordinates}
                  strokeColor="rgba(255,255,255,0.3)"
                  fillColor={lc.fillColor}
                  strokeWidth={1}
                />
              ))}

              {polygonCoords.length > 0 && (
                <Polygon
                  coordinates={polygonCoords}
                  fillColor="rgba(46, 125, 50, 0.25)"
                  strokeColor={colors.primary}
                  strokeWidth={2}
                />
              )}
              <Marker
                coordinate={{ latitude: centerCoord.latitude, longitude: centerCoord.longitude }}
                title={lahan?.nama || "Demplot Lahan"}
                description="Pusat Lokasi Budidaya Cabai Jawa"
                pinColor="cream"
              />
            </MapView>

            {/* Legend Overlay Card */}
            <View style={styles.legendCard}>
              <Text style={styles.legendTitle}>Tutupan Lahan Pancawati</Text>
              {LAND_COVERS.map((lc) => (
                <View key={lc.id} style={styles.legendRow}>
                  <View style={[styles.legendIndicator, { backgroundColor: lc.color }]} />
                  <Text style={styles.legendText}>{lc.name}</Text>
                </View>
              ))}
              <View style={styles.legendRow}>
                <View style={[styles.legendIndicator, { backgroundColor: colors.primary }]} />
                <Text style={styles.legendText}>Demplot (Bedeng 1-16)</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.webMapFallback}>
            <Ionicons name="map-outline" size={32} color={colors.primary} />
            <Text style={styles.webMapTitle}>Peta GIS Demplot ({lahan?.nama || 'Desa Pancawati'})</Text>
            <Text style={styles.webMapSub}>
              Pusat Koordinat: {centerCoord.latitude.toFixed(5)}, {centerCoord.longitude.toFixed(5)}
            </Text>
            <View style={styles.webBedengChipRow}>
              {bedengs.map(b => (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.webBedengChip, selectedBedengId === b.id && styles.activeWebBedengChip]}
                  onPress={() => handleSelectBedeng(b.id)}
                >
                  <Text style={[styles.webBedengChipText, selectedBedengId === b.id && styles.activeWebBedengChipText]}>
                    📍 {b.nama || `Bedeng ${b.nomor_bedeng || b.id}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Legend Overlay for Web Fallback */}
            <View style={styles.legendCard}>
              <Text style={styles.legendTitle}>Tutupan Lahan Pancawati</Text>
              {LAND_COVERS.map((lc) => (
                <View key={lc.id} style={styles.legendRow}>
                  <View style={[styles.legendIndicator, { backgroundColor: lc.color }]} />
                  <Text style={styles.legendText}>{lc.name}</Text>
                </View>
              ))}
              <View style={styles.legendRow}>
                <View style={[styles.legendIndicator, { backgroundColor: colors.primary }]} />
                <Text style={styles.legendText}>Demplot (Bedeng 1-16)</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* SECTION 2: MONITORING SENSOR */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Status Lahan Terkini</Text>
        <TouchableOpacity
          style={styles.dropdownBtn}
          onPress={() => setBedengDropdownVisible(true)}
        >
          <Ionicons name="location-outline" size={16} color={colors.primary} />
          <Text style={styles.dropdownBtnText}>{selectedBedengName}</Text>
          <Ionicons name="chevron-down" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {alerts.length > 0 && alerts.map((alertText, index) => (
        <View key={index} style={styles.alertCard}>
          <Ionicons name="warning-outline" size={20} color={colors.warning} />
          <Text style={styles.alertText}>{alertText}</Text>
        </View>
      ))}

      {latestSensor ? (
        <View style={styles.sensorCard}>
          <View style={styles.sensorHeader}>
            <View style={styles.sensorTitleRow}>
              <Ionicons name="leaf-outline" size={20} color={colors.primary} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.sensorCardTitle}>Pembacaan Sensor {selectedBedengName}</Text>
                {(() => {
                  const staleness = getStalenessInfo(latestSensor.timestamp);
                  return (
                    <View style={[styles.stalenessBadge, { backgroundColor: staleness.color + '12' }]}>
                      <View style={[styles.stalenessDot, { backgroundColor: staleness.color }]} />
                      <Text style={[styles.stalenessText, { color: staleness.color }]}>{staleness.text}</Text>
                    </View>
                  );
                })()}
              </View>
            </View>
            {latestSensor.timestamp && !isNaN(new Date(latestSensor.timestamp).getTime()) && (
              <Text style={styles.sensorTime}>
                {new Date(latestSensor.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>

          <View style={styles.sensorGridTwoCols}>
            <View style={styles.sensorItemLarge}>
              <Ionicons name="water-outline" size={28} color={colors.humidityColor} style={styles.sensorIcon} />
              <Text style={styles.sensorValLarge}>{latestSensor.kelembaban}%</Text>
              <Text style={styles.sensorLabel}>Kelembaban Tanah</Text>
              <Text style={styles.sensorIdealSub}>(Ideal: 65% - 85%)</Text>
            </View>
            <View style={styles.sensorItemLarge}>
              <Ionicons name="flask-outline" size={28} color={colors.phColor} style={styles.sensorIcon} />
              <Text style={styles.sensorValLarge}>{latestSensor.pH}</Text>
              <Text style={styles.sensorLabel}>pH Tanah</Text>
              <Text style={styles.sensorIdealSub}>(Ideal: 6.0 - 7.2)</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.textMuted} />
          <Text style={styles.emptyCardText}>Belum ada data sensor untuk {selectedBedengName}.</Text>
        </View>
      )}

      {/* SECTION 2.5: KELOLA PENEMPATAN ALAT */}
      <Text style={styles.sectionTitle}>Kelola Penempatan Alat</Text>
      <View style={styles.deviceManageCard}>
        {devices.length > 0 ? (
          devices.map((device) => {
            const assignedBedeng = bedengs.find(b => String(b.id) === String(device.bedeng_id));
            const bedengLabel = assignedBedeng ? (assignedBedeng.nama || `Bedeng ${assignedBedeng.nomor_bedeng}`) : 'KOSONG / NONAKTIF';
            const staleness = getStalenessInfo(device.updated_at);
            return (
              <View key={device.id} style={styles.deviceRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="hardware-chip-outline" size={18} color={colors.primary} />
                    <Text style={styles.deviceName}>{device.id}</Text>
                  </View>
                  <Text style={styles.deviceDetail}>
                    Lokasi Lahan: <Text style={{ fontWeight: 'bold', color: assignedBedeng ? colors.primary : colors.textMuted }}>{bedengLabel}</Text>
                  </Text>
                  <Text style={styles.deviceTime}>Terakhir dipindah: {staleness.text}</Text>
                </View>
                <TouchableOpacity
                  style={styles.deviceMoveBtn}
                  onPress={() => handleOpenAssignmentModal(device)}
                >
                  <Ionicons name="swap-horizontal-outline" size={14} color="#fff" />
                  <Text style={styles.deviceMoveBtnText}>Pindahkan</Text>
                </TouchableOpacity>
              </View>
            );
          })
        ) : (
          <ActivityIndicator size="small" color={colors.primary} />
        )}
      </View>

      {/* GRAFIK HISTORI */}
      <View style={styles.card}>
        <View style={styles.chartHeader}>
          <Text style={styles.cardTitle}>Histori Tren Sensor</Text>
          <View style={styles.paramToggleRow}>
            <TouchableOpacity
              style={[styles.paramToggleBtn, selectedHistoryParam === 'kelembaban' && styles.activeParamToggleBtn]}
              onPress={() => setSelectedHistoryParam('kelembaban')}
            >
              <Text style={[styles.paramToggleText, selectedHistoryParam === 'kelembaban' && styles.activeParamToggleText]}>Kelembaban</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.paramToggleBtn, selectedHistoryParam === 'pH' && styles.activeParamToggleBtn]}
              onPress={() => setSelectedHistoryParam('pH')}
            >
              <Text style={[styles.paramToggleText, selectedHistoryParam === 'pH' && styles.activeParamToggleText]}>pH Tanah</Text>
            </TouchableOpacity>
          </View>
        </View>

        {sensorHistory.length > 0 ? (
          <View style={styles.chartWrapper}>
            <LineChart
              data={getChartData()}
              width={width - 48}
              height={190}
              chartConfig={{
                backgroundColor: colors.card,
                backgroundGradientFrom: colors.card,
                backgroundGradientTo: colors.card,
                decimalPlaces: selectedHistoryParam === 'pH' ? 1 : 0,
                color: (opacity = 1) => selectedHistoryParam === 'kelembaban' ? colors.humidityColor : colors.phColor,
                labelColor: (opacity = 1) => colors.textMuted,
                style: { borderRadius: 12 },
                propsForDots: { r: '4', strokeWidth: '2' }
              }}
              bezier
              style={{ borderRadius: 12, marginTop: 10 }}
            />
            <View style={styles.chartNoteContainer}>
              <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
              <Text style={styles.chartNoteText}>
                Catatan: Rentang data mungkin tidak kontinu karena sensor dipindahkan secara periodik antar bedeng.
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.noDataText}>Belum ada data riwayat sensor.</Text>
        )}
      </View>

      {/* SECTION 3: FINANSIAL */}
      <View style={styles.row}>
        <View style={styles.halfCard}>
          <View style={styles.cardHeaderIcon}>
            <Ionicons name="wallet-outline" size={22} color={colors.secondary} />
            <Text style={styles.halfCardTitle}>Biaya Bulan Ini</Text>
          </View>
          <Text style={styles.costValue}>{formatRupiah(totalBiaya)}</Text>
          <Text style={styles.cardDesc}>Pengeluaran {getCurrentMonthName()}</Text>
        </View>
        <View style={styles.halfCard}>
          <View style={styles.cardHeaderIcon}>
            <Ionicons name="rose-outline" size={22} color={colors.primary} />
            <Text style={styles.halfCardTitle}>Siklus Aktif</Text>
          </View>
          <Text style={styles.cycleCount}>{totalSiklus} Siklus</Text>
          <Text style={styles.cardDesc}>Jumlah lahan berjalan</Text>
        </View>
      </View>

      {/* SECTION 4: DETAIL SIKLUS AKTIF UTAMA */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Siklus Aktif Utama</Text>
        <TouchableOpacity style={styles.addSiklusBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.addSiklusBtnText}>+ Tambah Siklus</Text>
        </TouchableOpacity>
      </View>

      {siklus ? (
        <View style={styles.cycleDetailCard}>
          <View style={styles.cycleHeader}>
            <View style={styles.cycleBadge}><Text style={styles.cycleBadgeText}>{siklus.tanaman?.toUpperCase() || 'CABAI JAWA'}</Text></View>
            <View style={styles.activeStatusBadge}>
              <View style={styles.dot} />
              <Text style={styles.activeStatusText}>BERJALAN</Text>
            </View>
          </View>
          <Text style={styles.cycleName}>{siklus.nama}</Text>
          <View style={styles.cycleInfoRow}>
            <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
            <Text style={styles.cycleInfoText}>Mulai: {formatDate(siklus.tanggal_tanam)}</Text>
          </View>

          {/* Action Row: Tandai Selesai & Hapus */}
          <View style={styles.cycleActionRow}>
            <TouchableOpacity style={styles.finishBtn} onPress={() => handleOpenFinishModal(siklus)}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
              <Text style={styles.finishBtnText}>Tandai Selesai</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteCycleBtn} onPress={() => handleDeleteSiklusClick(siklus)}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
              <Text style={styles.deleteCycleBtnText}>Hapus</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons name="leaf-outline" size={32} color={colors.textMuted} />
          <Text style={styles.emptyCardText}>Tidak ada siklus aktif saat ini.</Text>
        </View>
      )}

      {/* SECTION 5: HISTORI SIKLUS TANAM */}
      <Text style={styles.sectionTitle}>Histori Siklus Tanam</Text>
      {siklusHistory.length > 0 ? (
        siklusHistory.map((item) => {
          const isBerjalan = item.status === 'berjalan' || item.status === 'AKTIF';
          return (
            <View key={item.id} style={styles.cycleDetailCard}>
              <View style={styles.cycleHeader}>
                <View style={styles.cycleBadge}>
                  <Text style={styles.cycleBadgeText}>{item.tanaman?.toUpperCase() || 'TANAMAN'}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  !isBerjalan ? styles.statusBadgeSelesai : styles.statusBadgeBerjalan
                ]}>
                  <Text style={[
                    styles.statusBadgeText,
                    !isBerjalan ? styles.textSelesai : styles.textBerjalan
                  ]}>
                    {isBerjalan ? 'BERJALAN' : 'SELESAI'}
                  </Text>
                </View>
              </View>

              <Text style={styles.cycleName}>{item.nama}</Text>

              <View style={styles.cycleInfoRow}>
                <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
                <Text style={styles.cycleInfoText}>
                  {!isBerjalan
                    ? `${formatDate(item.tanggal_tanam)} - ${formatDate(item.tanggal_panen)}`
                    : `Mulai: ${formatDate(item.tanggal_tanam)}`
                  }
                </Text>
              </View>

              {item.hasil_panen && (
                <View style={[styles.cycleInfoRow, { marginTop: 4 }]}>
                  <Ionicons name="cube-outline" size={15} color={colors.primary} />
                  <Text style={[styles.cycleInfoText, { fontWeight: '600', color: colors.text }]}>
                    Hasil Panen: {item.hasil_panen} kg
                  </Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.cycleActionRow}>
                {isBerjalan && (
                  <TouchableOpacity style={styles.finishBtn} onPress={() => handleOpenFinishModal(item)}>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                    <Text style={styles.finishBtnText}>Tandai Selesai</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.deleteCycleBtn} onPress={() => handleDeleteSiklusClick(item)}>
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  <Text style={styles.deleteCycleBtnText}>Hapus</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons name="layers-outline" size={32} color={colors.textMuted} />
          <Text style={styles.emptyCardText}>Belum ada riwayat siklus tanam.</Text>
        </View>
      )}

      {/* MODAL PICKER BEDENG */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={bedengDropdownVisible}
        onRequestClose={() => setBedengDropdownVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setBedengDropdownVisible(false)}>
          <View style={styles.dropdownModalContent}>
            <Text style={styles.modalTitle}>Pilih Bedeng Lahan</Text>
            {bedengs.length > 0 ? (
              bedengs.map(b => (
                <TouchableOpacity key={b.id} style={[styles.dropdownOption, selectedBedengId === b.id && styles.activeDropdownOption]} onPress={() => handleSelectBedeng(b.id)}>
                  <Ionicons name={selectedBedengId === b.id ? "radio-button-on" : "radio-button-off"} size={20} color={selectedBedengId === b.id ? colors.primary : colors.textMuted} />
                  <Text style={[styles.dropdownOptionText, selectedBedengId === b.id && styles.activeDropdownOptionText]}>{b.nama || `Bedeng ${b.nomor_bedeng || b.id}`}</Text>
                </TouchableOpacity>
              ))
            ) : <Text style={styles.emptyCardText}>Tidak ada bedeng ditemukan.</Text>}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL PENEMPATAN DEVICE */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={assignmentModalVisible}
        onRequestClose={() => setAssignmentModalVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAssignmentModalVisible(false)}>
          <View style={styles.dropdownModalContent}>
            <Text style={styles.modalTitle}>Tempatkan Sensor {updatingDevice?.id}</Text>
            <ScrollView style={{ maxHeight: 350 }}>
              {/* Opsi Nonaktifkan */}
              <TouchableOpacity
                style={[styles.dropdownOption, updatingDevice?.bedeng_id === "" && styles.activeDropdownOption]}
                onPress={() => handleSaveDeviceAssignment("")}
              >
                <Ionicons name={updatingDevice?.bedeng_id === "" ? "radio-button-on" : "radio-button-off"} size={20} color={updatingDevice?.bedeng_id === "" ? colors.primary : colors.textMuted} />
                <Text style={[styles.dropdownOptionText, updatingDevice?.bedeng_id === "" && styles.activeDropdownOptionText]}>Nonaktifkan (Tarik dari Lahan)</Text>
              </TouchableOpacity>
              
              {/* Daftar Bedeng */}
              {bedengs.map(b => (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.dropdownOption, String(updatingDevice?.bedeng_id) === String(b.id) && styles.activeDropdownOption]}
                  onPress={() => handleSaveDeviceAssignment(b.id)}
                >
                  <Ionicons name={String(updatingDevice?.bedeng_id) === String(b.id) ? "radio-button-on" : "radio-button-off"} size={20} color={String(updatingDevice?.bedeng_id) === String(b.id) ? colors.primary : colors.textMuted} />
                  <Text style={[styles.dropdownOptionText, String(updatingDevice?.bedeng_id) === String(b.id) && styles.activeDropdownOptionText]}>
                    {b.nama || `Bedeng ${b.nomor_bedeng || b.id}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL TAMBAH SIKLUS BARU */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Mulai Siklus Tanam Baru</Text>

            <View style={styles.formGroup}>
              <Text style={styles.modalInputLabel}>Nama Siklus Tanam (min. 3 karakter)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Contoh: Demplot Cabai Blok A"
                placeholderTextColor={colors.textMuted}
                value={newSiklusNama}
                onChangeText={setNewSiklusNama}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.modalInputLabel}>Pilih Komoditas / Jenis Tanaman Baku:</Text>
              <View style={styles.chipGroup}>
                {KOMODITAS_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.chipBtn, selectedKomoditasOption === opt && styles.activeChipBtn]}
                    onPress={() => setSelectedKomoditasOption(opt)}
                  >
                    <Text style={[styles.chipText, selectedKomoditasOption === opt && styles.activeChipText]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {selectedKomoditasOption === 'Lainnya' && (
                <TextInput
                  style={[styles.modalInput, { marginTop: 8 }]}
                  placeholder="Ketik komoditas kustom..."
                  placeholderTextColor={colors.textMuted}
                  value={customKomoditasText}
                  onChangeText={setCustomKomoditasText}
                />
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.modalInputLabel}>Tanggal Mulai Tanam (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                value={newSiklusTanggal}
                onChangeText={setNewSiklusTanggal}
              />
            </View>

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)} disabled={submitting}>
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleAddSiklusSubmit} disabled={submitting}>
                {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitBtnText}>Simpan</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL TANDAI SIKLUS SELESAI */}
      <Modal animationType="slide" transparent={true} visible={finishModalVisible} onRequestClose={() => setFinishModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tandai Siklus Selesai</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 14 }}>
              Siklus: <Text style={{ fontWeight: 'bold', color: colors.text }}>{finishingSiklusItem?.nama}</Text>
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.modalInputLabel}>Hasil Panen Total (kg):</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                placeholder="Contoh: 1200"
                placeholderTextColor={colors.textMuted}
                value={hasilPanenInput}
                onChangeText={setHasilPanenInput}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.modalInputLabel}>Tanggal Panen / Selesai (YYYY-MM-DD):</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                value={tanggalPanenInput}
                onChangeText={setTanggalPanenInput}
              />
            </View>

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setFinishModalVisible(false)} disabled={finishingSubmitting}>
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleFinishSiklusSubmit} disabled={finishingSubmitting}>
                {finishingSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitBtnText}>Simpan Selesai</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    padding: 16,
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 10,
    color: colors.textMuted,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  refreshIconBtn: {
    padding: 8,
    backgroundColor: colors.card,
    borderRadius: 12,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 14,
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 10,
  },

  // Map Component Styles
  mapContainerCard: {
    height: 180,
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  webMapFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(46, 125, 50, 0.05)',
  },
  webMapTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 6,
  },
  webMapSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 10,
  },
  webBedengChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  webBedengChip: {
    backgroundColor: colors.card,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeWebBedengChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  webBedengChipText: {
    fontSize: 12,
    color: colors.text,
  },
  activeWebBedengChipText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  // Dropdown Button
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: 6,
  },
  dropdownBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },

  // Alerts
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.12)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    gap: 8,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    color: '#e65100',
    fontWeight: '500',
  },

  // Sensor Card (2 Columns: Kelembaban & pH)
  sensorCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  sensorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  sensorTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
  },
  sensorCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  sensorTime: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  sensorGridTwoCols: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  sensorItemLarge: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  sensorIcon: {
    marginBottom: 4,
  },
  sensorValLarge: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginVertical: 2,
  },
  sensorLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  sensorIdealSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },

  // General Card & Chart Styles
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  paramToggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 2,
  },
  paramToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  activeParamToggleBtn: {
    backgroundColor: colors.card,
    elevation: 1,
  },
  paramToggleText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  activeParamToggleText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  chartWrapper: {
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 12,
  },

  // Financial Cards Grid
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  halfCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardHeaderIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  halfCardTitle: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  costValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  cycleCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 11,
    color: colors.textMuted,
  },

  // Cycle List Cards & Action Row
  addSiklusBtn: {
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addSiklusBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
  },
  cycleDetailCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cycleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cycleBadge: {
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cycleBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.primary,
  },
  activeStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 125, 50, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  activeStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeBerjalan: {
    backgroundColor: 'rgba(46, 125, 50, 0.15)',
  },
  statusBadgeSelesai: {
    backgroundColor: 'rgba(158, 158, 158, 0.15)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  textBerjalan: {
    color: colors.primary,
  },
  textSelesai: {
    color: '#616161',
  },
  cycleName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  cycleInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cycleInfoText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  cycleActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  finishBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deleteCycleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  deleteCycleBtnText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyCardText: {
    marginTop: 8,
    fontSize: 13,
    color: colors.textMuted,
  },

  // Chip Selector for Commodities
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 4,
  },
  chipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  activeChipBtn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    color: colors.text,
  },
  activeChipText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  // Modal Overlays
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownModalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    elevation: 5,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  activeDropdownOption: {
    backgroundColor: 'rgba(46, 125, 50, 0.05)',
  },
  dropdownOptionText: {
    fontSize: 14,
    color: colors.text,
  },
  activeDropdownOptionText: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 500,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 14,
  },
  modalInputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.background,
  },
  cancelBtnText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 14,
  },
  submitBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  legendCard: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: 160,
  },
  legendTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  legendIndicator: {
    width: 8,
    height: 8,
    borderRadius: 2,
    marginRight: 5,
  },
  legendText: {
    fontSize: 8,
    fontWeight: '600',
    color: colors.text,
  },
  stalenessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
    gap: 4,
  },
  stalenessDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stalenessText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  chartNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
    gap: 4,
  },
  chartNoteText: {
    fontSize: 10,
    color: colors.textMuted,
    fontStyle: 'italic',
    flex: 1,
  },
  deviceManageCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  deviceDetail: {
    fontSize: 12,
    color: colors.text,
    marginTop: 4,
  },
  deviceTime: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  deviceMoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  deviceMoveBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
