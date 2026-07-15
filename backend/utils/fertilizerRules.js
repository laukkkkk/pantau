/**
 * Menentukan rekomendasi pemupukan dan dosis berdasarkan parameter sensor (pH, N, P, K)
 * @param {number|string} pH - Derajat keasaman tanah
 * @param {number|string} N - Kandungan Nitrogen (mg/kg)
 * @param {number|string} P - Kandungan Fosfor (mg/kg)
 * @param {number|string} K - Kandungan Kalium (mg/kg)
 * @returns {object} { rekomendasi: string, dosis: string }
 */
function getFertilizerRecommendation(pH, N, P, K) {
  const parsedPH = parseFloat(pH) || 7.0;
  const parsedN = parseFloat(N) || 60;
  const parsedP = parseFloat(P) || 50;
  const parsedK = parseFloat(K) || 60;

  // Rule 1: Keasaman (pH) Rendah -> Prioritas tertinggi karena pH asam menghambat penyerapan NPK oleh akar
  if (parsedPH < 6.0) {
    return {
      rekomendasi: "Keasaman tanah tinggi (pH < 6.0). Taburkan Kapur Dolomit untuk menetralkan pH tanah agar penyerapan unsur hara NPK oleh tanaman menjadi optimal.",
      dosis: "1.5 - 2 Ton / Hektar"
    };
  }

  // Rule 2: N, P, K Rendah
  const isNLow = parsedN < 50;
  const isPLow = parsedP < 40;
  const isKLow = parsedK < 50;

  if (isNLow && isPLow && isKLow) {
    return {
      rekomendasi: "Kandungan unsur hara makro (N, P, K) terdeteksi sangat rendah. Berikan Pupuk NPK Phonska atau NPK Mutiara 16-16-16 untuk pemulihan menyeluruh unsur hara tanah.",
      dosis: "300 - 400 kg / Hektar"
    };
  }

  if (isNLow) {
    return {
      rekomendasi: "Kandungan Nitrogen (N) tanah rendah. Berikan Pupuk Urea atau ZA untuk merangsang pertumbuhan vegetative daun dan batang.",
      dosis: "150 - 200 kg / Hektar"
    };
  }

  if (isPLow) {
    return {
      rekomendasi: "Kandungan Fosfor (P) tanah rendah. Berikan Pupuk SP-36 atau TSP untuk merangsang perkembangan perakaran dan pembuahan tanaman.",
      dosis: "100 - 150 kg / Hektar"
    };
  }

  if (isKLow) {
    return {
      rekomendasi: "Kandungan Kalium (K) tanah rendah. Berikan Pupuk KCI untuk memperkuat batang tanaman dan meningkatkan ketahanan dari serangan penyakit.",
      dosis: "75 - 100 kg / Hektar"
    };
  }

  // Rule 3: Kondisi Normal / Ideal
  return {
    rekomendasi: "Kondisi keasaman (pH) dan kandungan hara NPK tanah dalam keadaan optimal/normal. Lakukan pemeliharaan rutin menggunakan Pupuk Organik Cair (POC) atau Kompos untuk menjaga kegemburan tanah.",
    dosis: "500 ml / tangki semprot (POC) atau 500 kg / Hektar (Kompos)"
  };
}

module.exports = { getFertilizerRecommendation };
