import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { colors } from '../theme/colors';

export default function AccountingScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Modul Akunting</Text>
        <Text style={styles.subtitle}>Pembiayaan produksi tani, HPP, dan proyeksi keuangan.</Text>
      </View>

      {/* Main summary card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Total Pengeluaran Siklus Ini</Text>
        <Text style={styles.summaryValue}>Rp --</Text>
        <Text style={styles.summarySub}>Menunggu input data pengeluaran operasional</Text>
      </View>

      {/* Cost breakdowns */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Proyeksi HPP & Hasil Panen</Text>
        
        <View style={styles.row}>
          <Text style={styles.label}>Harga Pokok Produksi (HPP):</Text>
          <Text style={styles.value}>Rp -- / kg</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Estimasi Berat Panen:</Text>
          <Text style={styles.value}>-- kg</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Proyeksi Keuntungan Bersih:</Text>
          <Text style={[styles.value, { color: colors.success, fontWeight: 'bold' }]}>Rp --</Text>
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
  summaryCard: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.card,
    marginVertical: 10,
  },
  summarySub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
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
