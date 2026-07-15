import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, Alert, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { getLahanProfile, getLatestSensor } from '../services/api';
import { colors } from '../theme/colors';

// Conditional native import to avoid web webpack build compilation failures
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

export default function GisScreen() {
  const [lahan, setLahan] = useState(null);
  const [latestSensor, setLatestSensor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sensorDetailsVisible, setSensorDetailsVisible] = useState(false);
  const [loadingSensor, setLoadingSensor] = useState(false);

  const loadGisData = async () => {
    setLoading(true);
    const lahanResult = await getLahanProfile();
    if (lahanResult.success) {
      setLahan(lahanResult.data);
    } else {
      Alert.alert('Error', 'Gagal memuat profil GIS lahan dari database.');
    }
    setLoading(false);
  };

  const loadLatestSensorReading = async () => {
    setLoadingSensor(true);
    const sensorResult = await getLatestSensor();
    if (sensorResult.success) {
      setLatestSensor(sensorResult.data);
      setSensorDetailsVisible(true);
    } else {
      Alert.alert('Error', 'Gagal memuat pembacaan sensor terbaru.');
    }
    setLoadingSensor(false);
  };

  useEffect(() => {
    loadGisData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadGisData();
    if (sensorDetailsVisible) {
      await loadLatestSensorReading();
    }
    setRefreshing(false);
  };

  // Convert DB geometry coordinates back to MapView LatLng object coordinates
  const getPolygonLatLngs = () => {
    if (!lahan || !lahan.polygon_batas || !lahan.polygon_batas.coordinates) return [];
    // DB stores coordinates as [ [ [lat1, lng1], [lat2, lng2], ... ] ]
    const ring = lahan.polygon_batas.coordinates[0];
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
    // Default coordinate (Jakarta / Demplot Utama)
    return { latitude: -6.2085, longitude: 106.8460 };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Memuat visualisasi GIS...</Text>
      </View>
    );
  }

  const center = getCenterLatLng();
  const polygonPoints = getPolygonLatLngs();

  // SVG dimensions for Web view rendering
  const width = 300;
  const height = 200;

  // Calculate pixel bounds mapping for SVG polygon rendering
  let svgPoints = "20,180 20,20 280,20 280,180"; // Default box fallback
  if (polygonPoints.length > 0) {
    const lats = polygonPoints.map(p => p.latitude);
    const lngs = polygonPoints.map(p => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latDelta = maxLat - minLat || 0.0001;
    const lngDelta = maxLng - minLng || 0.0001;

    // Project geographic bounds into SVG viewBox coordinates (20px padding)
    svgPoints = polygonPoints.map(p => {
      const x = ((p.longitude - minLng) / lngDelta) * (width - 40) + 20;
      const y = height - (((p.latitude - minLat) / latDelta) * (height - 40) + 20);
      return `${Math.round(x)},${Math.round(y)}`;
    }).join(' ');
  }

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
        <Text style={styles.title}>Visualisasi GIS Lahan</Text>
        <Text style={styles.subtitle}>Pemetaan batas wilayah dan koordinasi titik telemetri demplot.</Text>
      </View>

      {/* Map visualizer container */}
      <View style={styles.mapContainer}>
        {Platform.OS === 'web' || !MapView ? (
          // Web Mode Fallback: Interactive Cartesian SVG Radar
          <View style={styles.svgMapWrapper}>
            <View style={styles.gridOverlay}>
              <Text style={styles.radarLabel}>POLYGON BOUNDARY GRID (WEB SIMULATOR)</Text>
              <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ flex: 1 }}>
                {/* Axis Grid lines */}
                <line x1="0" y1="50" x2="300" y2="50" stroke="rgba(255,255,255,0.08)" strokeDasharray="5,5" />
                <line x1="0" y1="100" x2="300" y2="100" stroke="rgba(255,255,255,0.08)" strokeDasharray="5,5" />
                <line x1="0" y1="150" x2="300" y2="150" stroke="rgba(255,255,255,0.08)" strokeDasharray="5,5" />
                <line x1="75" y1="0" x2="75" y2="200" stroke="rgba(255,255,255,0.08)" strokeDasharray="5,5" />
                <line x1="150" y1="0" x2="150" y2="200" stroke="rgba(255,255,255,0.08)" strokeDasharray="5,5" />
                <line x1="225" y1="0" x2="225" y2="200" stroke="rgba(255,255,255,0.08)" strokeDasharray="5,5" />

                {/* Bounds Polygon */}
                <polygon
                  points={svgPoints}
                  fill="rgba(76, 175, 80, 0.18)"
                  stroke={colors.primary}
                  strokeWidth="3"
                />

                {/* Center marker pin pulse animation style */}
                <circle cx={width/2} cy={height/2} r="10" fill="rgba(244, 67, 54, 0.25)" />
                <circle cx={width/2} cy={height/2} r="5" fill="#f44336" />
              </svg>
            </View>
            <TouchableOpacity style={styles.webMarkerOverlay} onPress={loadLatestSensorReading}>
              <Text style={styles.webMarkerText}>📌 Sensor Demplot (Klik untuk Detail)</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Native Mode: Live react-native-maps implementation
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: center.latitude,
              longitude: center.longitude,
              latitudeDelta: 0.002,
              longitudeDelta: 0.002,
            }}
          >
            {/* Boundaries Polygon */}
            {polygonPoints.length > 0 && (
              <Polygon
                coordinates={polygonPoints}
                strokeColor={colors.primary}
                fillColor="rgba(76, 175, 80, 0.22)"
                strokeWidth={3}
              />
            )}

            {/* Sensor Marker Pin */}
            <Marker
              coordinate={center}
              title="Sensor Demplot"
              description="Klik untuk melihat data telemetry real-time"
              onPress={loadLatestSensorReading}
              pinColor="#f44336"
            />
          </MapView>
        )}
      </View>

      {/* Profile Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Detail Demplot Tani</Text>
        
        <View style={styles.row}>
          <Text style={styles.label}>Nama Lahan:</Text>
          <Text style={styles.value}>{lahan?.nama || 'Demplot Utama'}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Titik Pusat (Center):</Text>
          <Text style={styles.value}>{center.latitude.toFixed(6)}, {center.longitude.toFixed(6)}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Luas Lahan (Kalkulasi Turf):</Text>
          <Text style={[styles.value, { color: colors.primary, fontWeight: 'bold' }]}>
            {lahan?.luas ? `${lahan.luas.toLocaleString('id-ID')} m²` : '-- m²'}
          </Text>
        </View>
      </View>

      {/* Sensor Telemetry Panel Details */}
      {loadingSensor ? (
        <View style={[styles.card, styles.sensorLoader]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.sensorLoaderText}>Membaca data sensor terbaru...</Text>
        </View>
      ) : sensorDetailsVisible && latestSensor ? (
        <View style={styles.sensorDetailsCard}>
          <View style={styles.sensorHeader}>
            <Text style={styles.sensorTitle}>Telemetri IoT Lahan Real-Time</Text>
            <TouchableOpacity onPress={() => setSensorDetailsVisible(false)}>
              <Text style={styles.closeBtn}>Tutup</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sensorTimestamp}>
            Pembaruan: {new Date(latestSensor.timestamp).toLocaleString('id-ID')}
          </Text>

          <View style={styles.gridContainer}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Kelembaban</Text>
              <Text style={styles.gridVal}>{parseFloat(latestSensor.kelembaban).toFixed(1)}%</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>pH Tanah</Text>
              <Text style={styles.gridVal}>{parseFloat(latestSensor.pH).toFixed(1)}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Nitrogen (N)</Text>
              <Text style={styles.gridVal}>{parseFloat(latestSensor.N).toFixed(1)} mg/kg</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Fosfor (P)</Text>
              <Text style={styles.gridVal}>{parseFloat(latestSensor.P).toFixed(1)} mg/kg</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Kalium (K)</Text>
              <Text style={styles.gridVal}>{parseFloat(latestSensor.K).toFixed(1)} mg/kg</Text>
            </View>
          </View>
        </View>
      ) : null}
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
  mapContainer: {
    height: 250,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primaryDark,
  },
  map: {
    flex: 1,
  },
  svgMapWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 10,
  },
  radarLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    marginBottom: 5,
  },
  webMarkerOverlay: {
    position: 'absolute',
    bottom: 12,
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 8,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  webMarkerText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.text,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    fontSize: 13,
    color: colors.textMuted,
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  sensorDetailsCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 30,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sensorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  sensorTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeBtn: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
  },
  sensorTimestamp: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 15,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    backgroundColor: 'rgba(0, 0, 0, 0.015)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gridLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 2,
  },
  gridVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  sensorLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
  },
  sensorLoaderText: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: 10,
  },
});
