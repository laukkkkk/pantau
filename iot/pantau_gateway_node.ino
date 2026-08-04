/*************************************
 * LoRa Receiver - MODE DEPLOYMENT LAPANGAN + FIRESTORE
 * ESP32 30pin + LoRa Ra-02 (SX1278)
 *
 * Skenario: menerima data dari transmitter di lahan demplot,
 * disimpan LOKAL ke flash internal (LittleFS) sebagai backup,
 * DAN dikirim ke Cloud Firestore lewat REST API (project ID +
 * API key, tanpa library Firebase tambahan) setelah mencocokkan
 * bedeng_id dari device_assignment.
 *
 * SETELAH SESI SELESAI, sambungkan Serial Monitor (115200) lalu:
 *   - ketik 'D' (Enter) -> dump semua data tersimpan ke Serial
 *     (bisa di-copy-paste ke Excel/CSV)
 *   - ketik 'C' (Enter) -> hapus data, reset untuk sesi baru
 *
 * Wiring LoRa (sama dengan transmitter):
 *   SCK -> GPIO18, MISO -> GPIO19, MOSI -> GPIO23
 *   NSS -> GPIO5, RST -> GPIO14, DIO0 -> GPIO26
 *************************************/

#include <SPI.h>
#include <LoRa.h>
#include <LittleFS.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#define LORA_SCK  18
#define LORA_MISO 19
#define LORA_MOSI 23
#define LORA_CS   5
#define LORA_RST  14
#define LORA_DIO0 26
#define LORA_FREQ 433E6   // harus SAMA dengan transmitter

#define LOG_FILE "/data_lahan.csv"

// ---- Ganti sesuai jaringan WiFi/MiFi kalian ----
const char* WIFI_SSID     = "MT TV";
const char* WIFI_PASSWORD = "BagasDea";

// ---- Konfigurasi Firestore (dari aplikasi PANTAU) ----
const char* firebase_project_id = "pantau-apps-hma2026";
const char* firebase_api_key    = "AIzaSyC1suyICZBFLAdLX4BjuUh_0X70pdHq9Iw";
const char* firestore_collection = "sensor_data"; // nama koleksi di Firestore

// Caching untuk Device Assignment (SN-1, SN-2, dst)
struct DeviceCache {
  String deviceId;
  String bedengId;
  unsigned long cacheTimestamp;
};

#define MAX_CACHED_DEVICES 5
DeviceCache deviceCaches[MAX_CACHED_DEVICES];
int deviceCacheCount = 0;

// Durasi Kedaluwarsa Cache (3 Menit = 180000ms)
const unsigned long CACHE_EXPIRY_MS = 180000;

WiFiClientSecure secureClient;
int lastPacketID = -1;

// Prototipe Fungsi
String getBedengIdFromFirestore(String deviceId);
void dumpLog();
bool parsePacket(String data, int &id, float &ph, int &moist, String &deviceId);
void saveToLog(int id, float ph, int moist, int rssi, float snr);
void publishToFirestore(float ph, int moist, String bedengId);

void setup() {
  Serial.begin(115200);
  delay(200);

  Serial.println("LoRa Receiver (Deployment Mode) - Starting...");

  // ---- Init penyimpanan lokal ----
  if (!LittleFS.begin(true)) {
    Serial.println("Gagal mount penyimpanan internal (LittleFS)!");
  } else {
    if (!LittleFS.exists(LOG_FILE)) {
      File f = LittleFS.open(LOG_FILE, "w");
      if (f) {
        f.println("id,ph,moisture,rssi,snr,millis_diterima");
        f.close();
      }
    }
    Serial.println("Data yang sudah tersimpan sebelumnya:");
    dumpLog();
  }

  // ---- Init LoRa ----
  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_CS);
  LoRa.setPins(LORA_CS, LORA_RST, LORA_DIO0);

  if (!LoRa.begin(LORA_FREQ)) {
    Serial.println("LoRa init GAGAL. Cek wiring & modul.");
    while (1) delay(1000);
  }

  // Harus SAMA PERSIS dengan setting di transmitter
  LoRa.setSpreadingFactor(10);
  LoRa.setSignalBandwidth(125E3);
  LoRa.setCodingRate4(8);
  LoRa.enableCrc();

  Serial.println("LoRa init BERHASIL. Menunggu paket...");
  Serial.println("(ketik 'D' lalu Enter untuk dump data, 'C' untuk hapus data)");

  // ---- Connect WiFi ----
  Serial.print("Menghubungkan ke WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long wifiStart = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - wifiStart < 15000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi terhubung, IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi belum terhubung, akan dicoba lagi di background.");
  }

  // Firestore pakai HTTPS; setInsecure() lewati validasi sertifikat
  secureClient.setInsecure();
}

void loop() {
  // ---- Cek paket masuk ----
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    String received = "";
    while (LoRa.available()) {
      received += (char)LoRa.read();
    }
    int rssi = LoRa.packetRssi();
    float snr = LoRa.packetSnr();

    int id; float ph; int moist; String deviceId;
    if (parsePacket(received, id, ph, moist, deviceId)) {
      Serial.print("Diterima ID:");
      Serial.print(id);
      Serial.print(" pH:");
      Serial.print(ph, 1);
      Serial.print(" Moist:");
      Serial.print(moist);
      Serial.print("% Device:");
      Serial.print(deviceId);
      Serial.print(" RSSI:");
      Serial.println(rssi);

      // ---- Deteksi paket yang hilang (gap nomor ID) ----
      if (lastPacketID != -1 && id != lastPacketID + 1) {
        Serial.print("!! PERINGATAN: ada ");
        Serial.print(id - lastPacketID - 1);
        Serial.println(" paket yang hilang/tidak diterima.");
      }
      lastPacketID = id;

      // ---- Dapatkan bedeng_id secara dinamis ----
      String bedengId = getBedengIdFromFirestore(deviceId);

      if (bedengId != "") {
        saveToLog(id, ph, moist, rssi, snr);
        publishToFirestore(ph, moist, bedengId);
      } else {
        Serial.print("[Gateway] [WARN] Device ");
        Serial.print(deviceId);
        Serial.println(" tidak memiliki bedeng aktif. Penyimpanan di Firestore dibatalkan.");
      }
    } else {
      Serial.println("Format paket tidak dikenali / data korup, dilewati.");
    }
  }

  // ---- Perintah manual dari Serial Monitor ----
  if (Serial.available()) {
    char cmd = Serial.read();
    if (cmd == 'D' || cmd == 'd') {
      dumpLog();
    } else if (cmd == 'C' || cmd == 'c') {
      LittleFS.remove(LOG_FILE);
      File f = LittleFS.open(LOG_FILE, "w");
      if (f) {
        f.println("id,ph,moisture,rssi,snr,millis_diterima");
        f.close();
      }
      lastPacketID = -1;
      Serial.println("Log dihapus, siap untuk sesi pengambilan data baru.");
    }
  }
}

bool parsePacket(String data, int &id, float &ph, int &moist, String &deviceId) {
  int idIndex    = data.indexOf("ID:");
  int phIndex    = data.indexOf(",PH:");
  int moistIndex = data.indexOf(",MOIST:");
  int devIndex   = data.indexOf(",DEV:");
  if (idIndex == -1 || phIndex == -1 || moistIndex == -1) return false;

  id = data.substring(idIndex + 3, phIndex).toInt();
  ph = data.substring(phIndex + 4, moistIndex).toFloat();

  if (devIndex != -1) {
    moist    = data.substring(moistIndex + 7, devIndex).toInt();
    deviceId = data.substring(devIndex + 5);
  } else {
    moist    = data.substring(moistIndex + 7).toInt();
    deviceId = "UNKNOWN";
  }
  return true;
}

// Kirim data ke Cloud Firestore lewat REST API (project ID + API key)
void publishToFirestore(float ph, int moist, String bedengId) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi terputus, data TIDAK dikirim ke Firestore (tetap tersimpan lokal).");
    return;
  }

  String url = "https://firestore.googleapis.com/v1/projects/";
  url += firebase_project_id;
  url += "/databases/(default)/documents/";
  url += firestore_collection;
  url += "?key=";
  url += firebase_api_key;

  // Firestore REST butuh format field bertipe: integerValue, doubleValue, stringValue
  String payload = "{\"fields\":{";
  payload += "\"kelembaban\":{\"integerValue\":\"" + String(moist) + "\"},";
  payload += "\"pH\":{\"doubleValue\":" + String(ph, 1) + "},";
  payload += "\"bedeng_id\":{\"stringValue\":\"" + bedengId + "\"}";
  payload += "}}";

  HTTPClient http;
  http.begin(secureClient, url);
  http.addHeader("Content-Type", "application/json");
  int httpCode = http.POST(payload);

  Serial.print("Kirim ke Firestore: ");
  Serial.print(payload);
  Serial.print(" -> HTTP ");
  Serial.println(httpCode);

  if (httpCode != 200) {
    Serial.println("Respons error dari Firestore:");
    Serial.println(http.getString());
  }

  http.end();
}

void saveToLog(int id, float ph, int moist, int rssi, float snr) {
  File f = LittleFS.open(LOG_FILE, "a");
  if (!f) {
    Serial.println("Gagal membuka file log untuk menulis!");
    return;
  }
  f.print(id); f.print(",");
  f.print(ph, 1); f.print(",");
  f.print(moist); f.print(",");
  f.print(rssi); f.print(",");
  f.print(snr, 2); f.print(",");
  f.println(millis());
  f.close();
}

void dumpLog() {
  File f = LittleFS.open(LOG_FILE, "r");
  if (!f) {
    Serial.println("(belum ada data tersimpan)");
    return;
  }
  Serial.println("---- ISI LOG (copy dari sini ke bawah) ----");
  while (f.available()) {
    Serial.write(f.read());
  }
  Serial.println("---- AKHIR LOG ----");
  f.close();
}

// Fungsi untuk mendapatkan bedeng_id berdasarkan device_id dari cache atau Firestore REST API
String getBedengIdFromFirestore(String deviceId) {
  // 1. Periksa Cache terlebih dahulu
  for (int i = 0; i < deviceCacheCount; i++) {
    if (deviceCaches[i].deviceId == deviceId) {
      if (millis() - deviceCaches[i].cacheTimestamp < CACHE_EXPIRY_MS) {
        Serial.print("[Cache] HIT untuk device: ");
        Serial.print(deviceId);
        Serial.print(" -> bedeng_id: ");
        Serial.println(deviceCaches[i].bedengId);
        return deviceCaches[i].bedengId;
      } else {
        Serial.print("[Cache] EXPIRED untuk device: ");
        Serial.println(deviceId);
      }
    }
  }

  // 2. Jika tidak ada di cache / expired, hubungi Firestore REST API via GET
  Serial.print("[Firestore] Mengambil assignment untuk device: ");
  Serial.println(deviceId);

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[Firestore] [WARN] Tidak ada Wi-Fi. Gagal mengambil assignment.");
    return "";
  }

  HTTPClient http;
  String url = "https://firestore.googleapis.com/v1/projects/" + String(firebase_project_id) + 
               "/databases/(default)/documents/device_assignment/" + deviceId + "?key=" + String(firebase_api_key);

  http.begin(secureClient, url);
  int httpCode = http.GET();

  String bedengId = "";

  if (httpCode == HTTP_CODE_OK) {
    String response = http.getString();
    
    // Parsing dokumen Firestore REST response
    StaticJsonDocument<512> responseDoc;
    DeserializationError jsonErr = deserializeJson(responseDoc, response);
    
    if (!jsonErr) {
      bedengId = responseDoc["fields"]["bedeng_id"]["stringValue"] | "";
      Serial.print("[Firestore] [SUCCESS] Menerima assignment bedeng_id: ");
      Serial.println(bedengId);

      // Simpan/Perbarui dalam Cache
      bool foundInCache = false;
      for (int i = 0; i < deviceCacheCount; i++) {
        if (deviceCaches[i].deviceId == deviceId) {
          deviceCaches[i].bedengId = bedengId;
          deviceCaches[i].cacheTimestamp = millis();
          foundInCache = true;
          break;
        }
      }
      
      if (!foundInCache && deviceCacheCount < MAX_CACHED_DEVICES) {
        deviceCaches[deviceCacheCount].deviceId = deviceId;
        deviceCaches[deviceCacheCount].bedengId = bedengId;
        deviceCaches[deviceCacheCount].cacheTimestamp = millis();
        deviceCacheCount++;
      }
    } else {
      Serial.print("[JSON] [ERROR] Gagal parse response device_assignment: ");
      Serial.println(jsonErr.c_str());
    }
  } else {
    Serial.print("[Firestore] [ERROR] Gagal mengambil device_assignment. HTTP Code: ");
    Serial.println(httpCode);
    if (httpCode == 404) {
      Serial.println("[Firestore] Dokumen device tidak ditemukan. Pastikan device ter-register di database.");
    }
  }
  
  http.end();
  return bedengId;
}
