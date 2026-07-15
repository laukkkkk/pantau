import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { colors } from '../theme/colors';

export default function MonitoringScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Pemantauan Lahan</Text>
        <Text style={styles.subtitle}>Parameter sensor realtime dari demplot pertanian Anda.</Text>
      </View>

      {/* Sensor Grid */}
      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <Text style={styles.sensorName}>Kelembaban Tanah</Text>
          <Text style={[styles.sensorValue, { color: colors.humidityColor }]}>-- %</Text>
          <Text style={styles.sensorStatus}>Optimal</Text>
        </View>

        <View style={styles.gridItem}>
          <Text style={styles.sensorName}>pH Tanah</Text>
          <Text style={[styles.sensorValue, { color: colors.phColor }]}>-- pH</Text>
          <Text style={styles.sensorStatus}>Netral</Text>
        </View>

        <View style={styles.gridItem}>
          <Text style={styles.sensorName}>Suhu Tanah</Text>
          <Text style={[styles.sensorValue, { color: colors.tempColor }]}>-- °C</Text>
          <Text style={styles.sensorStatus}>Normal</Text>
        </View>

        <View style={styles.gridItem}>
          <Text style={styles.sensorName}>Kandungan NPK</Text>
          <Text style={[styles.sensorValue, { color: colors.primaryLight }]}>-- ppm</Text>
          <Text style={styles.sensorStatus}>Cukup</Text>
        </View>
      </View>

      {/* Info Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Status Grafik Histori</Text>
        <Text style={styles.bodyText}>Data grafik realtime sedang menunggu integrasi hardware IoT (NodeMCU/ESP32) dan MQTT broker backend.</Text>
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
    paddingTop: 40,
  },
  header: {
    marginBottom: 25,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  gridItem: {
    width: '47%',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sensorName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 10,
  },
  sensorValue: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  sensorStatus: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  bodyText: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 22,
  },
});
