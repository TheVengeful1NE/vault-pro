// Vault Pro Mobile - JavaScript
class MobileVaultPro {
    constructor() {
        this.currentCategory = 'all';
        this.editingId = null;
        this.passwordAccessGranted = false;
        this.data = { items: [] };
        this.init();
    }

    async init() {
        this.setupEventListeners();
        // Don't load data until authenticated
    }

    setupEventListeners() {
        // Mobile navigation buttons
        document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.target.dataset.category;
                
                // Check if trying to access passwords without authentication
                if (category === 'passwords' && !this.passwordAccessGranted) {
                    this.showMobilePasswordAuth();
                    return;
                }
                
                document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentCategory = category;
                this.renderMobileItems();
            });
        });

        // Category change handler for modal
        document.getElementById('mobileItemCategory').addEventListener('change', (e) => {
            this.toggleMobileContentFields(e.target.value);
        });
        
        // Close mobile password modal when clicking outside
        document.getElementById('mobilePasswordModal').addEventListener('click', (e) => {
            if (e.target.id === 'mobilePasswordModal') {
                closeMobilePasswordAuth();
            }
        });

        // File upload handler
        document.getElementById('mobileFileUpload').addEventListener('click', () => {
            document.getElementById('mobileDocumentFile').click();
        });

        document.getElementById('mobileDocumentFile').addEventListener('change', (e) => {
            this.handleMobileFileSelection(e.target.files[0]);
        });

        // Touch and swipe handlers
        this.setupTouchHandlers();
        
        // Mobile password auth enter key
        document.getElementById('mobilePasswordAuthInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                authenticateMobilePasswordAccess();
            }
        });
    }

    setupTouchHandlers() {
        let startX = 0;
        let startY = 0;
        let isScrolling = false;

        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isScrolling = false;
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (!startX || !startY) return;
            
            const diffX = Math.abs(e.touches[0].clientX - startX);
            const diffY = Math.abs(e.touches[0].clientY - startY);
            
            if (diffY > diffX) {
                isScrolling = true;
            }
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            if (isScrolling) return;
            
            const endX = e.changedTouches[0].clientX;
            const diffX = startX - endX;
            
            // Swipe navigation in vault view
            if (Math.abs(diffX) > 50 && document.getElementById('mobileVault').style.display === 'block') {
                const navButtons = document.querySelectorAll('.mobile-nav-btn');
                const activeIndex = Array.from(navButtons).findIndex(btn => btn.classList.contains('active'));
                
                if (diffX > 0 && activeIndex < navButtons.length - 1) {
                    // Swipe left - next category
                    navButtons[activeIndex + 1].click();
                } else if (diffX < 0 && activeIndex > 0) {
                    // Swipe right - previous category
                    navButtons[activeIndex - 1].click();
                }
            }
            
            startX = 0;
            startY = 0;
        }, { passive: true });
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
            throw error;
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
            throw error;
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
        this.renderMobileItems();
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
        this.renderMobileItems();
    }

    async deleteItem(id) {
        if (confirm('Delete this item?')) {
            const item = this.data.items.find(item => item.id === id);
            if (item) {
                await this.deleteItemFile(id, item.category);
                await this.loadData();
                this.renderMobileItems();
            }
        }
    }

    getFilteredItems() {
        if (this.currentCategory === 'all') {
            return this.data.items;
        }
        return this.data.items.filter(item => item.category === this.currentCategory);
    }

    renderMobileItems() {
        const content = document.getElementById('mobileContent');
        const items = this.getFilteredItems();
        
        if (items.length === 0) {
            content.innerHTML = `
                <div class="mobile-empty">
                    <div class="mobile-empty-icon">🔒</div>
                    <div class="mobile-empty-text">
                        No items in this category<br>
                        <small>Tap + to add new items</small>
                    </div>
                </div>
            `;
            return;
        }

        // Check if we're showing passwords without authentication
        const isPasswordCategory = this.currentCategory === 'passwords' || 
                                 (this.currentCategory === 'all' && items.some(item => item.category === 'passwords'));
        const shouldMaskPasswords = isPasswordCategory && !this.passwordAccessGranted;

        content.innerHTML = items.map(item => {
            const isPassword = item.category === 'passwords';
            const shouldMaskThis = isPassword && !this.passwordAccessGranted;
            
            return `
                <div class="mobile-item">
                    <div class="mobile-item-title">
                        ${shouldMaskThis ? this.maskText(item.title) : this.escapeHtml(item.title)}
                    </div>
                    <div class="mobile-item-content">
                        ${shouldMaskThis ? this.maskText(item.content) : 
                          this.escapeHtml(item.content).substring(0, 100)}${item.content.length > 100 ? '...' : ''}
                    </div>
                    <div class="mobile-item-meta">
                        ${item.category.toUpperCase()} • ${new Date(item.created).toLocaleDateString()} • 🔐 ENCRYPTED
                    </div>
                    <div class="mobile-item-actions">
                        ${shouldMaskThis ? 
                            `<button class="mobile-action-btn" onclick="mobileVault.showMobilePasswordAuth()">🔓 UNLOCK</button>` :
                            item.category === 'documents' ? 
                                `<button class="mobile-action-btn" onclick="mobileVault.downloadDocument('${item.id}')">DOWNLOAD</button>` :
                                `<button class="mobile-action-btn" onclick="mobileVault.viewMobileItem('${item.id}')">VIEW</button>`
                        }
                        ${!shouldMaskThis ? `<button class="mobile-action-btn delete" onclick="mobileVault.deleteItem('${item.id}')">DELETE</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    maskText(text) {
        return text.split('').map(char => {
            if (char === ' ') return ' ';
            if (char === '\n') return '\n';
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
            return chars[Math.floor(Math.random() * chars.length)];
        }).join('');
    }

    showMobilePasswordAuth() {
        document.getElementById('mobilePasswordModal').style.display = 'block';
        setTimeout(() => {
            document.getElementById('mobilePasswordAuthInput').focus();
        }, 300);
    }

    grantMobilePasswordAccess() {
        this.passwordAccessGranted = true;
        // Switch to passwords category if not already there
        if (this.currentCategory !== 'passwords') {
            document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('[data-category="passwords"]').classList.add('active');
            this.currentCategory = 'passwords';
        }
        this.renderMobileItems();
        this.showMobileNotification('Password access granted!');
    }

    viewMobileItem(id) {
        const item = this.data.items.find(item => item.id === id);
        if (item) {
            document.getElementById('mobileViewItemTitle').textContent = item.title;
            document.getElementById('mobileViewItemCategory').textContent = item.category.toUpperCase();
            document.getElementById('mobileViewItemContent').textContent = item.content;
            document.getElementById('mobileViewItemCreated').textContent = new Date(item.created).toLocaleString();
            document.getElementById('mobileViewItemModified').textContent = new Date(item.modified).toLocaleString();
            document.getElementById('mobileViewPanel').style.display = 'block';
        }
    }

    downloadDocument(id) {
        window.open(`/api/documents/${id}`, '_blank');
    }

    // Edit functionality removed for mobile version

    toggleMobileContentFields(category) {
        const contentGroup = document.getElementById('mobileContentGroup');
        const fileGroup = document.getElementById('mobileFileGroup');
        
        if (category === 'documents') {
            contentGroup.style.display = 'none';
            fileGroup.style.display = 'block';
        } else {
            contentGroup.style.display = 'block';
            fileGroup.style.display = 'none';
        }
    }

    handleMobileFileSelection(file) {
        const fileUpload = document.getElementById('mobileFileUpload');
        const fileText = document.getElementById('mobileFileText');
        
        if (file) {
            fileUpload.classList.add('has-file');
            fileText.innerHTML = `📄 ${file.name}<br><small>${this.formatFileSize(file.size)}</small>`;
        } else {
            fileUpload.classList.remove('has-file');
            fileText.innerHTML = '📁<br>TAP TO SELECT FILE';
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showMobileNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = 'mobile-notification';
        notification.textContent = message;
        
        if (type === 'error') {
            notification.style.background = 'rgba(233, 69, 96, 0.9)';
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global functions for mobile interface
function mobileAuthenticate() {
    const password = document.getElementById('mobilePassword').value;
    
    if (password === 'OMEGA###') {
        document.getElementById('mobileLogin').style.display = 'none';
        document.getElementById('mobileMain').style.display = 'block';
        
        // Track mobile device connection
        trackMobileDevice();
    } else {
        mobileVault.showMobileNotification('Access denied - Invalid credentials', 'error');
        document.getElementById('mobilePassword').value = '';
    }
}

function mobileLogout() {
    document.getElementById('mobileVault').style.display = 'none';
    document.getElementById('mobileMain').style.display = 'none';
    document.getElementById('mobileLogin').style.display = 'flex';
    document.getElementById('mobilePassword').value = '';
}

function openMobileVault() {
    document.getElementById('mobileMain').style.display = 'none';
    document.getElementById('mobileVault').style.display = 'block';
    
    // Initialize vault if not already done
    if (!window.mobileVault) {
        window.mobileVault = new MobileVaultPro();
    }
    
    // Load data and render
    mobileVault.loadData().then(() => {
        mobileVault.renderMobileItems();
    });
}

function backToMobileMain() {
    document.getElementById('mobileVault').style.display = 'none';
    document.getElementById('mobileMain').style.display = 'block';
}

function openMobileAddModal() {
    document.getElementById('mobileModalTitle').textContent = 'ADD NEW ITEM';
    document.getElementById('mobileItemCategory').value = 'documents';
    document.getElementById('mobileItemTitle').value = '';
    document.getElementById('mobileItemContent').value = '';
    document.getElementById('mobileDocumentFile').value = '';
    mobileVault.handleMobileFileSelection(null);
    mobileVault.toggleMobileContentFields('documents');
    document.getElementById('mobileModal').style.display = 'block';
}

function closeMobileModal() {
    document.getElementById('mobileModal').style.display = 'none';
}

async function saveMobileItem() {
    const category = document.getElementById('mobileItemCategory').value;
    const title = document.getElementById('mobileItemTitle').value.trim();
    
    if (!title) {
        mobileVault.showMobileNotification('Please enter a title', 'error');
        return;
    }
    
    let content = '';
    let file = null;
    
    if (category === 'documents') {
        const fileInput = document.getElementById('mobileDocumentFile');
        if (!fileInput.files[0]) {
            mobileVault.showMobileNotification('Please select a file to upload', 'error');
            return;
        }
        file = fileInput.files[0];
    } else {
        content = document.getElementById('mobileItemContent').value.trim();
        if (!content) {
            mobileVault.showMobileNotification('Please enter content', 'error');
            return;
        }
    }
    
    try {
        await mobileVault.addItem(category, title, content, file);
        mobileVault.showMobileNotification('Item added successfully!');
        closeMobileModal();
    } catch (error) {
        mobileVault.showMobileNotification('Error saving item: ' + error.message, 'error');
    }
}

function closeMobilePasswordAuth() {
    document.getElementById('mobilePasswordModal').style.display = 'none';
    document.getElementById('mobilePasswordAuthInput').value = '';
    document.getElementById('mobilePasswordAuthError').style.display = 'none';
}

function closeMobileViewPanel() {
    document.getElementById('mobileViewPanel').style.display = 'none';
}

function authenticateMobilePasswordAccess() {
    const password = document.getElementById('mobilePasswordAuthInput').value;
    const errorMsg = document.getElementById('mobilePasswordAuthError');
    
    if (password === 'PASSWORD###') {
        errorMsg.style.display = 'none';
        closeMobilePasswordAuth();
        mobileVault.grantMobilePasswordAccess();
    } else {
        errorMsg.style.display = 'block';
        document.getElementById('mobilePasswordAuthInput').value = '';
        // Add shake animation
        const input = document.getElementById('mobilePasswordAuthInput');
        input.style.animation = 'shake 0.5s';
        setTimeout(() => {
            input.style.animation = '';
        }, 500);
    }
}

function trackMobileDevice() {
    const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        timestamp: new Date().toISOString(),
        type: 'mobile',
        isMobile: true,
        screenInfo: {
            width: window.screen.width,
            height: window.screen.height,
            orientation: window.screen.orientation ? window.screen.orientation.type : 'unknown'
        },
        touchSupport: 'ontouchstart' in window,
        language: navigator.language
    };
    
    fetch('/api/device-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deviceInfo)
    }).catch(error => {
        console.error('Error tracking mobile device:', error);
    });
}

// Initialize mobile vault
window.mobileVault = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Focus password input after a short delay to ensure keyboard doesn't interfere
    setTimeout(() => {
        const passwordInput = document.getElementById('mobilePassword');
        if (passwordInput) {
            passwordInput.focus();
        }
    }, 500);
    
    // Add mobile-specific optimizations
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.webkitTouchCallout = 'none';
    
    // Prevent zoom on double tap
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function (event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
    
    // Show mobile welcome message
    setTimeout(() => {
        if (!sessionStorage.getItem('mobileWelcomeShown')) {
            const notification = document.createElement('div');
            notification.className = 'mobile-notification show';
            notification.textContent = 'Welcome to Vault Pro Mobile! Optimized for touch.';
            notification.style.background = 'rgba(0, 212, 255, 0.9)';
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 3000);
            
            sessionStorage.setItem('mobileWelcomeShown', 'true');
        }
    }, 1000);
});