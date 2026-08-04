/*************************************
 * LoRa Transmitter - MODE DEPLOYMENT LAPANGAN
 * ESP32 30pin + LoRa Ra-02 (SX1278) + Soil pH + Soil Moisture
 *
 * Skenario: Pengambilan data real di lahan demplot cabai jawa
 * - Daya dari AKI (battery powered), tanpa USB laptop
 * - Ambil data tiap 5 menit sekali
 * - Durasi total sesi: 3 jam (otomatis berhenti setelah itu)
 * - Pakai DEEP SLEEP di antara pembacaan untuk hemat baterai
 *
 * CARA KERJA:
 * Device bangun -> baca sensor -> kirim LoRa -> tidur 5 menit -> ulangi.
 * Setiap "bangun" itu sebenarnya reboot penuh (setup() jalan dari awal
 * lagi), tapi RTC_DATA_ATTR membuat variabel cycleCount tetap "ingat"
 * sudah sampai siklus keberapa, walau device deep sleep berkali-kali.
 *
 * PENTING: cycleCount hanya reset ke 0 kalau power benar-benar
 * dicabut/direset manual (bukan oleh deep sleep). Jadi kalau mau
 * mulai sesi 3 jam yang baru, alat harus di-reset/dicabut-pasang
 * ulang dulu.
 *
 * Wiring LoRa:
 *   SCK -> GPIO18, MISO -> GPIO19, MOSI -> GPIO23
 *   NSS -> GPIO5, RST -> GPIO14, DIO0 -> GPIO26
 * Wiring Sensor:
 *   pH AOUT -> GPIO34, Moisture AOUT -> GPIO35
 *************************************/

#include <SPI.h>
#include <LoRa.h>
#include "esp_sleep.h"

// ---- Pin LoRa ----
#define LORA_SCK  18
#define LORA_MISO 19
#define LORA_MOSI 23
#define LORA_CS   5
#define LORA_RST  14
#define LORA_DIO0 26
#define LORA_FREQ 433E6

// ---- Pin Sensor ----
#define phPin        34
#define MOISTURE_PIN 35

// ---- Identitas fisik alat (serial number, TETAP walau alat dipindah) ----
const char* DEVICE_ID = "SN-1";

// ---- Parameter sesi pengambilan data (ubah di sini kalau perlu) ----
#define READING_INTERVAL_SEC  300UL           // interval baca = 5 menit
#define TOTAL_DURATION_SEC    (3UL*60UL*60UL)  // total durasi sesi = 3 jam
#define TOTAL_CYCLES          (TOTAL_DURATION_SEC / READING_INTERVAL_SEC) // = 36 siklus

// ---- Kalibrasi Moisture (skala 10-bit, 0-1023) ----
// Hasil kalibrasi aktual (lihat catatan kalibrasi tanggal pengujian):
int AIR_VALUE   = 796; // ADC saat sensor kering di udara
int WATER_VALUE = 268; // ADC saat sensor dicelup penuh ke air

// ---- Variabel yang BERTAHAN lintas deep sleep ----
RTC_DATA_ATTR int cycleCount = 0;

float readAnalogAveraged(int pin, int samples) {
  int values[samples];
  for (int i = 0; i < samples; i++) {
    values[i] = analogRead(pin);
    delay(15);
  }
  int maxVal = values[0], minVal = values[0];
  long sum = 0;
  for (int i = 0; i < samples; i++) {
    if (values[i] > maxVal) maxVal = values[i];
    if (values[i] < minVal) minVal = values[i];
    sum += values[i];
  }
  sum -= maxVal;
  sum -= minVal;
  return (float)sum / (samples - 2);
}

void goToSleep(uint32_t seconds) {
  if (seconds > 0) {
    esp_sleep_enable_timer_wakeup((uint64_t)seconds * 1000000ULL);
  }
  // seconds == 0 -> deep sleep TANPA timer = permanen sampai direset manual
  Serial.flush();
  esp_deep_sleep_start();
}

void setup() {
  Serial.begin(115200);
  delay(200);

  cycleCount++;

  Serial.println("===========================================");
  Serial.print("Siklus ke-");
  Serial.print(cycleCount);
  Serial.print(" dari ");
  Serial.println(TOTAL_CYCLES);

  // ---- Sesi 3 jam sudah selesai ----
  if (cycleCount > TOTAL_CYCLES) {
    Serial.println("Sesi 3 jam SELESAI. Alat berhenti permanen.");
    Serial.println("Reset manual alat kalau mau mulai sesi pengambilan data baru.");
    goToSleep(0);
    return;
  }

  analogReadResolution(10);

  // ---- Init LoRa ----
  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_CS);
  LoRa.setPins(LORA_CS, LORA_RST, LORA_DIO0);

  if (!LoRa.begin(LORA_FREQ)) {
    Serial.println("LoRa init GAGAL. Lewati siklus ini, coba lagi di siklus berikutnya.");
    goToSleep(READING_INTERVAL_SEC);
    return;
  }

  // Harus SAMA PERSIS dengan setting di receiver
  LoRa.setSpreadingFactor(10);
  LoRa.setSignalBandwidth(125E3);
  LoRa.setCodingRate4(8);
  LoRa.enableCrc();
  LoRa.setTxPower(20, PA_OUTPUT_PA_BOOST_PIN);

  // ---- Baca sensor (dengan filter noise) ----
  float adcPh = readAnalogAveraged(phPin, 15);
  float ph = (-0.0233 * adcPh) + 12.698;
  ph = constrain(ph, 0.0, 14.0);

  float moistureRaw = readAnalogAveraged(MOISTURE_PIN, 15);
  int moisturePercent = map((int)moistureRaw, AIR_VALUE, WATER_VALUE, 0, 100);
  moisturePercent = constrain(moisturePercent, 0, 100);

  Serial.print("pH: ");
  Serial.print(ph, 1);
  Serial.print(" | Moisture: ");
  Serial.print(moisturePercent);
  Serial.println(" %");

  // ---- Kirim paket LoRa ----
  LoRa.beginPacket();
  LoRa.print("ID:");
  LoRa.print(cycleCount);
  LoRa.print(",PH:");
  LoRa.print(ph, 1);
  LoRa.print(",MOIST:");
  LoRa.print(moisturePercent);
  LoRa.print(",DEV:");
  LoRa.print(DEVICE_ID);
  LoRa.endPacket();

  Serial.println("Paket terkirim.");

  // ---- Matikan radio sebelum tidur, hemat arus ----
  LoRa.sleep();
  SPI.end();

  if (cycleCount >= TOTAL_CYCLES) {
    Serial.println("Ini pembacaan TERAKHIR di sesi ini. Setelah ini alat tidur permanen.");
    goToSleep(0);
  } else {
    Serial.print("Tidur ");
    Serial.print(READING_INTERVAL_SEC);
    Serial.println(" detik sebelum siklus berikutnya...");
    goToSleep(READING_INTERVAL_SEC);
  }
}

void loop() {
  // Tidak dipakai — semua logika di setup() karena device deep sleep tiap siklus
}
