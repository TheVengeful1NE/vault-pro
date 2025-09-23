const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// Simple in-memory storage for cloud deployment
let vaultData = { items: [] };

// Load data from file if exists
function loadData() {
    try {
        if (fs.existsSync('vault_data.json')) {
            const data = fs.readFileSync('vault_data.json', 'utf8');
            vaultData = JSON.parse(data);
        }
    } catch (error) {
        console.log('Starting with empty vault');
        vaultData = { items: [] };
    }
}

// Save data to file
function saveData() {
    try {
        fs.writeFileSync('vault_data.json', JSON.stringify(vaultData, null, 2));
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static('.', {
    setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
}));

// Get all items
app.get('/api/items', (req, res) => {
    try {
        res.json(vaultData);
    } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).json({ error: error.message });
    }
});

// Save item
app.post('/api/items', (req, res) => {
    try {
        const item = req.body;
        const existingIndex = vaultData.items.findIndex(i => i.id === item.id);
        
        if (existingIndex >= 0) {
            vaultData.items[existingIndex] = item;
        } else {
            vaultData.items.push(item);
        }
        
        saveData();
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving item:', error);
        res.status(500).json({ error: error.message });
    }
});

// Upload document (simplified for cloud)
app.post('/api/documents', (req, res) => {
    try {
        const { id, title, content, category } = req.body;
        const document = {
            id: id || Date.now().toString(),
            title,
            content: content || 'Document uploaded',
            category: 'documents',
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        };
        
        vaultData.items.push(document);
        saveData();
        res.json({ success: true, document });
    } catch (error) {
        console.error('Error saving document:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get document
app.get('/api/documents/:id', (req, res) => {
    try {
        const document = vaultData.items.find(item => item.id === req.params.id && item.category === 'documents');
        if (document) {
            res.json(document);
        } else {
            res.status(404).json({ error: 'Document not found' });
        }
    } catch (error) {
        console.error('Error getting document:', error);
        res.status(404).json({ error: 'Document not found' });
    }
});

// Delete item
app.delete('/api/items/:id', (req, res) => {
    try {
        const index = vaultData.items.findIndex(item => item.id === req.params.id);
        if (index >= 0) {
            vaultData.items.splice(index, 1);
            saveData();
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get network information
app.get('/api/network-info', (req, res) => {
    // For cloud deployment, return the host URL
    const host = req.get('host');
    const protocol = req.get('x-forwarded-proto') || 'http';
    const networkIP = `${protocol}://${host}`;
    
    res.json({ networkIP });
});

// Track device connections
const connectedDevices = new Map();

app.post('/api/device-connect', (req, res) => {
    const deviceInfo = req.body;
    const deviceId = req.ip + '_' + Date.now();
    
    let deviceType = 'desktop';
    let deviceName = 'Unknown Device';
    let deviceDetails = '';
    
    if (deviceInfo.userAgent) {
        const ua = deviceInfo.userAgent;
        
        if (deviceInfo.isTablet || /iPad|Android(?!.*Mobile)/i.test(ua)) {
            deviceType = 'tablet';
            if (/iPad/i.test(ua)) {
                deviceName = 'iPad';
                deviceDetails = 'iOS Tablet Device';
            } else if (/Android/i.test(ua) && !/Mobile/i.test(ua)) {
                deviceName = 'Android Tablet';
                deviceDetails = 'Android Tablet Device';
            } else {
                deviceName = 'Tablet Device';
                deviceDetails = 'Unknown Tablet Device';
            }
        } else if (/Mobile|Android|iPhone|iPod/i.test(ua)) {
            deviceType = 'mobile';
            if (/iPhone/i.test(ua)) {
                deviceName = 'iPhone';
                deviceDetails = 'iOS Mobile Device';
            } else if (/Android/i.test(ua) && /Mobile/i.test(ua)) {
                deviceName = 'Android Phone';
                deviceDetails = 'Android Mobile Device';
            } else {
                deviceName = 'Mobile Device';
                deviceDetails = 'Mobile Device';
            }
        } else {
            if (/Windows/i.test(ua)) {
                deviceName = 'Windows PC';
                deviceDetails = 'Windows Desktop';
            } else if (/Mac/i.test(ua)) {
                deviceName = 'Mac';
                deviceDetails = 'macOS Desktop';
            }
        }
    }
    
    const device = {
        id: deviceId,
        name: deviceName,
        type: deviceType,
        details: deviceDetails,
        lastSeen: new Date().toISOString(),
        online: true
    };
    
    connectedDevices.set(deviceId, device);
    res.json({ success: true, deviceId, devices: Array.from(connectedDevices.values()) });
});

// Get connected devices
app.get('/api/devices', (req, res) => {
    res.json({ devices: Array.from(connectedDevices.values()) });
});

// Serve mobile interface
app.get('/mobile', (req, res) => {
    res.sendFile(path.join(__dirname, 'mobile.html'));
});

// Serve tablet interface
app.get('/tablet', (req, res) => {
    res.sendFile(path.join(__dirname, 'tablet.html'));
});

// Auto-detect device type and redirect
app.get('/', (req, res) => {
    const userAgent = req.get('User-Agent') || '';
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent);
    const isMobile = /Mobile|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) && !isTablet;
    const forceDesktop = req.query.desktop === 'true';
    
    if (isTablet && !forceDesktop) {
        res.redirect('/tablet');
    } else if (isMobile && !forceDesktop) {
        res.redirect('/mobile');
    } else {
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});

// Start server
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(`Vault Pro server running on port ${PORT}`);
    loadData();
});