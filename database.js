const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const CryptoUtils = require('./crypto-utils');

class SecureDatabase {
    constructor() {
        this.dbPath = path.join(__dirname, 'secure_data', 'database', 'vault.db');
        this.crypto = new CryptoUtils();
        this.db = null;
    }

    // Initialize database connection
    async init() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }

    // Create necessary tables
    async createTables() {
        return new Promise((resolve, reject) => {
            const createPasswordsTable = `
                CREATE TABLE IF NOT EXISTS passwords (
                    id TEXT PRIMARY KEY,
                    title_encrypted TEXT NOT NULL,
                    content_encrypted TEXT NOT NULL,
                    created TEXT NOT NULL,
                    modified TEXT NOT NULL
                )
            `;

            const createNotesTable = `
                CREATE TABLE IF NOT EXISTS secret_notes (
                    id TEXT PRIMARY KEY,
                    title_encrypted TEXT NOT NULL,
                    content_encrypted TEXT NOT NULL,
                    created TEXT NOT NULL,
                    modified TEXT NOT NULL
                )
            `;

            this.db.serialize(() => {
                this.db.run(createPasswordsTable);
                this.db.run(createNotesTable, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });
    }

    // Save password entry
    async savePassword(id, title, content, created, modified) {
        const encryptedTitle = JSON.stringify(this.crypto.encryptText(title));
        const encryptedContent = JSON.stringify(this.crypto.encryptText(content));

        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO passwords 
                (id, title_encrypted, content_encrypted, created, modified) 
                VALUES (?, ?, ?, ?, ?)
            `);
            
            stmt.run([id, encryptedTitle, encryptedContent, created, modified], (err) => {
                if (err) reject(err);
                else resolve();
            });
            stmt.finalize();
        });
    }

    // Save secret note entry
    async saveSecretNote(id, title, content, created, modified) {
        const encryptedTitle = JSON.stringify(this.crypto.encryptText(title));
        const encryptedContent = JSON.stringify(this.crypto.encryptText(content));

        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO secret_notes 
                (id, title_encrypted, content_encrypted, created, modified) 
                VALUES (?, ?, ?, ?, ?)
            `);
            
            stmt.run([id, encryptedTitle, encryptedContent, created, modified], (err) => {
                if (err) reject(err);
                else resolve();
            });
            stmt.finalize();
        });
    }

    // Get all passwords
    async getPasswords() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM passwords ORDER BY created DESC', (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const decryptedRows = rows.map(row => ({
                        id: row.id,
                        category: 'passwords',
                        title: this.crypto.decryptText(JSON.parse(row.title_encrypted)),
                        content: this.crypto.decryptText(JSON.parse(row.content_encrypted)),
                        created: row.created,
                        modified: row.modified
                    }));
                    resolve(decryptedRows);
                }
            });
        });
    }

    // Get all secret notes
    async getSecretNotes() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM secret_notes ORDER BY created DESC', (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const decryptedRows = rows.map(row => ({
                        id: row.id,
                        category: 'notes',
                        title: this.crypto.decryptText(JSON.parse(row.title_encrypted)),
                        content: this.crypto.decryptText(JSON.parse(row.content_encrypted)),
                        created: row.created,
                        modified: row.modified
                    }));
                    resolve(decryptedRows);
                }
            });
        });
    }

    // Delete password
    async deletePassword(id) {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM passwords WHERE id = ?', [id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    // Delete secret note
    async deleteSecretNote(id) {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM secret_notes WHERE id = ?', [id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    // Close database connection
    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

module.exports = SecureDatabase;