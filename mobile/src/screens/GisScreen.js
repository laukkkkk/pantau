import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, Alert, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { getLahanProfile, getBedengList } from '../services/api';
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

const LAND_COVERS = [
  {
    id: 'hutan',
    name: 'Hutan / Vegetasi Keras',
    color: '#2e7d32',
    fillColor: 'rgba(46, 125, 50, 0.25)',
    coordinates: [
      { latitude: -6.6920, longitude: 106.8470 },
      { latitude: -6.6860, longitude: 106.8470 },
      { latitude: -6.6860, longitude: 106.8500 },
      { latitude: -6.6920, longitude: 106.8500 },
      { latitude: -6.6920, longitude: 106.8470 }
    ]
  },
  {
    id: 'sawah',
    name: 'Sawah / Pertanian',
    color: '#8bc34a',
    fillColor: 'rgba(139, 195, 74, 0.25)',
    coordinates: [
      { latitude: -6.6910, longitude: 106.8420 },
      { latitude: -6.6880, longitude: 106.8420 },
      { latitude: -6.6880, longitude: 106.8460 },
      { latitude: -6.6910, longitude: 106.8460 },
      { latitude: -6.6910, longitude: 106.8420 }
    ]
  },
  {
    id: 'permukiman',
    name: 'Permukiman / Jalan',
    color: '#ff5252',
    fillColor: 'rgba(244, 67, 54, 0.25)',
    coordinates: [
      { latitude: -6.6860, longitude: 106.8400 },
      { latitude: -6.6840, longitude: 106.8400 },
      { latitude: -6.6840, longitude: 106.8430 },
      { latitude: -6.6860, longitude: 106.8430 },
      { latitude: -6.6860, longitude: 106.8400 }
    ]
  },
  {
    id: 'perairan',
    name: 'Perairan / Sungai',
    color: '#2196f3',
    fillColor: 'rgba(33, 150, 243, 0.25)',
    coordinates: [
      { latitude: -6.6920, longitude: 106.8380 },
      { latitude: -6.6900, longitude: 106.8380 },
      { latitude: -6.6900, longitude: 106.8410 },
      { latitude: -6.6920, longitude: 106.8410 },
      { latitude: -6.6920, longitude: 106.8380 }
    ]
  }
];

export default function GisScreen() {
  const [lahan, setLahan] = useState(null);
  const [bedengs, setBedengs] = useState([]);
  const [selectedBedeng, setSelectedBedeng] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sensorDetailsVisible, setSensorDetailsVisible] = useState(false);

  const loadGisData = async () => {
    if (!lahan) {
      setLoading(true);
    }
    try {
      const [lahanResult, bedengResult] = await Promise.all([
        getLahanProfile(),
        getBedengList()
      ]);

      if (lahanResult.success && lahanResult.data) {
        setLahan(lahanResult.data);
      }
      if (bedengResult.success && bedengResult.data) {
        setBedengs(bedengResult.data);
      }
    } catch (err) {
      console.warn('GIS loadGisData error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBedengPress = (bedeng) => {
    setSelectedBedeng(bedeng);
    setSensorDetailsVisible(true);
  };

  useEffect(() => {
    loadGisData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadGisData();
    if (sensorDetailsVisible && selectedBedeng) {
      // Refresh selected bedeng data
      const updated = bedengs.find(b => b.id === selectedBedeng.id);
      if (updated) setSelectedBedeng(updated);
    }
    setRefreshing(false);
  };

  // Convert DB geometry coordinates back to MapView LatLng object coordinates
  const getPolygonLatLngs = (polygonBatas) => {
    const target = polygonBatas || (lahan && lahan.polygon_batas);
    if (!target || !target.coordinates) return [];
    // DB stores coordinates as [ [ [lat1, lng1], [lat2, lng2], ... ] ]
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
    return { latitude: -6.6892, longitude: 106.8443 };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Memuat visualisasi GIS...</Text>
      </View>
    );
  }

  const getBedengColor = (latestSensor) => {
    if (!latestSensor) return 'rgba(128, 128, 128, 0.35)'; // Gray - no data
    
    const isHumidityOptimal = latestSensor.kelembaban >= 65 && latestSensor.kelembaban <= 85;
    const isPhOptimal = latestSensor.pH >= 6.0 && latestSensor.pH <= 7.2;

    if (isHumidityOptimal && isPhOptimal) {
      return 'rgba(46, 125, 50, 0.45)'; // Green - optimal
    }
    return 'rgba(198, 40, 40, 0.45)'; // Red - critical
  };

  const center = getCenterLatLng();
  const polygonPoints = getPolygonLatLngs(lahan ? lahan.polygon_batas : null);

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
          // Web Mode Fallback: Interactive Cartesian SVG Grid for 16 Bedengs
          <View style={styles.svgMapWrapper}>
            <View style={styles.gridOverlay}>
              <Text style={styles.radarLabel}>PETA TUTUPAN LAHAN DESA PANCAWATI (SIMULATOR)</Text>
              <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ flex: 1 }}>
                {/* Background Land Covers zones */}
                {/* Permukiman (Top-Left) */}
                <rect x="0" y="0" width="120" height="90" fill="rgba(244, 67, 54, 0.18)" rx="8" />
                <text x="15" y="25" fill="#ff5252" fontSize="7" fontWeight="600">Permukiman</text>

                {/* Perairan (Bottom-Left) */}
                <rect x="0" y="110" width="120" height="90" fill="rgba(33, 150, 243, 0.18)" rx="8" />
                <text x="15" y="130" fill="#2196f3" fontSize="7" fontWeight="600">Perairan</text>

                {/* Hutan (Right) */}
                <rect x="180" y="0" width="120" height="200" fill="rgba(46, 125, 50, 0.18)" rx="8" />
                <text x="200" y="25" fill="#2e7d32" fontSize="7" fontWeight="600">Hutan</text>

                {/* Sawah / Pertanian (Middle) */}
                <rect x="125" y="0" width="50" height="200" fill="rgba(139, 195, 74, 0.15)" rx="8" />
                <text x="130" y="25" fill="#8bc34a" fontSize="7" fontWeight="600">Sawah</text>

                {/* 16 Bedeng cells in 4x4 grid (centered at middle sawah zone) */}
                {Array.from({ length: 4 }).map((_, r) => (
                  Array.from({ length: 4 }).map((_, c) => {
                    const bedengNo = r * 4 + c + 1;
                    const bedeng = bedengs.find(b => b.nomor_bedeng === bedengNo);
                    const color = getBedengColor(bedeng?.latest_sensor);
                    const cellWidth = 10;
                    const cellHeight = 10;
                    const x = 135 + c * 10;
                    const y = 80 + r * 10;

                    return (
                      <g key={bedengNo} style={{ cursor: 'pointer' }} onClick={() => handleBedengPress(bedeng)}>
                        <rect
                          x={x}
                          y={y}
                          width={cellWidth - 1}
                          height={cellHeight - 1}
                          fill={color}
                          stroke="rgba(255,255,255,0.6)"
                          strokeWidth="0.8"
                          rx="1"
                        />
                      </g>
                    );
                  })
                ))}
              </svg>
            </View>
            
            {/* Legend Overlay for Web */}
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
          // Native Mode: Live react-native-maps satellite mode with 16 Bedeng Polygons
          <View style={{ flex: 1, position: 'relative' }}>
            <MapView
              style={styles.map}
              mapType="hybrid"
              initialRegion={{
                latitude: -6.6854, // Desa Pancawati Center
                longitude: 106.8425,
                latitudeDelta: 0.015,
                longitudeDelta: 0.015,
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

              {/* Lahan Outer Boundary Outline */}
              {polygonPoints.length > 0 && (
                <Polygon
                  coordinates={polygonPoints}
                  strokeColor={colors.primary}
                  fillColor="rgba(0,0,0,0)"
                  strokeWidth={4.5}
                />
              )}

              {/* 16 Bedeng Polygons */}
              {bedengs.map((bedeng) => {
                const coords = getPolygonLatLngs(bedeng.polygon_batas);
                const color = getBedengColor(bedeng.latest_sensor);
                return (
                  <Polygon
                    key={bedeng.id}
                    coordinates={coords}
                    strokeColor="rgba(255,255,255,0.6)"
                    fillColor={color}
                    strokeWidth={1.5}
                    tappable={true}
                    onPress={() => handleBedengPress(bedeng)}
                  />
                );
              })}
            </MapView>

            {/* Legend Overlay for Mobile MapView */}
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
      {sensorDetailsVisible && selectedBedeng ? (
        <View style={styles.sensorDetailsCard}>
          <View style={styles.sensorHeader}>
            <Text style={styles.sensorTitle}>Detail Telemetri Bedeng {selectedBedeng.nomor_bedeng}</Text>
            <TouchableOpacity onPress={() => setSensorDetailsVisible(false)}>
              <Text style={styles.closeBtn}>Tutup</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sensorTimestamp}>
            Pembaruan: {selectedBedeng.latest_sensor && selectedBedeng.latest_sensor.timestamp && !isNaN(new Date(selectedBedeng.latest_sensor.timestamp).getTime())
              ? new Date(selectedBedeng.latest_sensor.timestamp).toLocaleString('id-ID')
              : 'Belum ada data'}
          </Text>

          <View style={styles.gridContainer}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Kelembaban</Text>
              <Text style={styles.gridVal}>
                {selectedBedeng.latest_sensor ? `${parseFloat(selectedBedeng.latest_sensor.kelembaban).toFixed(1)}%` : '--'}
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>pH Tanah</Text>
              <Text style={styles.gridVal}>
                {selectedBedeng.latest_sensor ? `${parseFloat(selectedBedeng.latest_sensor.pH).toFixed(1)}` : '--'}
              </Text>
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
});
