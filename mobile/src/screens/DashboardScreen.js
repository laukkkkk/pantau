import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, ScrollView } from 'react';
import { checkBackendHealth } from '../services/api';
import { colors } from '../theme/colors';

export default function DashboardScreen() {
  const [healthStatus, setHealthStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    const result = await checkBackendHealth();
    setHealthStatus(result);
    setLoading(false);
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Premium Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Pantau Demplot</Text>
        <Text style={styles.subtitle}>Selamat datang di dashboard pemantauan pertanian.</Text>
      </View>

      {/* Connection Status Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Status Konektivitas API</Text>
        
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 10 }} />
        ) : (
          <View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Server API Backend:</Text>
              <View style={[styles.badge, healthStatus?.success ? styles.badgeSuccess : styles.badgeDanger]}>
                <Text style={styles.badgeText}>{healthStatus?.success ? 'ONLINE' : 'OFFLINE'}</Text>
              </View>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Database PostgreSQL:</Text>
              <View style={[
                styles.badge,
                healthStatus?.data?.services?.database?.status === 'ONLINE' ? styles.badgeSuccess : styles.badgeDanger
              ]}>
                <Text style={styles.badgeText}>
                  {healthStatus?.data?.services?.database?.status || 'OFFLINE'}
                </Text>
              </View>
            </View>

            {healthStatus?.error && (
              <Text style={styles.errorText}>Error detail: {healthStatus.error}</Text>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.button} onPress={fetchHealth} disabled={loading}>
          <Text style={styles.buttonText}>Perbarui Koneksi</Text>
        </TouchableOpacity>
      </View>

      {/* Info Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Informasi Demplot</Text>
        <Text style={styles.bodyText}>• Lokasi: Demplot Utama Ormawa</Text>
        <Text style={styles.bodyText}>• Status Siklus: Aktif (Uji Coba Pertama)</Text>
        <Text style={styles.bodyText}>• Fitur Pemantauan: Realtime NPK, pH, Kelembaban Tanah</Text>
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
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 15,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeSuccess: {
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
  },
  badgeDanger: {
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primary,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 10,
    fontStyle: 'italic',
  },
  bodyText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 5,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  buttonText: {
    color: colors.card,
    fontSize: 15,
    fontWeight: '600',
  },
});
