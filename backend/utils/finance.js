/**
 * Menghitung HPP, total pendapatan, dan keuntungan proyeksi
 * @param {number|string} totalBiaya - Total biaya produksi
 * @param {number|string} hasilPanen - Total hasil panen (kg)
 * @param {number|string} hargaJualEstimasi - Estimasi harga jual per kg
 * @returns {object} Hasil kalkulasi akuntansi
 */
function calculateHPPAndProfit(totalBiaya, hasilPanen, hargaJualEstimasi) {
  const total_biaya = parseFloat(totalBiaya) || 0;
  const hasil_panen = parseFloat(hasilPanen) || 0;
  const harga_jual = parseFloat(hargaJualEstimasi) || 0;

  // HPP = Total Biaya / Hasil Panen. Hindari pembagian dengan nol.
  let hpp = 0;
  if (hasil_panen > 0) {
    hpp = total_biaya / hasil_panen;
  }

  const total_pendapatan = hasil_panen * harga_jual;
  const keuntungan = total_pendapatan - total_biaya;

  // BEP calculations
  const bep_volume = harga_jual > 0 ? total_biaya / harga_jual : 0;
  const bep_omset = bep_volume * harga_jual;

  // Format ke 2 desimal
  return {
    total_biaya: parseFloat(total_biaya.toFixed(2)),
    hasil_panen: parseFloat(hasil_panen.toFixed(2)),
    hpp: parseFloat(hpp.toFixed(2)),
    total_pendapatan: parseFloat(total_pendapatan.toFixed(2)),
    keuntungan: parseFloat(keuntungan.toFixed(2)),
    bep_volume: parseFloat(bep_volume.toFixed(2)),
    bep_omset: parseFloat(bep_omset.toFixed(2))
  };
}

module.exports = { calculateHPPAndProfit };
