const express = require('express');
const multer = require('multer');
const path = require('path');
const SecureDatabase = require('./database');
const SecureFileManager = require('./file-manager');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Initialize secure storage
const db = new SecureDatabase();
const fileManager = new SecureFileManager();

// Middleware
app.use(express.json());
app.use(express.static('.', {
    setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
}));

// Initialize storage systems
async function initializeStorage() {
    try {
        await db.init();
        await fileManager.init();
        console.log('Secure storage systems initialized');
    } catch (error) {
        console.error('Error initializing storage:', error);
    }
}

// Get all items
app.get('/api/items', async (req, res) => {
    try {
        const [passwords, notes, documents] = await Promise.all([
            db.getPasswords(),
            db.getSecretNotes(),
            fileManager.getDocuments()
        ]);
        
        const allItems = [...passwords, ...notes, ...documents];
        res.json({ items: allItems });
    } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).json({ error: error.message });
    }
});

// Save item
app.post('/api/items', async (req, res) => {
    try {
        const { id, category, title, content, created, modified } = req.body;
        
        if (category === 'passwords') {
            await db.savePassword(id, title, content, created, modified);
        } else if (category === 'notes') {
            await db.saveSecretNote(id, title, content, created, modified);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving item:', error);
        res.status(500).json({ error: error.message });
    }
});

// Upload document
app.post('/api/documents', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const { id, title } = req.body;
        const document = await fileManager.saveDocument(
            id,
            title,
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype
        );
        
        res.json({ success: true, document });
    } catch (error) {
        console.error('Error uploading document:', error);
        res.status(500).json({ error: error.message });
    }
});

// Download document
app.get('/api/documents/:id', async (req, res) => {
    try {
        const document = await fileManager.getDocument(req.params.id);
        
        res.setHeader('Content-Type', document.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
        res.send(document.buffer);
    } catch (error) {
        console.error('Error downloading document:', error);
        res.status(404).json({ error: 'Document not found' });
    }
});

// Delete item
app.delete('/api/items/:id', async (req, res) => {
    try {
        const { category } = req.query;
        
        if (category === 'passwords') {
            await db.deletePassword(req.params.id);
        } else if (category === 'notes') {
            await db.deleteSecretNote(req.params.id);
        } else if (category === 'documents') {
            await fileManager.deleteDocument(req.params.id);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get network information
app.get('/api/network-info', (req, res) => {
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    let networkIP = null;
    let wifiIP = null;
    let ethernetIP = null;
    
    // Find network interfaces
    for (const interfaceName in networkInterfaces) {
        const addresses = networkInterfaces[interfaceName];
        for (const address of addresses) {
            if (address.family === 'IPv4' && !address.internal) {
                // Prefer WiFi interfaces
                if (interfaceName.toLowerCase().includes('wi-fi') || 
                    interfaceName.toLowerCase().includes('wireless') ||
                    interfaceName.toLowerCase().includes('wlan')) {
                    wifiIP = address.address;
                } else if (interfaceName.toLowerCase().includes('ethernet') ||
                          interfaceName.toLowerCase().includes('local')) {
                    ethernetIP = address.address;
                } else {
                    networkIP = address.address;
                }
            }
        }
    }
    
    // Prefer WiFi, then Ethernet, then any other
    const finalIP = wifiIP || ethernetIP || networkIP;
    
    res.json({ 
        networkIP: finalIP,
        interfaces: {
            wifi: wifiIP,
            ethernet: ethernetIP,
            other: networkIP
        }
    });
});

// Track device connections
const connectedDevices = new Map();

app.post('/api/device-connect', (req, res) => {
    const deviceInfo = req.body;
    const deviceId = req.ip + '_' + Date.now();
    
    // Determine device type and name with enhanced mobile detection
    let deviceType = deviceInfo.type || 'desktop';
    let deviceName = 'Unknown Device';
    let deviceDetails = '';
    
    if (deviceInfo.userAgent) {
        const ua = deviceInfo.userAgent;
        
        if (deviceInfo.isMobile || /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
            deviceType = 'mobile';
            
            if (/iPhone/i.test(ua)) {
                deviceName = 'iPhone';
                deviceDetails = 'iOS Mobile Device';
            } else if (/iPad/i.test(ua)) {
                deviceName = 'iPad';
                deviceDetails = 'iOS Tablet Device';
            } else if (/Android/i.test(ua)) {
                if (/Mobile/i.test(ua)) {
                    deviceName = 'Android Phone';
                    deviceDetails = 'Android Mobile Device';
                } else {
                    deviceName = 'Android Tablet';
                    deviceDetails = 'Android Tablet Device';
                }
            } else if (/BlackBerry/i.test(ua)) {
                deviceName = 'BlackBerry';
                deviceDetails = 'BlackBerry Mobile Device';
            } else {
                deviceName = 'Mobile Device';
                deviceDetails = 'Unknown Mobile Device';
            }
            
            // Add screen info if available
            if (deviceInfo.screenInfo) {
                deviceDetails += ` (${deviceInfo.screenInfo.width}x${deviceInfo.screenInfo.height})`;
            }
        } else {
            deviceType = 'desktop';
            if (/Windows/i.test(ua)) {
                deviceName = 'Windows PC';
                deviceDetails = 'Windows Desktop';
            } else if (/Mac/i.test(ua)) {
                deviceName = 'Mac';
                deviceDetails = 'macOS Desktop';
            } else if (/Linux/i.test(ua)) {
                deviceName = 'Linux PC';
                deviceDetails = 'Linux Desktop';
            } else {
                deviceName = 'Desktop Computer';
                deviceDetails = 'Unknown Desktop OS';
            }
        }
    }
    
    // Override details if not set
    if (!deviceDetails) {
        deviceDetails = `${deviceName} - Connected via ${deviceType === 'mobile' ? 'Mobile' : 'Desktop'} Browser`;
    }
    
    const device = {
        id: deviceId,
        name: deviceName,
        type: deviceType,
        details: deviceDetails,
        ip: req.ip,
        userAgent: deviceInfo.userAgent,
        connectedAt: deviceInfo.timestamp,
        lastSeen: new Date().toISOString(),
        online: true
    };
    
    connectedDevices.set(deviceId, device);
    
    // Clean up old devices (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [id, dev] of connectedDevices.entries()) {
        if (new Date(dev.lastSeen) < oneHourAgo) {
            connectedDevices.delete(id);
        }
    }
    
    res.json({ 
        success: true, 
        deviceId,
        devices: Array.from(connectedDevices.values())
    });
});

// Get connected devices
app.get('/api/devices', (req, res) => {
    res.json({ devices: Array.from(connectedDevices.values()) });
});

// Serve mobile interface
app.get('/mobile', (req, res) => {
    res.sendFile(path.join(__dirname, 'mobile.html'));
});

// Auto-detect mobile and redirect
app.get('/', (req, res) => {
    const userAgent = req.get('User-Agent') || '';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    // Check if user explicitly wants desktop version
    const forceDesktop = req.query.desktop === 'true';
    
    if (isMobile && !forceDesktop) {
        res.redirect('/mobile');
    } else {
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});

// Start server
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Listen on all network interfaces

app.listen(PORT, HOST, async () => {
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    let networkIP = 'localhost';
    
    // Find the first non-internal IPv4 address
    for (const interfaceName in networkInterfaces) {
        const addresses = networkInterfaces[interfaceName];
        for (const address of addresses) {
            if (address.family === 'IPv4' && !address.internal) {
                networkIP = address.address;
                break;
            }
        }
        if (networkIP !== 'localhost') break;
    }
    
    console.log(`Vault Pro server running on:`);
    console.log(`- Local: http://localhost:${PORT}`);
    console.log(`- Network: http://${networkIP}:${PORT}`);
    console.log('');
    console.log('Features:');
    console.log('- Encrypted document storage in secure_data/documents/');
    console.log('- SQLite database with encryption for passwords and notes');
    console.log('- All data encrypted with AES-256-GCM');
    console.log('- Mobile access enabled on network');
    console.log('');
    console.log('Network Access Instructions:');
    console.log('1. Ensure your mobile device is on the same WiFi network');
    console.log('2. Use the Device Link panel to get the network URL');
    console.log('3. If connection fails, check Windows Firewall settings');
    
    await initializeStorage();
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    db.close();
    process.exit(0);
});