const fs = require('fs');
const path = require('path');

function updateWebhookSecret() {
  console.log('🔧 Updating webhook secret in .env file...\n');
  
  const webhookSecret = 'whsec_f423deee6da13c9a6578845829bb52354b7e45d541bc2cf700dbffd6a6121cc0';
  const envPath = path.join(process.cwd(), '.env');
  
  try {
    // Read current .env file
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Check if STRIPE_WEBHOOK_SECRET already exists
    const lines = envContent.split('\n');
    let found = false;
    
    const updatedLines = lines.map(line => {
      if (line.startsWith('STRIPE_WEBHOOK_SECRET=')) {
        found = true;
        return `STRIPE_WEBHOOK_SECRET=${webhookSecret}`;
      }
      return line;
    });
    
    // If not found, add it
    if (!found) {
      updatedLines.push(`STRIPE_WEBHOOK_SECRET=${webhookSecret}`);
    }
    
    // Write back to file
    fs.writeFileSync(envPath, updatedLines.join('\n'));
    
    console.log('✅ Webhook secret updated successfully!');
    console.log(`   Secret: ${webhookSecret}`);
    console.log('\n🔄 Please restart your development server for changes to take effect.');
    
  } catch (error) {
    console.error('❌ Failed to update .env file:', error.message);
    console.log('\n📝 Manual instructions:');
    console.log('1. Open your .env file');
    console.log('2. Add or update this line:');
    console.log(`   STRIPE_WEBHOOK_SECRET=${webhookSecret}`);
    console.log('3. Save the file');
    console.log('4. Restart your development server');
  }
}

updateWebhookSecret(); 