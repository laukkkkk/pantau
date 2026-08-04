import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity, RefreshControl } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { getLatestSensor, getSensorHistory } from '../services/api';
import { colors } from '../theme/colors';

export default function MonitoringScreen() {
  const [latestData, setLatestData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [selectedParam, setSelectedParam] = useState('kelembaban');
  const [selectedBedeng, setSelectedBedeng] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState([]);

  const fetchData = async (bedengId) => {
    if (!latestData) {
      setLoading(true);
    }
    try {
      const [latestResult, historyResult] = await Promise.all([
        getLatestSensor(bedengId),
        getSensorHistory(bedengId)
      ]);

      if (latestResult.success && latestResult.data) {
        setLatestData(latestResult.data);
        checkThresholds(latestResult.data);
      } else {
        setLatestData(null);
        setAlerts([]);
      }
      if (historyResult.success && historyResult.data) {
        setHistoryData(historyResult.data);
      } else {
        setHistoryData([]);
      }
    } catch (err) {
      console.warn('Monitoring fetchData error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const [latestResult, historyResult] = await Promise.all([
        getLatestSensor(selectedBedeng),
        getSensorHistory(selectedBedeng)
      ]);

      if (latestResult.success && latestResult.data) {
        setLatestData(latestResult.data);
        checkThresholds(latestResult.data);
      } else {
        setLatestData(null);
        setAlerts([]);
      }
      if (historyResult.success && historyResult.data) {
        setHistoryData(historyResult.data);
      } else {
        setHistoryData([]);
      }
    } catch (err) {
      console.warn('Monitoring onRefresh error:', err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const checkThresholds = (data) => {
    const listAlerts = [];
    
    // Kelembaban Threshold (Ideal: 65% - 85%)
    if (data.kelembaban < 65) {
      listAlerts.push(`Kelembaban tanah terlalu kering (${data.kelembaban}%). Atur debit pengairan.`);
    } else if (data.kelembaban > 85) {
      listAlerts.push(`Kelembaban tanah terlalu basah (${data.kelembaban}%). Kurangi penyiraman.`);
    }

    // pH Threshold (Ideal: 6.0 - 7.2)
    if (data.pH < 6.0) {
      listAlerts.push(`pH tanah terlalu asam (${data.pH} pH). Disarankan tabur kapur dolomit.`);
    } else if (data.pH > 7.2) {
      listAlerts.push(`pH tanah terlalu basa (${data.pH} pH).`);
    }

    setAlerts(listAlerts);
  };

  useEffect(() => {
    fetchData(selectedBedeng);
  }, [selectedBedeng]);

  const getParamLabel = (param) => {
    switch (param) {
      case 'kelembaban': return 'Kelembaban';
      case 'pH': return 'pH Tanah';
      default: return '';
    }
  };

  const getParamUnit = (param) => {
    switch (param) {
      case 'kelembaban': return '%';
      case 'pH': return 'pH';
      default: return '';
    }
  };

  const getParamColor = (param) => {
    switch (param) {
      case 'kelembaban': return colors.humidityColor;
      case 'pH': return colors.phColor;
      default: return colors.primaryLight;
    }
  };

  // Format Chart Data
  const getChartData = () => {
    if (historyData.length === 0) {
      return { labels: [], datasets: [{ data: [0] }] };
    }

    // Filter labels to prevent overcrowding (show every 6th day label)
    const labels = historyData.map((item, index) => {
      if (index % 6 === 0) {
        const d = new Date(item.timestamp);
        return `${d.getDate()}/${d.getMonth() + 1}`;
      }
      return '';
    });

    const values = historyData.map(item => item[selectedParam]);

    return {
      labels,
      datasets: [
        {
          data: values,
          color: (opacity = 1) => getParamColor(selectedParam),
          strokeWidth: 3
        }
      ]
    };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Memuat data sensor...</Text>
      </View>
    );
  }

  const chartData = getChartData();
  const screenWidth = Dimensions.get('window').width;

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      {/* Title */}
      <View style={styles.header}>
        <Text style={styles.title}>Pemantauan Lahan</Text>
        <Text style={styles.subtitle}>Parameter sensor realtime & histori demplot tani.</Text>
      </View>

      {/* Bedeng Selector Horizontal Capsules */}
      <Text style={styles.sectionTitle}>Pilih Bedeng Demplot</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.bedengSelectorScroll}
        contentContainerStyle={styles.bedengSelectorContent}
      >
        {Array.from({ length: 16 }, (_, i) => i + 1).map((num) => (
          <TouchableOpacity
            key={num}
            style={[styles.bedengCapsule, selectedBedeng === num && styles.activeBedengCapsule]}
            onPress={() => setSelectedBedeng(num)}
          >
            <Text style={[styles.bedengCapsuleText, selectedBedeng === num && styles.activeBedengCapsuleText]}>
              Bedeng {num}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Threshold Alert Banner */}
      {alerts.length > 0 && (
        <View style={styles.alertCard}>
          <Text style={styles.alertCardTitle}>⚠️ PERINGATAN KONDISI LAHAN</Text>
          {alerts.map((alertText, index) => (
            <Text key={index} style={styles.alertItem}>• {alertText}</Text>
          ))}
        </View>
      )}

      {/* Realtime Sensor Cards Grid */}
      <Text style={styles.sectionTitle}>Status Sensor Terkini</Text>
      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <Text style={styles.sensorName}>Kelembaban</Text>
          <Text style={[styles.sensorValue, { color: colors.humidityColor }]}>
            {latestData ? `${latestData.kelembaban}%` : '--'}
          </Text>
          <Text style={styles.sensorStatus}>
            {latestData?.kelembaban >= 65 && latestData?.kelembaban <= 85 ? 'Optimal' : 'Kritis'}
          </Text>
        </View>

        <View style={styles.gridItem}>
          <Text style={styles.sensorName}>pH Tanah</Text>
          <Text style={[styles.sensorValue, { color: colors.phColor }]}>
            {latestData ? `${latestData.pH}` : '--'}
          </Text>
          <Text style={styles.sensorStatus}>
            {latestData?.pH >= 6.0 && latestData?.pH <= 7.2 ? 'Netral' : 'Kritis'}
          </Text>
        </View>
      </View>

      {/* Interactive Chart Section */}
      <Text style={styles.sectionTitle}>Grafik Histori (30 Hari)</Text>
      
      {/* Parameter Filter Tabs */}
      <View style={styles.tabsContainer}>
        {['kelembaban', 'pH'].map((param) => (
          <TouchableOpacity
            key={param}
            style={[styles.tab, selectedParam === param && styles.activeTab]}
            onPress={() => setSelectedParam(param)}
          >
            <Text style={[styles.tabText, selectedParam === param && styles.activeTabText]}>
              {param.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chart Wrapper */}
      <View style={styles.chartWrapper}>
        <Text style={styles.chartTitle}>Tren {getParamLabel(selectedParam)}</Text>
        {historyData.length > 0 ? (
          <LineChart
            data={chartData}
            width={screenWidth - 40}
            height={220}
            chartConfig={{
              backgroundColor: colors.card,
              backgroundGradientFrom: colors.card,
              backgroundGradientTo: colors.card,
              decimalPlaces: selectedParam === 'pH' ? 2 : 1,
              color: (opacity = 1) => getParamColor(selectedParam),
              labelColor: (opacity = 1) => colors.textMuted,
              style: { borderRadius: 16 },
              propsForDots: {
                r: '4',
                strokeWidth: '2',
                stroke: getParamColor(selectedParam)
              }
            }}
            bezier
            style={styles.chart}
          />
        ) : (
          <Text style={styles.noDataText}>Data grafik kosong.</Text>
        )}
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
    marginBottom: 25,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 15,
    marginTop: 10,
  },
  alertCard: {
    backgroundColor: 'rgba(211, 47, 47, 0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(211, 47, 47, 0.2)',
    marginBottom: 20,
  },
  alertCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.danger,
    marginBottom: 8,
  },
  alertItem: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
    marginBottom: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  gridItem: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  sensorName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 8,
  },
  sensorValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sensorStatus: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: colors.card,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  activeTabText: {
    color: colors.primary,
  },
  chartWrapper: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 15,
    alignSelf: 'flex-start',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noDataText: {
    fontSize: 14,
    color: colors.textMuted,
    marginVertical: 20,
  },
  bedengSelectorScroll: {
    marginBottom: 20,
    marginTop: 5,
  },
  bedengSelectorContent: {
    paddingRight: 20,
  },
  bedengCapsule: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeBedengCapsule: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  bedengCapsuleText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  activeBedengCapsuleText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
