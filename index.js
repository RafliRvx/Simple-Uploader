const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const shortid = require('shortid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/files', express.static('uploads'));

// Rate limiting
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 uploads per windowMs
  message: { success: false, error: 'Too many upload attempts, please try again later.' }
});

// Ensure directories exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}
if (!fs.existsSync('database.json')) {
  fs.writeFileSync('database.json', '{}');
}

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const fileId = shortid.generate();
    const extension = path.extname(file.originalname);
    const filename = fileId + extension;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = {
    image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/webm', 'video/quicktime'],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
    document: ['application/pdf', 'text/plain', 'application/zip', 'application/x-zip-compressed']
  };

  const isAllowed = Object.values(allowedTypes).flat().includes(file.mimetype);
  
  if (isAllowed) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Helper function to read/write database
function readDatabase() {
  try {
    const data = fs.readFileSync('database.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

function writeDatabase(data) {
  fs.writeFileSync('database.json', JSON.stringify(data, null, 2));
}

// Routes

// Serve uploaded files
app.get('/:fileId', (req, res) => {
  const fileId = req.params.fileId;
  const db = readDatabase();
  
  if (db[fileId]) {
    const filePath = path.join(__dirname, 'uploads', db[fileId].filename);
    res.sendFile(filePath);
  } else {
    res.status(404).json({ success: false, error: 'File not found' });
  }
});

// API Upload endpoint for bots
app.post('/api/upload', uploadLimiter, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const fileId = path.parse(req.file.filename).name;
    const db = readDatabase();
    
    // Store file info in database
    db[fileId] = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadDate: new Date().toISOString(),
      url: `${req.protocol}://${req.get('host')}/${fileId}`
    };
    
    writeDatabase(db);

    res.json({
      success: true,
      url: `${req.protocol}://${req.get('host')}/${fileId}`,
      filename: req.file.originalname,
      size: req.file.size,
      id: fileId
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

// Form upload endpoint
app.post('/upload', uploadLimiter, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const fileId = path.parse(req.file.filename).name;
    const db = readDatabase();
    
    db[fileId] = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadDate: new Date().toISOString(),
      url: `${req.protocol}://${req.get('host')}/${fileId}`
    };
    
    writeDatabase(db);

    res.json({
      success: true,
      url: `${req.protocol}://${req.get('host')}/${fileId}`,
      filename: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

// Get file info
app.get('/api/info/:fileId', (req, res) => {
  const fileId = req.params.fileId;
  const db = readDatabase();
  
  if (db[fileId]) {
    res.json({ success: true, data: db[fileId] });
  } else {
    res.status(404).json({ success: false, error: 'File not found' });
  }
});

// Home route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'File too large' });
    }
  }
  res.status(500).json({ success: false, error: error.message });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
