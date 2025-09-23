const SecureDatabase = require('./database');
const SecureFileManager = require('./file-manager');

async function initializeVault() {
    console.log('Initializing Vault Pro secure storage...');
    
    try {
        // Initialize database
        const db = new SecureDatabase();
        await db.init();
        console.log('✓ SQLite database initialized with encryption');
        
        // Initialize file manager
        const fileManager = new SecureFileManager();
        await fileManager.init();
        console.log('✓ Encrypted file storage initialized');
        
        console.log('\nVault Pro Security Features:');
        console.log('- Documents: AES-256-GCM encrypted files in secure_data/documents/');
        console.log('- Passwords: Encrypted storage in SQLite database');
        console.log('- Secret Notes: Encrypted storage in SQLite database');
        console.log('- Master Key: Derived from OMEGA### password using PBKDF2');
        console.log('\nStorage locations:');
        console.log('- Database: secure_data/database/vault.db');
        console.log('- Documents: secure_data/documents/ (encrypted files)');
        
        db.close();
        console.log('\n✓ Initialization complete!');
        
    } catch (error) {
        console.error('✗ Initialization failed:', error);
        process.exit(1);
    }
}

initializeVault();