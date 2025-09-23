const fs = require('fs').promises;
const path = require('path');
const CryptoUtils = require('./crypto-utils');

class SecureFileManager {
    constructor() {
        this.documentsPath = path.join(__dirname, 'secure_data', 'documents');
        this.crypto = new CryptoUtils();
        this.metadataFile = path.join(this.documentsPath, 'metadata.json');
    }

    // Initialize file manager
    async init() {
        try {
            await fs.access(this.documentsPath);
        } catch {
            await fs.mkdir(this.documentsPath, { recursive: true });
        }
        
        // Initialize metadata file if it doesn't exist
        try {
            await fs.access(this.metadataFile);
        } catch {
            await fs.writeFile(this.metadataFile, JSON.stringify({ documents: [] }, null, 2));
        }
    }

    // Load metadata
    async loadMetadata() {
        try {
            const data = await fs.readFile(this.metadataFile, 'utf8');
            return JSON.parse(data);
        } catch {
            return { documents: [] };
        }
    }

    // Save metadata
    async saveMetadata(metadata) {
        await fs.writeFile(this.metadataFile, JSON.stringify(metadata, null, 2));
    }

    // Save encrypted document
    async saveDocument(id, title, fileBuffer, originalName, mimeType) {
        const secureFilename = this.crypto.generateSecureFilename(originalName);
        const filePath = path.join(this.documentsPath, secureFilename);
        
        // Encrypt file data
        const encryptedData = this.crypto.encryptFile(fileBuffer);
        await fs.writeFile(filePath, JSON.stringify(encryptedData));
        
        // Update metadata
        const metadata = await this.loadMetadata();
        const documentEntry = {
            id,
            title,
            originalName,
            secureFilename,
            mimeType,
            size: fileBuffer.length,
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        };
        
        // Remove existing entry if updating
        metadata.documents = metadata.documents.filter(doc => doc.id !== id);
        metadata.documents.push(documentEntry);
        
        await this.saveMetadata(metadata);
        return documentEntry;
    }

    // Get all documents metadata
    async getDocuments() {
        const metadata = await this.loadMetadata();
        return metadata.documents.map(doc => ({
            id: doc.id,
            category: 'documents',
            title: doc.title,
            content: `File: ${doc.originalName}\nSize: ${this.formatFileSize(doc.size)}\nType: ${doc.mimeType}`,
            created: doc.created,
            modified: doc.modified,
            originalName: doc.originalName,
            mimeType: doc.mimeType,
            size: doc.size
        }));
    }

    // Get encrypted document data
    async getDocument(id) {
        const metadata = await this.loadMetadata();
        const doc = metadata.documents.find(d => d.id === id);
        
        if (!doc) {
            throw new Error('Document not found');
        }
        
        const filePath = path.join(this.documentsPath, doc.secureFilename);
        const encryptedData = JSON.parse(await fs.readFile(filePath, 'utf8'));
        const decryptedBuffer = this.crypto.decryptFile(encryptedData);
        
        return {
            buffer: decryptedBuffer,
            originalName: doc.originalName,
            mimeType: doc.mimeType
        };
    }

    // Delete document
    async deleteDocument(id) {
        const metadata = await this.loadMetadata();
        const doc = metadata.documents.find(d => d.id === id);
        
        if (doc) {
            // Delete encrypted file
            const filePath = path.join(this.documentsPath, doc.secureFilename);
            try {
                await fs.unlink(filePath);
            } catch (err) {
                console.error('Error deleting file:', err);
            }
            
            // Update metadata
            metadata.documents = metadata.documents.filter(d => d.id !== id);
            await this.saveMetadata(metadata);
        }
    }

    // Format file size for display
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

module.exports = SecureFileManager;