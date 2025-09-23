const SecureDatabase = require('./database');

async function testPasswordSaving() {
    console.log('Testing password saving functionality...');
    
    try {
        const db = new SecureDatabase();
        await db.init();
        
        // Test saving a password
        const testId = Date.now().toString();
        const testTitle = 'Test Password Entry';
        const testContent = 'Username: testuser\nPassword: testpass123';
        const created = new Date().toISOString();
        const modified = new Date().toISOString();
        
        console.log('Saving test password...');
        await db.savePassword(testId, testTitle, testContent, created, modified);
        console.log('✓ Password saved successfully');
        
        // Test retrieving passwords
        console.log('Retrieving passwords...');
        const passwords = await db.getPasswords();
        console.log(`✓ Retrieved ${passwords.length} password(s)`);
        
        if (passwords.length > 0) {
            console.log('Latest password:');
            console.log(`- ID: ${passwords[0].id}`);
            console.log(`- Title: ${passwords[0].title}`);
            console.log(`- Content: ${passwords[0].content}`);
            console.log(`- Category: ${passwords[0].category}`);
        }
        
        // Clean up test data
        await db.deletePassword(testId);
        console.log('✓ Test data cleaned up');
        
        db.close();
        console.log('\n✓ Password functionality test completed successfully!');
        
    } catch (error) {
        console.error('✗ Test failed:', error);
        process.exit(1);
    }
}

testPasswordSaving();