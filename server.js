const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.'));

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const DATA_FILE = path.join(DATA_DIR, 'submissions.json');

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

// Get all submissions
app.get('/api/data', (req, res) => {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            res.json(JSON.parse(data));
        } else {
            res.json([]);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Submit form data
app.post('/api/submit', upload.single('video'), (req, res) => {
    try {
        const formData = req.body;
        formData.timestamp = new Date().toISOString();

        // If file uploaded, add filename
        if (req.file) {
            formData.file = req.file.filename;
        }

        // Load existing data
        let submissions = [];
        if (fs.existsSync(DATA_FILE)) {
            submissions = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }

        submissions.push(formData);
        fs.writeFileSync(DATA_FILE, JSON.stringify(submissions, null, 2));

        res.json({ status: 'success', message: 'Application submitted!' });
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
