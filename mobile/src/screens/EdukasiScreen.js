import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { getModulPdfUrl } from '../services/api';

const { width } = Dimensions.get('window');

const BUDIDAYA_STEPS = [
  {
    title: '1. Syarat Tumbuh',
    icon: 'earth',
    content: 'Cabai jawa tumbuh optimal pada ketinggian 1-600 mdpl dengan suhu udara 25-32°C. Tanah yang ideal adalah tanah lempung berpasir gembur yang kaya bahan organik dengan pH 5.5 - 6.5 dan drainase yang baik.'
  },
  {
    title: '2. Persiapan Lahan',
    icon: 'construct-outline',
    content: 'Bersihkan lahan dari gulma. Gemburkan tanah dengan pembajakan sedalam 30 cm. Buat bedengan lebar 100 cm, tinggi 30 cm, dan buat lubang tanam berukuran 40x40x40 cm. Berikan pupuk kandang matang sebanyak 5-10 kg per lubang sebagai pupuk dasar.'
  },
  {
    title: '3. Penyemaian & Penanaman',
    icon: 'leaf-outline',
    content: 'Perbanyakan tanaman paling praktis menggunakan stek batang (minimal 3-5 buku). Tanam stek di polybag persemaian terlebih dahulu selama 1-2 bulan. Pindahkan bibit sehat ke bedengan dengan jarak tanam ideal 1m x 1m.'
  },
  {
    title: '4. Pemeliharaan & Tiang Panjat',
    icon: 'trending-up-outline',
    content: 'Karena cabai jawa merambat, wajib disediakan tiang panjat (ajir) berupa tiang kayu/bambu setinggi 2 meter di dekat lubang tanam. Lakukan penyiangan gulma berkala, penyiraman pagi/sore hari, serta pemangkasan daun bawah agar sirkulasi udara optimal.'
  },
  {
    title: '5. Pemupukan Susulan',
    icon: 'flask-outline',
    content: 'Berikan pupuk NPK (15-15-15) susulan secara berkala. Pemupukan pertama dilakukan umur 1 bulan setelah tanam (sekitar 10-15 gram per tanaman), diulangi setiap 3-4 bulan sekali dengan dosis ditingkatkan bertahap.'
  },
  {
    title: '6. Pemanenan & Pengeringan',
    icon: 'basket-outline',
    content: 'Buah cabai jawa siap panen saat berwarna merah tua kehitaman (tahap matang penuh). Petik buah beserta gagangnya di pagi hari. Cuci bersih lalu jemur di bawah sinar matahari langsung selama 3-5 hari hingga kadar air di bawah 10% untuk masa simpan lama.'
  }
];

const FAQS = [
  {
    question: 'Berapa frekuensi penyiraman ideal cabai jawa?',
    answer: 'Penyiraman sebaiknya dilakukan 1-2 kali sehari pada pagi dan sore hari ketika fase pertumbuhan awal. Jika tanah sudah cukup lembab (bisa dicek lewat sensor IoT), penyiraman dapat dikurangi untuk mencegah pembusukan akar akibat tanah terlalu basah.'
  },
  {
    question: 'Kapan waktu pemupukan susulan pertama dilakukan?',
    answer: 'Pemupukan susulan pertama dilakukan sekitar 14-30 hari setelah bibit dipindahkan ke lahan terbuka. Gunakan pupuk NPK dengan dosis ringan untuk memacu pertumbuhan vegetatif (daun dan tunas).'
  },
  {
    question: 'Bagaimana cara menangani daun yang keriting?',
    answer: 'Daun keriting umumnya disebabkan serangan hama penghisap seperti kutu kebul atau thrips. Lakukan penyemprotan bio-pestisida (seperti ekstrak daun mimba atau air sabun lerak) secara berkala pada sore hari, atau insektisida kimiawi jika tingkat serangan sudah sangat parah.'
  },
  {
    question: 'Berapa lama umur produktif tanaman cabai jawa?',
    answer: 'Tanaman cabai jawa merupakan tanaman tahunan (perenial) yang dapat hidup dan produktif menghasilkan buah hingga umur 8-10 tahun apabila dipelihara dengan pemupukan dan pengairan yang stabil.'
  }
];

const CONTACTS = [
  {
    name: 'Pak Yus Ketua Poktan Sugih Mukti 1',
    role: 'Ketua Kelompok Tani',
    phone: '+62 858-1325-1299',
    avatarColor: colors.primaryLight
  }
];

export default function EdukasiScreen() {
  const [activeTab, setActiveTab] = useState('panduan'); // 'panduan' | 'faq'
  const [expandedStep, setExpandedStep] = useState(null);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const pdfUrl = getModulPdfUrl();
      await Linking.openURL(pdfUrl);
    } catch (err) {
      console.warn('Gagal mengunduh berkas PDF:', err.message);
      Alert.alert(
        'Gagal Mengunduh E-Modul',
        'Tidak dapat membuka berkas PDF. Pastikan perangkat terhubung ke internet dan backend service aktif.'
      );
    } finally {
      setDownloadingPdf(false);
    }
  };

  const toggleStep = (index) => {
    setExpandedStep(expandedStep === index ? null : index);
  };

  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const handleContactWhatsApp = (phoneNumber, name) => {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const salutation = name.startsWith('Pak') || name.startsWith('Ibu') || name.startsWith('Dr.') ? '' : 'Kak ';
    const message = `Halo ${salutation}${name}, saya ingin berkonsultasi mengenai budidaya tanaman Cabai Jawa di program Pantau Ormawa.`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    Linking.openURL(url).catch((err) => {
      Alert.alert('Gagal Membuka WhatsApp', 'Tidak dapat membuka aplikasi WhatsApp: ' + err.message);
    });
  };

  return (
    <View style={styles.container}>
      {/* Tab Header Selector */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'panduan' && styles.activeTabItem]}
          onPress={() => setActiveTab('panduan')}
        >
          <Ionicons
            name="book"
            size={18}
            color={activeTab === 'panduan' ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.tabText, activeTab === 'panduan' && styles.activeTabText]}>
            Panduan Budidaya
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'faq' && styles.activeTabItem]}
          onPress={() => setActiveTab('faq')}
        >
          <Ionicons
            name="help-circle"
            size={20}
            color={activeTab === 'faq' ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.tabText, activeTab === 'faq' && styles.activeTabText]}>
            FAQ & Bantuan
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'panduan' ? (
          <View>
            <View style={styles.introCard}>
              <Text style={styles.introTitle}>E-Modul Cabai Jawa</Text>
              <Text style={styles.introSubtitle}>
                Panduan praktis budidaya cabai jawa (*Piper retrofractum Vahl*) untuk meningkatkan produktivitas hasil tani demplot.
              </Text>
              <TouchableOpacity
                style={styles.downloadPdfBtn}
                onPress={handleDownloadPdf}
                disabled={downloadingPdf}
              >
                {downloadingPdf ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={16} color="#fff" />
                    <Text style={styles.downloadPdfBtnText}>Unduh E-Modul (PDF)</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Tahapan Budidaya</Text>
            {BUDIDAYA_STEPS.map((step, index) => {
              const isExpanded = expandedStep === index;
              return (
                <View key={index} style={styles.accordionCard}>
                  <TouchableOpacity
                    style={styles.accordionHeader}
                    onPress={() => toggleStep(index)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.headerTitleRow}>
                      <Ionicons name={step.icon} size={22} color={colors.primary} />
                      <Text style={styles.stepTitle}>{step.title}</Text>
                    </View>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.accordionContent}>
                      <View style={styles.divider} />
                      <Text style={styles.stepContentText}>{step.content}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View>
            {/* FAQ List */}
            <Text style={styles.sectionTitle}>Pertanyaan Populer</Text>
            {FAQS.map((faq, index) => {
              const isExpanded = expandedFaq === index;
              return (
                <View key={index} style={styles.accordionCard}>
                  <TouchableOpacity
                    style={styles.accordionHeader}
                    onPress={() => toggleFaq(index)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.faqQuestionText}>{faq.question}</Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.accordionContent}>
                      <View style={styles.divider} />
                      <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                    </View>
                  )}
                </View>
              );
            })}

            {/* Contacts */}
            <Text style={[styles.sectionTitle, { marginTop: 25 }]}>Kontak Pendamping Lapangan</Text>
            <Text style={styles.contactIntroText}>
              Hubungi pendamping program Ormawa atau penyuluh pertanian untuk konsultasi penanganan kendala tanaman.
            </Text>

            {CONTACTS.map((contact, index) => (
              <View key={index} style={styles.contactCard}>
                <View style={styles.contactHeader}>
                  <View style={[styles.avatar, { backgroundColor: contact.avatarColor }]}>
                    <Text style={styles.avatarText}>
                      {contact.name.charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactRole}>{contact.role}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.waButton}
                  onPress={() => handleContactWhatsApp(contact.phone, contact.name)}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="white" />
                  <Text style={styles.waButtonText}>Hubungi via WhatsApp</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTabItem: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginLeft: 8,
  },
  activeTabText: {
    color: colors.primary,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  introCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  introSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  accordionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: 10,
  },
  accordionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  stepContentText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
  faqQuestionText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.text,
    flex: 0.95,
  },
  faqAnswerText: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20,
  },
  contactIntroText: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 16,
  },
  contactCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  contactInfo: {
    marginLeft: 12,
  },
  contactName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  contactRole: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  waButton: {
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  waButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  downloadPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 12,
    gap: 6,
  },
  downloadPdfBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
