const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const mime = require('mime-types');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const MEDIA_ROOT = process.env.MEDIA_ROOT || './media';
const BUILD_PATH = path.join(__dirname, 'build'); // React build folder

// Middleware
app.use(cors());
app.use(express.json());

// Serve static React build files
app.use(express.static(BUILD_PATH));

// API Routes
app.get('/api/browse/*', async (req, res) => {
  try {
    const requestPath = req.params[0] || '';
    const fullPath = path.join(MEDIA_ROOT, requestPath);

    // Security check - prevent directory traversal
    if (!fullPath.startsWith(path.resolve(MEDIA_ROOT))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const stats = await fs.stat(fullPath);

    if (!stats.isDirectory()) {
      return res.status(400).json({ error: 'Path is not a directory' });
    }

    const items = await fs.readdir(fullPath);
    const itemsWithStats = await Promise.all(
      items.map(async (item) => {
        const itemPath = path.join(fullPath, item);
        const itemStats = await fs.stat(itemPath);
        const relativePath = path.posix.join('/', requestPath, item);

        if (itemStats.isDirectory()) {
          return {
            name: item,
            type: 'folder',
            path: relativePath,
            size: null,
            modified: itemStats.mtime.toISOString().split('T')[0]
          };
        } else {
          const mimeType = mime.lookup(item);
          let fileType = 'file';

          if (mimeType) {
            if (mimeType.startsWith('video/')) fileType = 'video';
            else if (mimeType.startsWith('image/')) fileType = 'image';
            else if (mimeType.startsWith('audio/')) fileType = 'audio';
          }

          const size = formatFileSize(itemStats.size);

          return {
            name: item,
            type: fileType,
            path: relativePath,
            size: size,
            modified: itemStats.mtime.toISOString().split('T')[0]
          };
        }
      })
    );

    // Sort: folders first, then files
    itemsWithStats.sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      return a.name.localeCompare(b.name);
    });

    res.json({
      current_path: requestPath || '/',
      items: itemsWithStats
    });

  } catch (error) {
    console.error('Browse API error:', error);
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Directory not found' });
    } else {
      res.status(500).json({ error: 'Server error' });
    }
  }
});

// Stream media files
app.get('/api/stream/*', (req, res) => {
  const requestPath = req.params[0];
  const fullPath = path.join(MEDIA_ROOT, requestPath);

  // Security check
  if (!fullPath.startsWith(path.resolve(MEDIA_ROOT))) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!fsSync.existsSync(fullPath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const stat = fsSync.statSync(fullPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // Set content type
  const mimeType = mime.lookup(fullPath) || 'application/octet-stream';
  res.set('Content-Type', mimeType);

  if (range) {
    // Handle range requests for video streaming
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;

    const file = fsSync.createReadStream(fullPath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
    };

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    // Send entire file
    const head = {
      'Content-Length': fileSize,
      'Accept-Ranges': 'bytes',
    };

    res.writeHead(200, head);
    fsSync.createReadStream(fullPath).pipe(res);
  }
});

// Download files
app.get('/api/download/*', (req, res) => {
  const requestPath = req.params[0];
  const fullPath = path.join(MEDIA_ROOT, requestPath);

  // Security check
  if (!fullPath.startsWith(path.resolve(MEDIA_ROOT))) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!fsSync.existsSync(fullPath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const filename = path.basename(fullPath);
  res.download(fullPath, filename);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    mediaRoot: MEDIA_ROOT,
    timestamp: new Date().toISOString()
  });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(BUILD_PATH, 'index.html'));
});

// Utility functions
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Media server running on port ${PORT}`);
  console.log(`📁 Media root: ${path.resolve(MEDIA_ROOT)}`);
  console.log(`🌐 Access at: http://localhost:${PORT}`);
  console.log(`📱 API endpoints:`);
  console.log(`   - Browse: http://localhost:${PORT}/api/browse/`);
  console.log(`   - Stream: http://localhost:${PORT}/api/stream/`);
  console.log(`   - Download: http://localhost:${PORT}/api/download/`);
});

module.exports = app;