import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { colors } from '../theme/colors';

export default function GisScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Visualisasi GIS Lahan</Text>
        <Text style={styles.subtitle}>Pemetaan batas wilayah dan koordinat demplot.</Text>
      </View>

      {/* Mock Map View */}
      <View style={styles.mapMock}>
        <Text style={styles.mapText}>[ Peta Pemuatan Batas Demplot ]</Text>
        <Text style={styles.mapSubText}>Menunggu Integrasi react-native-maps</Text>
      </View>

      {/* Information card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Detail Koordinat & Luas Lahan</Text>
        
        <View style={styles.row}>
          <Text style={styles.label}>Titik Tengah (Center):</Text>
          <Text style={styles.value}>--</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Luas Kalkulasi (Turf.js):</Text>
          <Text style={styles.value}>-- m²</Text>
        </View>
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
  mapMock: {
    height: 250,
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  mapText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 5,
  },
  mapSubText: {
    color: colors.textMuted,
    fontSize: 12,
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
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    fontSize: 14,
    color: colors.textMuted,
  },
  value: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
});
