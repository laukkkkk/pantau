const { BiayaProduksi, SiklusTanam } = require('../models');
const { Op } = require('sequelize');

/**
 * Mencatat biaya produksi baru
 * POST /api/biaya-produksi
 */
exports.createBiaya = async (req, res, next) => {
  try {
    const { kategori, jumlah, tanggal, siklus_id } = req.body;

    // Validasi data wajib
    if (!kategori || jumlah === undefined || !tanggal || !siklus_id) {
      return res.status(400).json({
        success: false,
        message: 'Kategori, jumlah, tanggal, dan siklus_id wajib diisi.'
      });
    }

    // Validasi keberadaan siklus tanam
    const siklus = await SiklusTanam.findByPk(siklus_id);
    if (!siklus) {
      return res.status(404).json({
        success: false,
        message: `Siklus tanam dengan ID ${siklus_id} tidak ditemukan.`
      });
    }

    const biaya = await BiayaProduksi.create({
      kategori,
      jumlah: parseFloat(jumlah),
      tanggal: new Date(tanggal),
      siklus_id
    });

    res.status(201).json({
      success: true,
      message: 'Biaya produksi berhasil dicatat.',
      data: biaya
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mendapatkan daftar seluruh biaya dengan filter opsional
 * GET /api/biaya-produksi?kategori=...&siklus_id=...&from=...&to=...
 */
exports.getAllBiaya = async (req, res, next) => {
  try {
    const { kategori, from, to, siklus_id } = req.query;
    const where = {};

    if (kategori) {
      where.kategori = kategori;
    }

    if (siklus_id) {
      where.siklus_id = parseInt(siklus_id);
    }

    if (from && to) {
      where.tanggal = {
        [Op.between]: [new Date(from), new Date(to)]
      };
    } else if (from) {
      where.tanggal = {
        [Op.gte]: new Date(from)
      };
    } else if (to) {
      where.tanggal = {
        [Op.lte]: new Date(to)
      };
    }

    const data = await BiayaProduksi.findAll({
      where,
      include: [
        {
          model: SiklusTanam,
          as: 'siklus_tanam',
          attributes: ['id', 'nama', 'status']
        }
      ],
      order: [['tanggal', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Memperbarui data biaya produksi
 * PUT /api/biaya-produksi/:id
 */
exports.updateBiaya = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { kategori, jumlah, tanggal, siklus_id } = req.body;

    const biaya = await BiayaProduksi.findByPk(id);
    if (!biaya) {
      return res.status(404).json({
        success: false,
        message: `Biaya produksi dengan ID ${id} tidak ditemukan.`
      });
    }

    // Jika ingin mengubah siklus tanam, pastikan ID siklus baru ada
    if (siklus_id) {
      const newSiklus = await SiklusTanam.findByPk(siklus_id);
      if (!newSiklus) {
        return res.status(404).json({
          success: false,
          message: `Siklus tanam dengan ID ${siklus_id} tidak ditemukan.`
        });
      }
      biaya.siklus_id = siklus_id;
    }

    if (kategori) biaya.kategori = kategori;
    if (jumlah !== undefined) biaya.jumlah = parseFloat(jumlah);
    if (tanggal) biaya.tanggal = new Date(tanggal);

    await biaya.save();

    res.status(200).json({
      success: true,
      message: 'Biaya produksi berhasil diperbarui.',
      data: biaya
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Menghapus catatan biaya produksi
 * DELETE /api/biaya-produksi/:id
 */
exports.deleteBiaya = async (req, res, next) => {
  try {
    const { id } = req.params;

    const biaya = await BiayaProduksi.findByPk(id);
    if (!biaya) {
      return res.status(404).json({
        success: false,
        message: `Biaya produksi dengan ID ${id} tidak ditemukan.`
      });
    }

    await biaya.destroy();

    res.status(200).json({
      success: true,
      message: 'Biaya produksi berhasil dihapus.'
    });
  } catch (error) {
    next(error);
  }
};
