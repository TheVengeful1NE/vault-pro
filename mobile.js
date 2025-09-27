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
            this.data = { items: [] };
        }
    }

    setupEventListeners() {
        // Category buttons
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.target.dataset.category;
                
                if (category === 'passwords' && !this.passwordAccessGranted) {
                    this.showMobilePasswordAuth();
                    return;
                }
                
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
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
        console.log('Rendering mobile items...');
        const mobileContent = document.getElementById('mobileContent');
        if (!mobileContent) {
            console.error('Mobile content element not found');
            return;
        }
        
        const items = this.getFilteredItems();
        console.log('Items to render:', items.length);
        
        if (!items || items.length === 0) {
            mobileContent.innerHTML = `
                <div style="text-align: center; color: #888; margin-top: 50px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">🔒</div>
                    <div>No items in this category</div>
                    <div style="font-size: 10px; margin-top: 10px;">Add items on desktop to see them here</div>
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
                    <div class="item-card ${shouldMaskThis ? 'password-category-locked' : ''}">
                        <div class="item-title ${shouldMaskThis ? 'password-masked' : ''}">
                            ${shouldMaskThis ? this.maskText(title) : this.escapeHtml(title)}
                        </div>
                        <div class="item-content ${shouldMaskThis ? 'password-masked' : ''}">
                            ${shouldMaskThis ? this.maskText(content) : 
                              this.escapeHtml(content).substring(0, 200)}${content.length > 200 ? '...' : ''}
                        </div>
                        <div style="font-size: 10px; color: #666; margin-top: 10px;">
                            Category: ${(item.category || 'unknown').toUpperCase()} | Created: ${new Date(item.created || Date.now()).toLocaleDateString()}
                            ${item.category === 'documents' ? ' | 🔒 ENCRYPTED' : ' | 🔐 ENCRYPTED'}
                        </div>
                        <div class="item-actions">
                            ${shouldMaskThis ? 
                                `<button class="action-btn" onclick="window.mobileVault.showMobilePasswordAuth()">🔒 UNLOCK</button>` :
                                item.category === 'documents' ? 
                                    `<button class="action-btn" onclick="window.mobileVault.downloadDocument('${item.id}')">DOWNLOAD</button>` :
                                    `<button class="action-btn" onclick="window.mobileVault.viewMobileItem('${item.id}')">VIEW</button>`
                            }
                            ${!shouldMaskThis ? `<button class="action-btn" onclick="window.mobileVault.openMobileEditModal('${item.id}')">EDIT</button>` : ''}
                            ${!shouldMaskThis ? `<button class="action-btn delete-btn" onclick="window.mobileVault.deleteMobileItem('${item.id}')">DELETE</button>` : ''}
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
        // For mobile, we'll use a simple alert for now since we don't have the password panel in the new layout
        const password = prompt('Enter password vault access code:');
        if (password === 'PASSWORD###') {
            this.grantMobilePasswordAccess();
        } else if (password !== null) {
            alert('ACCESS DENIED - INVALID CREDENTIALS');
        }
    }

    grantMobilePasswordAccess() {
        this.passwordAccessGranted = true;
        if (this.currentCategory !== 'passwords') {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
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
    const errorMsg = document.getElementById('mobileError');
    
    if (password === 'OMEGA###') {
        errorMsg.style.display = 'none';
        document.getElementById('mobileLogin').style.display = 'none';
        document.getElementById('mobileMain').style.display = 'block';
    } else {
        errorMsg.style.display = 'block';
        document.getElementById('mobilePassword').value = '';
    }
}

function mobileLogout() {
    document.getElementById('mobileMain').style.display = 'none';
    document.getElementById('mobileVault').style.display = 'none';
    document.getElementById('mobileDevicePanel').style.display = 'none';
    document.getElementById('mobileFinancialsPanel').style.display = 'none';
    document.getElementById('mobileLogin').style.display = 'flex';
    document.getElementById('mobilePassword').value = '';
}

function openMobileVault() {
    document.getElementById('mobileMain').style.display = 'none';
    document.getElementById('mobileVault').style.display = 'block';
    
    // Always create new instance to ensure fresh data
    window.mobileVault = new MobileVaultPro();
    
    // Force data load after a short delay
    setTimeout(() => {
        if (window.mobileVault) {
            window.mobileVault.loadData().then(() => {
                window.mobileVault.renderItems();
            });
        }
    }, 100);
}

// Fullscreen functionality
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

function backToMobileMain() {
    document.getElementById('mobileVault').style.display = 'none';
    document.getElementById('mobileDevicePanel').style.display = 'none';
    document.getElementById('mobileFinancialsPanel').style.display = 'none';
    document.getElementById('mobileMain').style.display = 'block';
}

function openMobileFinancials() {
    document.getElementById('mobileMain').style.display = 'none';
    document.getElementById('mobileFinancialsPanel').style.display = 'block';
    loadMobileFinancials();
}

function loadMobileFinancials() {
    console.log('Loading mobile financials...');
    
    // Load cards from localStorage (same as desktop)
    const cards = JSON.parse(localStorage.getItem('vaultCards') || '[]');
    console.log('Found cards:', cards.length);
    
    const cardsList = document.getElementById('mobileCardsList');
    if (!cardsList) {
        console.error('mobileCardsList element not found');
        return;
    }
    
    if (cards.length === 0) {
        cardsList.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #888;">
                <div style="font-size: 32px; margin-bottom: 10px;">💳</div>
                <div>No cards stored</div>
                <div style="font-size: 8px; margin-top: 5px;">Add cards on desktop to see them here</div>
            </div>
        `;
    } else {
        cardsList.innerHTML = cards.map(card => `
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; padding: 15px; margin-bottom: 10px; color: white; position: relative; min-height: 80px;">
                <div style="position: absolute; top: 10px; right: 10px; font-size: 8px; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">${(card.category || 'DEBIT').toUpperCase()}</div>
                <div style="font-size: 10px; margin-bottom: 5px;">${card.company || 'BANK'}</div>
                <div style="font-size: 12px; font-weight: bold; margin-bottom: 5px;">**** **** **** ${card.number ? card.number.slice(-4) : '****'}</div>
                <div style="font-size: 9px;">${card.holder || 'CARDHOLDER'}</div>
                <div style="position: absolute; bottom: 10px; right: 10px; font-size: 8px;">${card.expiry || 'MM/YY'}</div>
            </div>
        `).join('');
    }
    
    // Update spend analysis
    const transactions = JSON.parse(localStorage.getItem('vaultTransactions') || '[]');
    console.log('Found transactions:', transactions.length);
    
    const total = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const thisMonth = transactions.filter(t => {
        const transDate = new Date(t.date);
        const now = new Date();
        return transDate.getMonth() === now.getMonth() && transDate.getFullYear() === now.getFullYear();
    }).reduce((sum, t) => sum + (t.amount || 0), 0);
    const lastTrans = transactions.length > 0 ? transactions[transactions.length - 1].amount || 0 : 0;
    
    const totalEl = document.getElementById('mobileTotalSpending');
    const monthlyEl = document.getElementById('mobileMonthlySpending');
    const lastEl = document.getElementById('mobileLastTransaction');
    
    if (totalEl) totalEl.textContent = `₹${total.toFixed(2)}`;
    if (monthlyEl) monthlyEl.textContent = `₹${thisMonth.toFixed(2)}`;
    if (lastEl) lastEl.textContent = `₹${lastTrans.toFixed(2)}`;
    
    console.log('Mobile financials loaded successfully');
}

function openMobileDeviceManager() {
    document.getElementById('mobileMain').style.display = 'none';
    document.getElementById('mobileDevicePanel').style.display = 'block';
    initializeMobileDeviceManager();
}

function initializeMobileDeviceManager() {
    fetch('/api/network-info')
        .then(response => response.json())
        .then(data => {
            let baseURL;
            if (data.networkIP) {
                baseURL = data.networkIP.includes('http') ? data.networkIP : `http://${data.networkIP}:3000`;
            } else {
                baseURL = window.location.origin;
            }
            
            document.getElementById('mobileDesktopLink').textContent = baseURL;
            document.getElementById('mobileTabletLink').textContent = `${baseURL}/tablet`;
        })
        .catch(error => {
            console.error('Error getting network info:', error);
            const fallbackURL = window.location.origin;
            document.getElementById('mobileDesktopLink').textContent = fallbackURL;
            document.getElementById('mobileTabletLink').textContent = `${fallbackURL}/tablet`;
        });
}

function copyMobileDesktopLink() {
    const link = document.getElementById('mobileDesktopLink').textContent;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(link).then(() => {
            showMobileNotification('Desktop link copied!');
        });
    } else {
        showMobileNotification('Desktop link: ' + link);
    }
}

function copyMobileTabletLink() {
    const link = document.getElementById('mobileTabletLink').textContent;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(link).then(() => {
            showMobileNotification('Tablet link copied!');
        });
    } else {
        showMobileNotification('Tablet link: ' + link);
    }
}

function openMobileAddModal() {
    // For mobile, use simple prompts for now
    const category = prompt('Enter category (documents/passwords/notes):', 'documents');
    if (!category) return;
    
    const title = prompt('Enter title:');
    if (!title) return;
    
    let content = '';
    if (category !== 'documents') {
        content = prompt('Enter content:');
        if (!content) return;
    }
    
    // Add the item
    if (window.mobileVault) {
        window.mobileVault.addItem(category, title, content);
    }
}

// Simplified mobile functions
function closeMobileItemPanel() {
    // Not needed in simplified mobile interface
}

function closeMobileViewPanel() {
    // Not needed in simplified mobile interface
}

function closeMobilePasswordAuth() {
    // Not needed in simplified mobile interface
}

function authenticateMobilePasswordAccess() {
    // Not needed in simplified mobile interface
}

async function saveMobileItem() {
    // Not needed in simplified mobile interface
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