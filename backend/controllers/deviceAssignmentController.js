const { DeviceAssignment } = require('../models');

/**
 * Mendapatkan seluruh status penempatan alat (device assignment)
 * GET /api/device-assignment
 */
exports.getDeviceAssignments = async (req, res, next) => {
  try {
    const snapshot = await DeviceAssignment.get();
    let records = [];
    
    snapshot.forEach(doc => {
      records.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Inisialisasi awal (upsert fallback) jika koleksi kosong
    if (records.length === 0) {
      console.log('[DeviceAssignment] Menyiapkan inisialisasi awal SN-1 dan SN-2...');
      const defaultDevices = ['SN-1', 'SN-2'];
      const batch = DeviceAssignment.firestore.batch();
      
      const now = new Date().toISOString();
      for (const devId of defaultDevices) {
        const ref = DeviceAssignment.doc(devId);
        const data = {
          bedeng_id: "",
          updated_at: now
        };
        batch.set(ref, data);
        records.push({
          id: devId,
          ...data
        });
      }
      await batch.commit();
      console.log('[DeviceAssignment] Inisialisasi default berhasil.');
    }

    res.status(200).json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Memperbarui penempatan bedeng aktif untuk device tertentu
 * PUT /api/device-assignment/:deviceId
 */
exports.updateDeviceAssignment = async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const { bedeng_id } = req.body;

    if (bedeng_id === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Parameter bedeng_id wajib dilampirkan.'
      });
    }

    // Validasi format bedeng_id jika diisi
    if (bedeng_id !== "" && bedeng_id !== null) {
      const bNum = parseInt(bedeng_id);
      if (isNaN(bNum) || bNum < 1 || bNum > 16) {
        return res.status(400).json({
          success: false,
          message: 'Nomor bedeng tidak valid (harus berada di rentang 1-16).'
        });
      }
    }

    const docRef = DeviceAssignment.doc(deviceId);
    const updatedData = {
      bedeng_id: bedeng_id !== null ? String(bedeng_id) : "",
      updated_at: new Date().toISOString()
    };

    await docRef.set(updatedData, { merge: true });

    res.status(200).json({
      success: true,
      message: `Device ${deviceId} berhasil ditempatkan ke bedeng ${bedeng_id || 'KOSONG'}.`,
      data: {
        id: deviceId,
        ...updatedData
      }
    });
  } catch (error) {
    next(error);
  }
};
