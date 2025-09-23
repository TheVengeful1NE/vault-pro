// Tablet Vault Pro Interface
class TabletVault {
    constructor() {
        this.currentCategory = 'all';
        this.data = { items: [] };
        this.passwordAccessGranted = false;
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.renderItems();
        this.connectDevice();
    }

    setupEventListeners() {
        // Category buttons
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.target.dataset.category;
                
                if (category === 'passwords' && !this.passwordAccessGranted) {
                    this.requestPasswordAuth();
                    return;
                }
                
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentCategory = category;
                this.renderItems();
            });
        });

        // Enter key for login
        document.getElementById('tabletPassword').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                tabletAuthenticate();
            }
        });
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

    async connectDevice() {
        const deviceInfo = {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            timestamp: new Date().toISOString(),
            type: 'tablet',
            isTablet: true,
            screenInfo: {
                width: window.screen.width,
                height: window.screen.height
            },
            touchSupport: 'ontouchstart' in window,
            language: navigator.language
        };
        
        try {
            await fetch('/api/device-connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(deviceInfo)
            });
        } catch (error) {
            console.error('Error connecting device:', error);
        }
    }

    getFilteredItems() {
        if (this.currentCategory === 'all') {
            return this.data.items;
        }
        return this.data.items.filter(item => item.category === this.currentCategory);
    }

    renderItems() {
        const itemsList = document.getElementById('tabletItemsList');
        const items = this.getFilteredItems();
        
        // Update category title and count
        const categoryTitle = document.getElementById('categoryTitle');
        const itemCount = document.getElementById('itemCount');
        
        categoryTitle.textContent = this.currentCategory === 'all' ? 'ALL ITEMS' : this.currentCategory.toUpperCase();
        itemCount.textContent = `${items.length} item${items.length !== 1 ? 's' : ''}`;
        
        if (items.length === 0) {
            itemsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔒</div>
                    <div class="empty-text">No items in this category</div>
                    <div class="empty-subtext">Click "ADD NEW ITEM" to get started</div>
                </div>
            `;
            return;
        }

        itemsList.innerHTML = items.map(item => {
            const isPassword = item.category === 'passwords';
            const shouldMask = isPassword && !this.passwordAccessGranted;
            
            return `
                <div class="item-card">
                    <div class="item-title ${shouldMask ? 'password-masked' : ''}">
                        ${shouldMask ? this.maskText(item.title) : this.escapeHtml(item.title)}
                    </div>
                    <div class="item-content ${shouldMask ? 'password-masked' : ''}">
                        ${shouldMask ? this.maskText(item.content) : 
                          this.escapeHtml(item.content).substring(0, 300)}${item.content.length > 300 ? '...' : ''}
                    </div>
                    <div class="item-meta">
                        Category: ${item.category.toUpperCase()} | Created: ${new Date(item.created).toLocaleDateString()}
                        ${item.category === 'documents' ? ' | 🔒 ENCRYPTED FILE' : ' | 🔐 ENCRYPTED DATA'}
                    </div>
                    <div class="item-actions">
                        ${shouldMask ? 
                            `<button class="action-btn" onclick="tabletVault.requestPasswordAuth()">🔒 UNLOCK ACCESS</button>` :
                            item.category === 'documents' ? 
                                `<button class="action-btn" onclick="tabletVault.downloadDocument('${item.id}')">📥 DOWNLOAD</button>` :
                                `<button class="action-btn" onclick="tabletVault.viewItem('${item.id}')">👁️ VIEW</button>`
                        }
                        ${!shouldMask ? `<button class="action-btn" onclick="tabletVault.editItem('${item.id}')">✏️ EDIT</button>` : ''}
                        ${!shouldMask ? `<button class="action-btn delete-btn" onclick="tabletVault.deleteItem('${item.id}')">🗑️ DELETE</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    viewItem(id) {
        const item = this.data.items.find(item => item.id === id);
        if (item) {
            alert(`TITLE: ${item.title}\n\nCONTENT:\n${item.content}\n\nCREATED: ${new Date(item.created).toLocaleString()}`);
        }
    }

    downloadDocument(id) {
        window.open(`/api/documents/${id}`, '_blank');
    }

    editItem(id) {
        alert('Edit functionality - redirect to main interface for full editing capabilities');
    }

    async deleteItem(id) {
        if (confirm('Are you sure you want to delete this item?')) {
            try {
                const item = this.data.items.find(item => item.id === id);
                if (item) {
                    await fetch(`/api/items/${id}?category=${item.category}`, { method: 'DELETE' });
                    await this.loadData();
                    this.renderItems();
                    this.showNotification('Item deleted successfully');
                }
            } catch (error) {
                console.error('Error deleting item:', error);
                this.showNotification('Error deleting item', 'error');
            }
        }
    }

    requestPasswordAuth() {
        const password = prompt('Enter password access code:');
        if (password === 'PASSWORD###') {
            this.passwordAccessGranted = true;
            this.showNotification('Password access granted');
            
            // Switch to passwords category
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('[data-category="passwords"]').classList.add('active');
            this.currentCategory = 'passwords';
            this.renderItems();
        } else if (password !== null) {
            this.showNotification('Access denied - invalid credentials', 'error');
        }
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

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            left: 20px;
            background: ${type === 'error' ? 'rgba(233, 69, 96, 0.9)' : 'rgba(0, 255, 65, 0.9)'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
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
        }, 4000);
        
        notification.addEventListener('click', () => {
            notification.remove();
        });
    }
}

// Global functions
function tabletAuthenticate() {
    const password = document.getElementById('tabletPassword').value;
    const errorMsg = document.getElementById('tabletError');
    
    if (password === 'OMEGA###') {
        errorMsg.style.display = 'none';
        document.getElementById('tabletLogin').style.display = 'none';
        document.getElementById('tabletContainer').style.display = 'flex';
        
        // Initialize tablet vault
        window.tabletVault = new TabletVault();
    } else {
        errorMsg.style.display = 'block';
        document.getElementById('tabletPassword').value = '';
    }
}

function tabletLogout() {
    document.getElementById('tabletContainer').style.display = 'none';
    document.getElementById('tabletLogin').style.display = 'flex';
    document.getElementById('tabletPassword').value = '';
}

function showAddForm() {
    alert('Add new item - redirect to main interface for full form capabilities');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('tabletPassword').focus();
});