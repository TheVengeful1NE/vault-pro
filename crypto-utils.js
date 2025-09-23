const crypto = require('crypto');

class CryptoUtils {
    constructor() {
        this.algorithm = 'aes-256-gcm';
        this.keyLength = 32;
        this.ivLength = 16;
        this.masterKey = this.deriveMasterKey();
    }

    // Derive master key from password
    deriveMasterKey() {
        const password = 'OMEGA###';
        const salt = 'VaultProSecureSalt2024';
        return crypto.pbkdf2Sync(password, salt, 100000, this.keyLength, 'sha256');
    }

    // Encrypt text data for database
    encryptText(text) {
        const iv = crypto.randomBytes(this.ivLength);
        const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const tag = cipher.getAuthTag();
        
        return {
            iv: iv.toString('hex'),
            tag: tag.toString('hex'),
            data: encrypted
        };
    }

    // Decrypt text data from database
    decryptText(encryptedData) {
        const iv = Buffer.from(encryptedData.iv, 'hex');
        const tag = Buffer.from(encryptedData.tag, 'hex');
        
        const decipher = crypto.createDecipheriv(this.algorithm, this.masterKey, iv);
        decipher.setAuthTag(tag);
        
        let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }

    // Encrypt file data
    encryptFile(data) {
        const iv = crypto.randomBytes(this.ivLength);
        const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);
        
        let encrypted = cipher.update(data);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        
        const tag = cipher.getAuthTag();
        
        return {
            iv: iv.toString('hex'),
            tag: tag.toString('hex'),
            data: encrypted.toString('hex')
        };
    }

    // Decrypt file data
    decryptFile(encryptedData) {
        const iv = Buffer.from(encryptedData.iv, 'hex');
        const tag = Buffer.from(encryptedData.tag, 'hex');
        const data = Buffer.from(encryptedData.data, 'hex');
        
        const decipher = crypto.createDecipheriv(this.algorithm, this.masterKey, iv);
        decipher.setAuthTag(tag);
        
        let decrypted = decipher.update(data);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        return decrypted;
    }

    // Generate secure filename
    generateSecureFilename(originalName) {
        const ext = require('path').extname(originalName);
        const hash = crypto.createHash('sha256').update(originalName + Date.now()).digest('hex');
        return `${hash}${ext}.enc`;
    }
}

module.exports = CryptoUtils;