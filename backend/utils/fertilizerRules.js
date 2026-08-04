/**
 * Menentukan rekomendasi pemupukan dan dosis berdasarkan parameter sensor (pH & Kelembaban)
 * @param {number|string} pH - Derajat keasaman tanah
 * @param {number|string} kelembaban - Kelembaban tanah (%)
 * @returns {object} { rekomendasi: string, dosis: string }
 */
function getFertilizerRecommendation(pH, kelembaban) {
  const parsedPH = parseFloat(pH) || 7.0;
  const parsedKelembaban = parseFloat(kelembaban) || 75.0;

  let rekomendasi = "";
  let dosis = "";

  // 1. pH Rule
  if (parsedPH < 5.5) {
    rekomendasi += "Tanah terlalu asam (pH < 5.5). Taburkan Kapur Dolomit untuk menetralkan pH tanah agar penyerapan pupuk optimal. ";
    dosis += "Dolomit: 1.5 - 2 Ton / Hektar. ";
  } else if (parsedPH > 7.2) {
    rekomendasi += "Tanah terlalu basa (pH > 7.2). Taburkan bubuk belerang (sulfur) atau pupuk Amonium Sulfat (ZA) untuk menurunkan pH. ";
    dosis += "ZA: 200 - 300 kg / Hektar. ";
  } else {
    rekomendasi += "pH tanah terpantau ideal. Berikan Pupuk Organik Cair (POC) atau Kompos untuk memelihara kegemburan tanah. ";
    dosis += "POC: 500 ml/tangki semprot, Kompos: 500 kg/Hektar. ";
  }

  // 2. Kelembaban Rule
  if (parsedKelembaban < 65) {
    rekomendasi += "Kelembaban tanah terpantau kering (< 65%). Segera lakukan penyiraman air secara teratur atau atur debit irigasi.";
  } else if (parsedKelembaban > 85) {
    rekomendasi += "Kelembaban tanah terpantau terlalu basah (> 85%). Kurangi frekuensi penyiraman dan perbaiki drainase bedeng agar akar tidak membusuk.";
  } else {
    rekomendasi += "Tingkat kelembaban tanah optimal (65% - 85%). Lakukan penyiraman berkala sesuai jadwal.";
  }

  return {
    rekomendasi: rekomendasi.trim(),
    dosis: dosis.trim()
  };
}

module.exports = { getFertilizerRecommendation };
