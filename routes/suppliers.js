const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const { Supplier, Product, Order } = require('../models');
const { sendNotificationToAdmin } = require('../utils/notify');
const adminNotify = require('../services/adminNotify');

// Configure multer for KYC document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/kyc/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDF files are allowed'));
    }
  }
});

/* ============================================================
   GET ALL SUPPLIERS
   GET /api/suppliers
============================================================ */
router.get('/', async (req, res) => {
  try {
    const suppliers = await Supplier.findAll({
      order: [['id', 'DESC']]
    });
    res.json(suppliers);
  } catch (err) {
    console.error("Suppliers fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ============================================================
   SEND OTP FOR SUPPLIER LOGIN
   POST /api/suppliers/send-otp
============================================================ */
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: "Phone number required" });
    }

    const supplier = await Supplier.findOne({ where: { phone } });

    if (!supplier) {
      return res.status(404).json({ error: "Supplier not found" });
    }

    // Check approval status
    if (supplier.status === 'pending') {
      return res.status(403).json({ 
        error: "Your account is pending admin approval",
        status: 'pending'
      });
    }

    if (supplier.status === 'rejected') {
      return res.status(403).json({ 
        error: "Your account has been rejected",
        status: 'rejected',
        reason: supplier.rejectionReason
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await supplier.update({ otp, otpExpiry });

    // TODO: Send OTP via SMS/WhatsApp
    console.log(`OTP for ${phone}: ${otp}`);

    res.json({ success: true, message: "OTP sent to your phone", otp }); // Remove otp in production
  } catch (err) {
    console.error("Send OTP error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ============================================================
   SUPPLIER LOGIN WITH OTP OR PASSWORD
   POST /api/suppliers/login
============================================================ */
router.post('/login', async (req, res) => {
  try {
    const { phone, password, otp } = req.body;

    if (!phone) {
      return res.status(400).json({ error: "Phone number required" });
    }

    const supplier = await Supplier.findOne({ where: { phone } });

    if (!supplier) {
      return res.status(404).json({ error: "Supplier not found" });
    }

    // Check approval status
    if (supplier.status !== 'approved') {
      return res.status(403).json({ 
        error: supplier.status === 'pending' 
          ? "Your account is pending admin approval" 
          : "Your account has been rejected",
        status: supplier.status
      });
    }

    // Verify OTP or password
    if (otp) {
      if (!supplier.otp || !supplier.otpExpiry) {
        return res.status(400).json({ error: "No OTP sent. Request OTP first." });
      }
      if (new Date() > supplier.otpExpiry) {
        return res.status(400).json({ error: "OTP expired. Request new OTP." });
      }
      if (supplier.otp !== otp) {
        return res.status(400).json({ error: "Invalid OTP" });
      }
      // Clear OTP after successful login
      await supplier.update({ otp: null, otpExpiry: null });
    } else if (password) {
      if (!supplier.password) {
        return res.status(400).json({ error: "Password not set. Use OTP login." });
      }
      const isValid = await bcrypt.compare(password, supplier.password);
      if (!isValid) {
        return res.status(400).json({ error: "Invalid password" });
      }
    } else {
      return res.status(400).json({ error: "OTP or password required" });
    }

    // Set session
    req.session.supplierId = supplier.id;

    res.json({ 
      ok: true, 
      supplier: { 
        id: supplier.id, 
        name: supplier.name, 
        phone: supplier.phone, 
        email: supplier.email 
      } 
    });

  } catch (err) {
    console.error("Supplier login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ============================================================
   REGISTER SUPPLIER WITH KYC
   POST /api/suppliers/register
============================================================ */
router.post('/register', upload.fields([
  { name: 'businessLicense', maxCount: 1 },
  { name: 'gstCertificate', maxCount: 1 },
  { name: 'idProof', maxCount: 1 }
]), async (req, res) => {
  try {
    const { 
      name, businessName, email, phone, address, 
      gstNumber, panNumber, bankDetails, acceptedTnC 
    } = req.body;

    if (!name || !phone || !acceptedTnC) {
      return res.status(400).json({ error: 'Name, phone and T&C acceptance required' });
    }

    // Parse bankDetails if it's a string
    let parsedBankDetails = bankDetails;
    if (typeof bankDetails === 'string') {
      try {
        parsedBankDetails = JSON.parse(bankDetails);
      } catch (e) {
        parsedBankDetails = bankDetails;
      }
    }

    // Check if supplier already exists
    const existing = await Supplier.findOne({ where: { phone } });
    if (existing) {
      return res.status(400).json({ error: 'Supplier with this phone already exists' });
    }

    const supplier = await Supplier.create({
      name,
      businessName,
      email,
      phone,
      address,
      gstNumber,
      panNumber,
      businessLicense: req.files?.businessLicense?.[0]?.path,
      gstCertificate: req.files?.gstCertificate?.[0]?.path,
      idProof: req.files?.idProof?.[0]?.path,
      bankDetails: bankDetails ? JSON.parse(bankDetails) : null,
      status: 'pending',
      acceptedTnC
    });

    // Send notification to admin
    try {
      await adminNotify(
        'supplier_registration',
        'New Supplier Registration',
        `${name} (${businessName || 'No business name'}) has registered. Phone: ${phone}. Status: Pending approval.`
      );
    } catch (notifyErr) {
      console.warn("Admin notification failed:", notifyErr);
    }

    // Also try email notification
    try {
      sendNotificationToAdmin(
        `New supplier registered: ${supplier.name} - Pending KYC approval`,
        { supplier }
      );
    } catch (notifyErr) {
      console.warn("Email notification failed:", notifyErr);
    }

    res.json({ 
      ok: true, 
      message: 'Registration successful! Your account is pending admin approval.',
      supplier: {
        id: supplier.id,
        name: supplier.name,
        status: supplier.status
      }
    });

  } catch (err) {
    console.error("Supplier registration error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ============================================================
   ONBOARD SUPPLIER (Simple - for testing)
   POST /api/suppliers
============================================================ */
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, address, acceptedTnC, metadata } = req.body;

    if (!name || !acceptedTnC) {
      return res.status(400).json({ error: 'name and acceptedTnC required' });
    }

    const supplier = await Supplier.create({
      name,
      email,
      phone,
      address,
      acceptedTnC,
      status: 'pending', // Set to pending by default
      metadata
    });

    // Send notification to admin
    try {
      await adminNotify(
        'supplier_onboard',
        'New Supplier Onboarded',
        `${name} has been onboarded. Phone: ${phone}. Status: Pending.`
      );
    } catch (notifyErr) {
      console.warn("Admin notification failed:", notifyErr);
    }

    try {
      sendNotificationToAdmin(
        `New supplier onboarded: ${supplier.name}`,
        { supplier }
      );
    } catch (notifyErr) {
      console.warn("Admin notification failed:", notifyErr);
    }

    res.json(supplier);

  } catch (err) {
    console.error("Supplier onboarding error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ============================================================
   GET SUPPLIER'S PRODUCTS
   GET /api/suppliers/:id/products
============================================================ */
router.get('/:id/products', async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { SupplierId: req.params.id },
      order: [['id', 'DESC']]
    });

    res.json(products);

  } catch (err) {
    console.error("Supplier products error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ============================================================
   GET SUPPLIER'S ORDERS
   GET /api/suppliers/:id/orders
============================================================ */
router.get('/:id/orders', async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { SupplierId: req.params.id },
      include: [Product],
      order: [['id', 'DESC']]
    });

    res.json(orders);

  } catch (err) {
    console.error("Supplier orders error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ============================================================
   ADMIN: APPROVE SUPPLIER
   POST /api/suppliers/:id/approve
============================================================ */
router.post('/:id/approve', async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    supplier.status = 'approved';
    supplier.approvedAt = new Date();
    supplier.approvedBy = req.session?.adminId || 1; // Use session admin ID
    supplier.rejectionReason = null;
    
    await supplier.save();

    res.json({ ok: true, message: 'Supplier approved successfully', supplier });
  } catch (err) {
    console.error("Supplier approval error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ============================================================
   ADMIN: REJECT SUPPLIER
   POST /api/suppliers/:id/reject
============================================================ */
router.post('/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const supplier = await Supplier.findByPk(req.params.id);
    
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    supplier.status = 'rejected';
    supplier.rejectionReason = reason || 'KYC verification failed';
    
    await supplier.save();

    res.json({ ok: true, message: 'Supplier rejected', supplier });
  } catch (err) {
    console.error("Supplier rejection error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ============================================================
   ADMIN: GET PENDING SUPPLIERS
   GET /api/suppliers/pending/all
============================================================ */
router.get('/pending/all', async (req, res) => {
  try {
    const pending = await Supplier.findAll({
      where: { status: 'pending' },
      order: [['createdAt', 'DESC']]
    });
    
    res.json(pending);
  } catch (err) {
    console.error("Pending suppliers error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
