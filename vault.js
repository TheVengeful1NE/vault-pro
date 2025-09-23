// Vault Pro - Secure Data Storage System (Server version with encryption)
class VaultPro {
    constructor() {
        this.currentCategory = 'all';
        this.editingId = null;
        this.passwordAccessGranted = false;
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.renderItems();
    }

    setupEventListeners() {
        // Category buttons
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.target.dataset.category;
                
                // Check if trying to access passwords without authentication
                if (category === 'passwords' && !this.passwordAccessGranted) {
                    this.showPasswordAuth();
                    return;
                }
                
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentCategory = category;
                this.renderItems();
            });
        });

        // Category change handler for modal
        document.getElementById('itemCategory').addEventListener('change', (e) => {
            this.toggleContentFields(e.target.value);
        });

        // File input handler
        document.getElementById('documentFile').addEventListener('change', (e) => {
            this.handleFileSelection(e.target.files[0]);
        });

        // Custom file input click handler
        document.getElementById('fileInputCustom').addEventListener('click', () => {
            document.getElementById('documentFile').click();
        });

        // Drag and drop handlers
        const fileInputCustom = document.getElementById('fileInputCustom');
        fileInputCustom.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileInputCustom.style.borderColor = '#00ff41';
            fileInputCustom.style.backgroundColor = 'rgba(0, 255, 65, 0.2)';
        });

        fileInputCustom.addEventListener('dragleave', (e) => {
            e.preventDefault();
            fileInputCustom.style.borderColor = '#00d4ff';
            fileInputCustom.style.backgroundColor = 'rgba(0, 212, 255, 0.1)';
        });

        fileInputCustom.addEventListener('drop', (e) => {
            e.preventDefault();
            fileInputCustom.style.borderColor = '#00d4ff';
            fileInputCustom.style.backgroundColor = 'rgba(0, 212, 255, 0.1)';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                document.getElementById('documentFile').files = files;
                this.handleFileSelection(files[0]);
            }
        });

        // Enter key for login
        document.getElementById('password').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                authenticate();
            }
        });

        // Enter key for password authentication
        document.getElementById('passwordAuthInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                authenticatePasswordAccess();
            }
        });

        // Modal form submission
        document.getElementById('itemTitle').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const category = document.getElementById('itemCategory').value;
                if (category === 'documents') {
                    document.getElementById('fileInputCustom').click();
                } else {
                    document.getElementById('itemContent').focus();
                }
            }
        });
    }

    toggleContentFields(category) {
        const contentGroup = document.getElementById('contentGroup');
        const fileGroup = document.getElementById('fileGroup');
        
        if (category === 'documents') {
            contentGroup.style.display = 'none';
            fileGroup.style.display = 'block';
        } else {
            contentGroup.style.display = 'block';
            fileGroup.style.display = 'none';
        }
    }

    async loadData() {
        try {
            const response = await fetch('/api/items');
            this.data = await response.json();
        } catch (error) {
            console.error('Error loading data:', error);
            this.data = { items: [] };
        }
    }

    async saveItem(item) {
        try {
            await fetch('/api/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
        } catch (error) {
            console.error('Error saving item:', error);
        }
    }

    async uploadDocument(id, title, file) {
        try {
            const formData = new FormData();
            formData.append('id', id);
            formData.append('title', title);
            formData.append('document', file);

            const response = await fetch('/api/documents', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            return await response.json();
        } catch (error) {
            console.error('Error uploading document:', error);
            throw error;
        }
    }

    async deleteItemFile(id, category) {
        try {
            await fetch(`/api/items/${id}?category=${category}`, { method: 'DELETE' });
        } catch (error) {
            console.error('Error deleting item:', error);
        }
    }

    async addItem(category, title, content, file = null) {
        const item = {
            id: Date.now().toString(),
            category,
            title,
            content: content || '',
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        };
        
        if (category === 'documents' && file) {
            await this.uploadDocument(item.id, title, file);
        } else {
            await this.saveItem(item);
        }
        
        await this.loadData();
        this.renderItems();
    }

    async editItem(id, category, title, content, file = null) {
        if (category === 'documents' && file) {
            await this.uploadDocument(id, title, file);
        } else {
            const item = this.data.items.find(item => item.id === id);
            if (item) {
                item.category = category;
                item.title = title;
                item.content = content;
                item.modified = new Date().toISOString();
                await this.saveItem(item);
            }
        }
        
        await this.loadData();
        this.renderItems();
    }

    async deleteItem(id) {
        if (confirm('Are you sure you want to delete this item?')) {
            const item = this.data.items.find(item => item.id === id);
            if (item) {
                await this.deleteItemFile(id, item.category);
                await this.loadData();
                this.renderItems();
            }
        }
    }

    getFilteredItems() {
        if (this.currentCategory === 'all') {
            return this.data.items;
        }
        return this.data.items.filter(item => item.category === this.currentCategory);
    }

    renderItems() {
        const itemsList = document.getElementById('itemsList');
        const items = this.getFilteredItems();
        
        if (items.length === 0) {
            itemsList.innerHTML = `
                <div style="text-align: center; color: #888; margin-top: 50px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">🔒</div>
                    <div>No items in this category</div>
                    <div style="font-size: 10px; margin-top: 10px;">Click "ADD NEW ITEM" to get started</div>
                </div>
            `;
            return;
        }

        // Check if we're showing passwords without authentication
        const isPasswordCategory = this.currentCategory === 'passwords' || 
                                 (this.currentCategory === 'all' && items.some(item => item.category === 'passwords'));
        const shouldMaskPasswords = isPasswordCategory && !this.passwordAccessGranted;

        itemsList.innerHTML = items.map(item => {
            const isPassword = item.category === 'passwords';
            const shouldMaskThis = isPassword && !this.passwordAccessGranted;
            
            return `
                <div class="item-card ${shouldMaskThis ? 'password-category-locked' : ''}">
                    <div class="item-title ${shouldMaskThis ? 'password-masked' : ''}">
                        ${shouldMaskThis ? this.maskText(item.title) : this.escapeHtml(item.title)}
                    </div>
                    <div class="item-content ${shouldMaskThis ? 'password-masked' : ''}">
                        ${shouldMaskThis ? this.maskText(item.content) : 
                          this.escapeHtml(item.content).substring(0, 200)}${item.content.length > 200 ? '...' : ''}
                    </div>
                    <div style="font-size: 10px; color: #666; margin-top: 10px;">
                        Category: ${item.category.toUpperCase()} | Created: ${new Date(item.created).toLocaleDateString()}
                        ${item.category === 'documents' ? ' | 🔒 ENCRYPTED' : ' | 🔐 ENCRYPTED'}
                    </div>
                    <div class="item-actions">
                        ${shouldMaskThis ? 
                            `<button class="action-btn" onclick="vault.showPasswordAuth()">🔒 UNLOCK</button>` :
                            item.category === 'documents' ? 
                                `<button class="action-btn" onclick="vault.downloadDocument('${item.id}')">DOWNLOAD</button>` :
                                `<button class="action-btn" onclick="vault.viewItem('${item.id}')">VIEW</button>`
                        }
                        ${!shouldMaskThis ? `<button class="action-btn" onclick="vault.openEditModal('${item.id}')">EDIT</button>` : ''}
                        ${!shouldMaskThis ? `<button class="action-btn delete-btn" onclick="vault.deleteItem('${item.id}')">DELETE</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    viewItem(id) {
        const item = this.data.items.find(item => item.id === id);
        if (item) {
            alert(`TITLE: ${item.title}\n\nCONTENT:\n${item.content}`);
        }
    }

    downloadDocument(id) {
        window.open(`/api/documents/${id}`, '_blank');
    }

    openEditModal(id) {
        const item = this.data.items.find(item => item.id === id);
        if (item) {
            this.editingId = id;
            document.getElementById('modalTitle').textContent = 'EDIT ITEM';
            document.getElementById('itemCategory').value = item.category;
            document.getElementById('itemTitle').value = item.title;
            document.getElementById('itemContent').value = item.content;
            this.toggleContentFields(item.category);
            document.getElementById('itemModal').style.display = 'flex';
        }
    }

    handleFileSelection(file) {
        const fileInputCustom = document.getElementById('fileInputCustom');
        const fileInputText = document.getElementById('fileInputText');
        
        if (file) {
            fileInputCustom.classList.add('has-file');
            fileInputText.innerHTML = `<span class="file-input-icon">📄</span>SELECTED: ${file.name} (${this.formatFileSize(file.size)})`;
        } else {
            fileInputCustom.classList.remove('has-file');
            fileInputText.innerHTML = `<span class="file-input-icon">📁</span>CLICK TO SELECT FILE OR DRAG & DROP`;
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    maskText(text) {
        // Create masked version with random characters
        return text.split('').map(char => {
            if (char === ' ') return ' ';
            if (char === '\n') return '\n';
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
            return chars[Math.floor(Math.random() * chars.length)];
        }).join('');
    }

    showPasswordAuth() {
        document.getElementById('passwordAuthModal').style.display = 'flex';
        document.getElementById('passwordAuthInput').focus();
    }

    grantPasswordAccess() {
        this.passwordAccessGranted = true;
        // Switch to passwords category if not already there
        if (this.currentCategory !== 'passwords') {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('[data-category="passwords"]').classList.add('active');
            this.currentCategory = 'passwords';
        }
        this.renderItems();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global functions
function authenticate() {
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('error');
    
    if (password === 'OMEGA###') {
        errorMsg.style.display = 'none';
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('mainPanel').style.display = 'block';
    } else {
        errorMsg.style.display = 'block';
        document.getElementById('password').value = '';
    }
}

function logout() {
    document.getElementById('vaultContainer').style.display = 'none';
    document.getElementById('devicePanel').style.display = 'none';
    document.getElementById('mainPanel').style.display = 'none';
    document.getElementById('loginContainer').style.display = 'block';
    document.getElementById('password').value = '';
}

function openVaultStorage() {
    document.getElementById('mainPanel').style.display = 'none';
    document.getElementById('vaultContainer').style.display = 'block';
    
    // Initialize vault if not already done
    if (!window.vault) {
        window.vault = new VaultPro();
    }
}

function backToMain() {
    document.getElementById('vaultContainer').style.display = 'none';
    document.getElementById('devicePanel').style.display = 'none';
    document.getElementById('mainPanel').style.display = 'block';
}

function openDeviceLink() {
    document.getElementById('mainPanel').style.display = 'none';
    document.getElementById('devicePanel').style.display = 'block';
    
    // Initialize device link functionality
    initializeDeviceLink();
}

function initializeDeviceLink() {
    // Get network IP address
    getNetworkIP();
    
    // Track device connection
    trackDeviceConnection();
    
    // Load existing devices
    fetch('/api/devices')
        .then(response => response.json())
        .then(data => {
            updateDeviceList(data.devices);
        })
        .catch(error => {
            console.error('Error loading devices:', error);
        });
}

function getNetworkIP() {
    fetch('/api/network-info')
        .then(response => response.json())
        .then(data => {
            const networkLink = document.getElementById('networkLink');
            if (data.networkIP) {
                // For cloud deployment, use the full URL
                if (data.networkIP.includes('http')) {
                    networkLink.textContent = data.networkIP;
                    updateMobileLinks(data.networkIP);
                } else {
                    networkLink.textContent = `http://${data.networkIP}:3000`;
                    updateMobileLinks(`http://${data.networkIP}:3000`);
                }
            } else {
                networkLink.textContent = window.location.origin;
                updateMobileLinks(window.location.origin);
            }
        })
        .catch(error => {
            console.error('Error getting network IP:', error);
            const fallbackURL = window.location.origin;
            document.getElementById('networkLink').textContent = fallbackURL;
            updateMobileLinks(fallbackURL);
        });
}

function updateMobileLinks(baseURL) {
    // Add mobile-specific link section if it doesn't exist
    const linkGenerator = document.querySelector('.link-generator');
    
    // Generate mobile URL
    let mobileURL;
    if (baseURL.includes('http')) {
        mobileURL = `${baseURL}/mobile`;
    } else {
        mobileURL = `http://${baseURL}:3000/mobile`;
    }
    
    // Check if mobile link section already exists
    if (!document.getElementById('mobileLinkInfo')) {
        const mobileLinkSection = document.createElement('div');
        mobileLinkSection.className = 'link-info';
        mobileLinkSection.id = 'mobileLinkInfo';
        mobileLinkSection.innerHTML = `
            <div class="link-label">MOBILE OPTIMIZED LINK:</div>
            <div class="link-display" id="mobileLink">${mobileURL}</div>
            <button class="copy-btn" onclick="copyMobileLink()">COPY MOBILE LINK</button>
        `;
        
        // Insert after network link
        const networkLinkInfo = linkGenerator.children[1];
        linkGenerator.insertBefore(mobileLinkSection, networkLinkInfo.nextSibling);
    } else {
        document.getElementById('mobileLink').textContent = mobileURL;
    }
}

function copyLink() {
    const link = document.getElementById('serverLink').textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(() => {
            showNotification('Local link copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy: ', err);
            fallbackCopyTextToClipboard(link, 'Local link copied to clipboard!');
        });
    } else {
        fallbackCopyTextToClipboard(link, 'Local link copied to clipboard!');
    }
}

function copyNetworkLink() {
    const link = document.getElementById('networkLink').textContent;
    if (link !== 'Generating...' && link !== 'Network IP not available' && link !== 'Error getting network IP') {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(link).then(() => {
                showNotification('Network link copied to clipboard!');
            }).catch(err => {
                console.error('Failed to copy: ', err);
                fallbackCopyTextToClipboard(link, 'Network link copied to clipboard!');
            });
        } else {
            fallbackCopyTextToClipboard(link, 'Network link copied to clipboard!');
        }
    } else {
        showNotification('Network link not ready yet', 'error');
    }
}



function copyMobileLink() {
    const mobileLink = document.getElementById('mobileLink');
    if (!mobileLink) {
        showNotification('Mobile link not available yet', 'error');
        return;
    }
    
    const link = mobileLink.textContent;
    if (link !== 'Generating...' && link !== 'Network IP not available' && link !== 'Error getting network IP') {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(link).then(() => {
                showNotification('Mobile link copied to clipboard!');
            }).catch(err => {
                console.error('Failed to copy: ', err);
                fallbackCopyTextToClipboard(link, 'Mobile link copied to clipboard!');
            });
        } else {
            fallbackCopyTextToClipboard(link, 'Mobile link copied to clipboard!');
        }
    } else {
        showNotification('Mobile link not ready yet', 'error');
    }
}

function fallbackCopyTextToClipboard(text, successMessage) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showNotification(successMessage);
        } else {
            showNotification('Copy failed - please copy manually', 'error');
        }
    } catch (err) {
        console.error('Fallback copy failed: ', err);
        showNotification('Copy failed - please copy manually', 'error');
    }
    
    document.body.removeChild(textArea);
}

function trackDeviceConnection() {
    // Detect device type and capabilities
    const isMobile = isMobileDevice();
    const screenInfo = {
        width: window.screen.width,
        height: window.screen.height,
        orientation: window.screen.orientation ? window.screen.orientation.type : 'unknown'
    };
    
    // Send device info to server
    const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        timestamp: new Date().toISOString(),
        type: isMobile ? 'mobile' : 'desktop',
        isMobile: isMobile,
        screenInfo: screenInfo,
        touchSupport: 'ontouchstart' in window,
        language: navigator.language
    };
    
    fetch('/api/device-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deviceInfo)
    })
    .then(response => response.json())
    .then(data => {
        updateDeviceList(data.devices);
        
        // Show mobile-specific welcome message
        if (isMobile && !sessionStorage.getItem('mobileWelcomeShown')) {
            setTimeout(() => {
                showNotification('Mobile access enabled! Swipe for navigation.');
                sessionStorage.setItem('mobileWelcomeShown', 'true');
            }, 1000);
        }
    })
    .catch(error => {
        console.error('Error tracking device:', error);
    });
    
    // Refresh device list every 30 seconds
    setInterval(() => {
        fetch('/api/devices')
            .then(response => response.json())
            .then(data => {
                updateDeviceList(data.devices);
            })
            .catch(error => {
                console.error('Error refreshing device list:', error);
            });
    }, 30000);
}

function updateDeviceList(devices) {
    const deviceList = document.getElementById('deviceList');
    
    // Always show the host computer first
    let deviceHTML = `
        <div class="device-item current-device">
            <div class="device-icon">💻</div>
            <div class="device-info">
                <div class="device-name">HOST COMPUTER</div>
                <div class="device-details">Windows PC - Current Session</div>
                <div class="device-status online">ONLINE</div>
            </div>
            <div class="device-actions">
                <span class="device-badge">PRIMARY</span>
            </div>
        </div>
    `;
    
    // Add only online connected devices (exclude host duplicates)
    if (devices && devices.length > 0) {
        const onlineDevices = devices.filter(device => {
            const isOnline = new Date() - new Date(device.lastSeen) < 2 * 60 * 1000; // 2 minutes
            const isNotHost = !device.name.includes('Windows PC') && !device.name.includes('HOST');
            return isOnline && isNotHost;
        });
        
        const connectedDevices = onlineDevices.map(device => `
            <div class="device-item">
                <div class="device-icon">${device.type === 'mobile' ? '📱' : '💻'}</div>
                <div class="device-info">
                    <div class="device-name">${device.name}</div>
                    <div class="device-details">${device.details}</div>
                    <div class="device-status online">ONLINE</div>
                </div>
                <div class="device-actions">
                    <span class="device-badge">${device.type === 'mobile' ? 'MOBILE' : 'CONNECTED'}</span>
                </div>
            </div>
        `).join('');
        
        deviceHTML += connectedDevices;
    }
    
    deviceList.innerHTML = deviceHTML;
}

function showNotification(message) {
    // Simple notification system
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 255, 65, 0.9);
        color: white;
        padding: 10px 20px;
        border-radius: 4px;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        z-index: 3000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function openAddModal() {
    vault.editingId = null;
    document.getElementById('modalTitle').textContent = 'ADD NEW ITEM';
    document.getElementById('itemCategory').value = 'documents';
    document.getElementById('itemTitle').value = '';
    document.getElementById('itemContent').value = '';
    document.getElementById('documentFile').value = '';
    vault.handleFileSelection(null);
    vault.toggleContentFields('documents');
    document.getElementById('itemModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('itemModal').style.display = 'none';
}

async function saveItem() {
    const category = document.getElementById('itemCategory').value;
    const title = document.getElementById('itemTitle').value.trim();
    
    if (!title) {
        alert('Please enter a title');
        return;
    }
    
    let content = '';
    let file = null;
    
    if (category === 'documents') {
        const fileInput = document.getElementById('documentFile');
        if (!vault.editingId && !fileInput.files[0]) {
            alert('Please select a file to upload');
            return;
        }
        file = fileInput.files[0];
    } else {
        content = document.getElementById('itemContent').value.trim();
        if (!content) {
            alert('Please enter content');
            return;
        }
    }
    
    try {
        if (vault.editingId) {
            await vault.editItem(vault.editingId, category, title, content, file);
        } else {
            await vault.addItem(category, title, content, file);
        }
        closeModal();
    } catch (error) {
        alert('Error saving item: ' + error.message);
    }
}

// Close modal when clicking outside
document.getElementById('itemModal').addEventListener('click', (e) => {
    if (e.target.id === 'itemModal') {
        closeModal();
    }
});

function authenticatePasswordAccess() {
    const password = document.getElementById('passwordAuthInput').value;
    const errorMsg = document.getElementById('passwordAuthError');
    
    if (password === 'PASSWORD###') {
        errorMsg.style.display = 'none';
        closePasswordAuth();
        vault.grantPasswordAccess();
    } else {
        errorMsg.style.display = 'block';
        document.getElementById('passwordAuthInput').value = '';
    }
}

function closePasswordAuth() {
    document.getElementById('passwordAuthModal').style.display = 'none';
    document.getElementById('passwordAuthInput').value = '';
    document.getElementById('passwordAuthError').style.display = 'none';
}

// Close password auth modal when clicking outside
document.getElementById('passwordAuthModal').addEventListener('click', (e) => {
    if (e.target.id === 'passwordAuthModal') {
        closePasswordAuth();
    }
});

// Mobile detection and optimization
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function optimizeForMobile() {
    if (isMobileDevice()) {
        // Add mobile-specific class
        document.body.classList.add('mobile-device');
        
        // Prevent zoom on input focus
        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                const viewport = document.querySelector('meta[name=viewport]');
                viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
            });
            
            input.addEventListener('blur', () => {
                const viewport = document.querySelector('meta[name=viewport]');
                viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
            });
        });
        
        // Add touch feedback
        const touchElements = document.querySelectorAll('.system-card, .category-btn, .action-btn, .modal-btn, .login-btn');
        touchElements.forEach(element => {
            element.addEventListener('touchstart', function() {
                this.style.transform = 'scale(0.95)';
                this.style.transition = 'transform 0.1s';
            });
            
            element.addEventListener('touchend', function() {
                this.style.transform = 'scale(1)';
            });
        });
        
        // Optimize modal for mobile
        const modals = document.querySelectorAll('.modal, .password-auth-modal');
        modals.forEach(modal => {
            modal.addEventListener('touchmove', (e) => {
                e.preventDefault();
            }, { passive: false });
        });
        
        // Add swipe gesture for sidebar on mobile
        let startX = 0;
        let startY = 0;
        
        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });
        
        document.addEventListener('touchend', (e) => {
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const diffX = startX - endX;
            const diffY = startY - endY;
            
            // Swipe left to show sidebar (if in vault view)
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                const vaultContainer = document.getElementById('vaultContainer');
                if (vaultContainer && vaultContainer.style.display === 'block') {
                    const sidebar = document.querySelector('.sidebar');
                    const mainContent = document.querySelector('.main-content');
                    
                    if (diffX > 0) {
                        // Swipe left - show sidebar
                        sidebar.style.order = '1';
                        mainContent.style.order = '2';
                    } else {
                        // Swipe right - show main content
                        sidebar.style.order = '2';
                        mainContent.style.order = '1';
                    }
                }
            }
        });
    }
}

// Enhanced notification for mobile
function showNotification(message) {
    const notification = document.createElement('div');
    const isMobile = isMobileDevice();
    
    notification.style.cssText = `
        position: fixed;
        top: ${isMobile ? '10px' : '20px'};
        right: ${isMobile ? '10px' : '20px'};
        left: ${isMobile ? '10px' : 'auto'};
        background: rgba(0, 255, 65, 0.9);
        color: white;
        padding: ${isMobile ? '15px' : '10px 20px'};
        border-radius: 4px;
        font-family: 'Courier New', monospace;
        font-size: ${isMobile ? '14px' : '12px'};
        z-index: 3000;
        animation: slideIn 0.3s ease;
        text-align: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Auto-dismiss after longer time on mobile
    setTimeout(() => {
        notification.remove();
    }, isMobile ? 4000 : 3000);
    
    // Tap to dismiss on mobile
    if (isMobile) {
        notification.addEventListener('touchend', () => {
            notification.remove();
        });
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Don't auto-focus on mobile to prevent keyboard popup
    if (!isMobileDevice()) {
        document.getElementById('password').focus();
    }
    
    // Apply mobile optimizations
    optimizeForMobile();
    
    // Add mobile-specific styles
    if (isMobileDevice()) {
        const style = document.createElement('style');
        style.textContent = `
            .mobile-device .stars {
                animation-duration: 6s;
            }
            
            .mobile-device .login-title {
                font-size: 22px;
            }
            
            .mobile-device .vault-content {
                overflow: hidden;
            }
            
            .mobile-device .main-content {
                -webkit-overflow-scrolling: touch;
            }
            
            .mobile-device .sidebar {
                background: linear-gradient(145deg, #2a2a3e, #1e1e32);
                border-top: 2px solid #0f3460;
            }
        `;
        document.head.appendChild(style);
    }
});