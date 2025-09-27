// Mobile Vault Pro - Panel-based UI
class MobileVaultPro {
    constructor() {
        this.currentCategory = 'all';
        this.editingId = null;
        this.passwordAccessGranted = false;
        this.init();
    }

    async init() {
        try {
            this.setupEventListeners();
            await this.loadData();
            this.renderItems();
        } catch (error) {
            console.error('Init error:', error);
            this.renderError();
        }
    }

    async loadData() {
        try {
            const response = await fetch('/api/items');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.data = await response.json();
            if (!this.data || !this.data.items) {
                this.data = { items: [] };
            }
        } catch (error) {
            console.error('Error loading data:', error);
            // Use mock data for demo
            this.data = {
                items: [
                    {
                        id: '1',
                        category: 'notes',
                        title: 'Sample Note',
                        content: 'This is a sample note to test the mobile interface.',
                        created: new Date().toISOString(),
                        modified: new Date().toISOString()
                    },
                    {
                        id: '2',
                        category: 'passwords',
                        title: 'Sample Password',
                        content: 'username: demo\npassword: ****',
                        created: new Date().toISOString(),
                        modified: new Date().toISOString()
                    }
                ]
            };
        }
    }

    setupEventListeners() {
        // Mobile navigation buttons
        document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.target.dataset.category;
                
                if (category === 'passwords' && !this.passwordAccessGranted) {
                    this.showMobilePasswordAuth();
                    return;
                }
                
                document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentCategory = category;
                this.renderItems();
            });
        });

        // Category change handler
        document.getElementById('mobileItemCategory').addEventListener('change', (e) => {
            this.toggleMobileContentFields(e.target.value);
        });

        // File upload handler
        document.getElementById('mobileFileUpload').addEventListener('click', () => {
            document.getElementById('mobileDocumentFile').click();
        });

        document.getElementById('mobileDocumentFile').addEventListener('change', (e) => {
            this.handleMobileFileSelection(e.target.files[0]);
        });
    }

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
        const fileText = document.getElementById('mobileFileText');
        const fileUpload = document.getElementById('mobileFileUpload');
        
        if (file) {
            fileUpload.classList.add('has-file');
            fileText.textContent = `SELECTED: ${file.name}`;
        } else {
            fileUpload.classList.remove('has-file');
            fileText.textContent = 'TAP TO SELECT FILE';
        }
    }

    getFilteredItems() {
        if (!this.data || !this.data.items || !Array.isArray(this.data.items)) {
            return [];
        }
        
        if (this.currentCategory === 'all') {
            return this.data.items;
        }
        return this.data.items.filter(item => item && item.category === this.currentCategory);
    }

    renderItems() {
        const mobileContent = document.getElementById('mobileContent');
        if (!mobileContent) {
            console.error('Mobile content element not found');
            return;
        }
        
        const items = this.getFilteredItems();
        
        if (!items || items.length === 0) {
            mobileContent.innerHTML = `
                <div class="mobile-empty">
                    <div class="mobile-empty-icon">🔒</div>
                    <div class="mobile-empty-text">No items in this category<br>Tap + to add new items</div>
                </div>
            `;
            return;
        }

        try {
            mobileContent.innerHTML = items.map(item => {
                if (!item) return '';
                
                const isPassword = item.category === 'passwords';
                const shouldMaskThis = isPassword && !this.passwordAccessGranted;
                const content = item.content || '';
                const title = item.title || 'Untitled';
                
                return `
                    <div class="mobile-item">
                        <div class="mobile-item-title ${shouldMaskThis ? 'password-masked' : ''}">
                            ${shouldMaskThis ? this.maskText(title) : this.escapeHtml(title)}
                        </div>
                        <div class="mobile-item-content ${shouldMaskThis ? 'password-masked' : ''}">
                            ${shouldMaskThis ? this.maskText(content) : 
                              this.escapeHtml(content).substring(0, 100)}${content.length > 100 ? '...' : ''}
                        </div>
                        <div class="mobile-item-meta">
                            ${(item.category || 'unknown').toUpperCase()} | ${new Date(item.created || Date.now()).toLocaleDateString()}
                        </div>
                        <div class="mobile-item-actions">
                            ${shouldMaskThis ? 
                                `<button class="mobile-action-btn" onclick="window.mobileVault.showMobilePasswordAuth()">🔒 UNLOCK</button>` :
                                item.category === 'documents' ? 
                                    `<button class="mobile-action-btn" onclick="window.mobileVault.downloadDocument('${item.id}')">DOWNLOAD</button>` :
                                    `<button class="mobile-action-btn" onclick="window.mobileVault.viewMobileItem('${item.id}')">VIEW</button>`
                            }
                            ${!shouldMaskThis ? `<button class="mobile-action-btn" onclick="window.mobileVault.openMobileEditModal('${item.id}')">EDIT</button>` : ''}
                            ${!shouldMaskThis ? `<button class="mobile-action-btn delete" onclick="window.mobileVault.deleteMobileItem('${item.id}')">DELETE</button>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Error rendering items:', error);
            mobileContent.innerHTML = `
                <div class="mobile-empty">
                    <div class="mobile-empty-icon">⚠️</div>
                    <div class="mobile-empty-text">Error loading items<br>Please try refreshing</div>
                </div>
            `;
        }
    }

    viewMobileItem(id) {
        const item = this.data.items.find(item => item.id === id);
        if (item) {
            document.getElementById('mobileViewItemTitle').textContent = item.title;
            document.getElementById('mobileViewItemCategory').textContent = item.category.toUpperCase();
            document.getElementById('mobileViewItemContent').textContent = item.content;
            document.getElementById('mobileViewItemCreated').textContent = new Date(item.created).toLocaleString();
            document.getElementById('mobileViewItemModified').textContent = new Date(item.modified).toLocaleString();
            
            document.getElementById('mobileVault').style.display = 'none';
            document.getElementById('mobileViewPanel').style.display = 'block';
        }
    }

    openMobileEditModal(id) {
        const item = this.data.items.find(item => item.id === id);
        if (item) {
            this.editingId = id;
            document.getElementById('mobileItemPanelTitle').textContent = 'EDIT ITEM';
            document.getElementById('mobileItemCategory').value = item.category;
            document.getElementById('mobileItemTitle').value = item.title;
            document.getElementById('mobileItemContent').value = item.content;
            this.toggleMobileContentFields(item.category);
            
            document.getElementById('mobileVault').style.display = 'none';
            document.getElementById('mobileItemPanel').style.display = 'block';
        }
    }

    async deleteMobileItem(id) {
        if (confirm('Delete this item?')) {
            const item = this.data.items.find(item => item.id === id);
            if (item) {
                await this.deleteItemFile(id, item.category);
                await this.loadData();
                this.renderItems();
            }
        }
    }

    downloadDocument(id) {
        window.open(`/api/documents/${id}`, '_blank');
    }

    showMobilePasswordAuth() {
        document.getElementById('mobileVault').style.display = 'none';
        document.getElementById('mobilePasswordPanel').style.display = 'block';
        setTimeout(() => {
            document.getElementById('mobilePasswordAuthInput').focus();
        }, 100);
    }

    grantMobilePasswordAccess() {
        this.passwordAccessGranted = true;
        if (this.currentCategory !== 'passwords') {
            document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('[data-category="passwords"]').classList.add('active');
            this.currentCategory = 'passwords';
        }
        this.renderItems();
    }

    maskText(text) {
        return text.split('').map(char => {
            if (char === ' ') return ' ';
            if (char === '\n') return '\n';
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
            return chars[Math.floor(Math.random() * chars.length)];
        }).join('');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    renderError() {
        const mobileContent = document.getElementById('mobileContent');
        if (mobileContent) {
            mobileContent.innerHTML = `
                <div class="mobile-empty">
                    <div class="mobile-empty-icon">⚠️</div>
                    <div class="mobile-empty-text">Failed to load secure storage<br>Please check your connection</div>
                    <button class="mobile-form-btn save" onclick="window.mobileVault.init()" style="margin-top: 20px;">RETRY</button>
                </div>
            `;
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
}

// Global mobile functions
function mobileAuthenticate() {
    const password = document.getElementById('mobilePassword').value;
    
    if (password === 'OMEGA###') {
        document.getElementById('mobileLogin').style.display = 'none';
        document.getElementById('mobileMain').style.display = 'block';
    } else {
        showMobileNotification('ACCESS DENIED - INVALID CREDENTIALS', 'error');
        document.getElementById('mobilePassword').value = '';
    }
}

function mobileLogout() {
    document.getElementById('mobileMain').style.display = 'none';
    document.getElementById('mobileVault').style.display = 'none';
    document.getElementById('mobileLogin').style.display = 'flex';
    document.getElementById('mobilePassword').value = '';
}

function openMobileVault() {
    document.getElementById('mobileMain').style.display = 'none';
    document.getElementById('mobileVault').style.display = 'block';
    
    // Always create new instance to ensure fresh data
    window.mobileVault = new MobileVaultPro();
}

function backToMobileMain() {
    document.getElementById('mobileVault').style.display = 'none';
    document.getElementById('mobileMain').style.display = 'block';
}

function openMobileAddModal() {
    window.mobileVault.editingId = null;
    document.getElementById('mobileItemPanelTitle').textContent = 'ADD NEW ITEM';
    document.getElementById('mobileItemCategory').value = 'documents';
    document.getElementById('mobileItemTitle').value = '';
    document.getElementById('mobileItemContent').value = '';
    document.getElementById('mobileDocumentFile').value = '';
    window.mobileVault.handleMobileFileSelection(null);
    window.mobileVault.toggleMobileContentFields('documents');
    
    document.getElementById('mobileVault').style.display = 'none';
    document.getElementById('mobileItemPanel').style.display = 'block';
}

function closeMobileItemPanel() {
    document.getElementById('mobileItemPanel').style.display = 'none';
    document.getElementById('mobileVault').style.display = 'block';
}

function closeMobileViewPanel() {
    document.getElementById('mobileViewPanel').style.display = 'none';
    document.getElementById('mobileVault').style.display = 'block';
}

function closeMobilePasswordAuth() {
    document.getElementById('mobilePasswordPanel').style.display = 'none';
    document.getElementById('mobileVault').style.display = 'block';
    document.getElementById('mobilePasswordAuthInput').value = '';
    document.getElementById('mobilePasswordAuthError').style.display = 'none';
}

function authenticateMobilePasswordAccess() {
    const password = document.getElementById('mobilePasswordAuthInput').value;
    const errorMsg = document.getElementById('mobilePasswordAuthError');
    
    if (password === 'PASSWORD###') {
        errorMsg.style.display = 'none';
        closeMobilePasswordAuth();
        window.mobileVault.grantMobilePasswordAccess();
    } else {
        errorMsg.style.display = 'block';
        document.getElementById('mobilePasswordAuthInput').value = '';
    }
}

async function saveMobileItem() {
    const category = document.getElementById('mobileItemCategory').value;
    const title = document.getElementById('mobileItemTitle').value.trim();
    
    if (!title) {
        showMobileNotification('Please enter a title', 'error');
        return;
    }
    
    let content = '';
    let file = null;
    
    if (category === 'documents') {
        const fileInput = document.getElementById('mobileDocumentFile');
        if (!window.mobileVault.editingId && !fileInput.files[0]) {
            showMobileNotification('Please select a file to upload', 'error');
            return;
        }
        file = fileInput.files[0];
    } else {
        content = document.getElementById('mobileItemContent').value.trim();
        if (!content) {
            showMobileNotification('Please enter content', 'error');
            return;
        }
    }
    
    try {
        if (window.mobileVault.editingId) {
            await window.mobileVault.editItem(window.mobileVault.editingId, category, title, content, file);
        } else {
            await window.mobileVault.addItem(category, title, content, file);
        }
        closeMobileItemPanel();
        showMobileNotification('Item saved successfully!');
    } catch (error) {
        showMobileNotification('Error saving item: ' + error.message, 'error');
    }
}

function showMobileNotification(message, type = 'success') {
    const notification = document.createElement('div');
    const bgColor = type === 'error' ? 'rgba(233, 69, 96, 0.9)' : 'rgba(0, 255, 65, 0.9)';
    
    notification.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        right: 10px;
        background: ${bgColor};
        color: white;
        padding: 15px;
        border-radius: 4px;
        font-family: 'Courier New', monospace;
        font-size: 14px;
        z-index: 3000;
        text-align: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, type === 'error' ? 5000 : 3000);
    
    notification.addEventListener('touchend', () => {
        notification.remove();
    });
}

// Initialize mobile optimizations
document.addEventListener('DOMContentLoaded', () => {
    // Prevent zoom on input focus
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            const viewport = document.querySelector('meta[name=viewport]');
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        });
    });

    // Add touch feedback
    const touchElements = document.querySelectorAll('.mobile-card, .mobile-nav-btn, .mobile-action-btn, .mobile-form-btn, .mobile-login-btn');
    touchElements.forEach(element => {
        element.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.95)';
            this.style.transition = 'transform 0.1s';
        });
        
        element.addEventListener('touchend', function() {
            this.style.transform = 'scale(1)';
        });
    });

    // Enter key handlers
    document.getElementById('mobilePassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            mobileAuthenticate();
        }
    });

    document.getElementById('mobilePasswordAuthInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            authenticateMobilePasswordAccess();
        }
    });
});