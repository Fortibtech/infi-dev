const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Function to read .env file and convert to JSON
function envToJson() {
  try {
    // Get the root directory of the project
    const rootDir = path.resolve(__dirname, '..');
    const envPath = path.join(rootDir, '.env');

    // Check if .env file exists
    if (!fs.existsSync(envPath)) {
      console.error('Error: .env file not found');
      process.exit(1);
    }

    // Read and parse .env file
    const envConfig = dotenv.parse(fs.readFileSync(envPath));

    // Convert to JSON
    const jsonOutput = JSON.stringify(envConfig, null, 2);

    // Write to env.json file
    const jsonPath = path.join(rootDir, 'env.json');
    fs.writeFileSync(jsonPath, jsonOutput);

    console.log(
      'Environment variables have been successfully converted to JSON',
    );
    console.log(`JSON file created at: ${jsonPath}`);
    console.log('\nContent:');
    console.log(jsonOutput);
  } catch (error) {
    console.error('Error converting env to JSON:', error.message);
    process.exit(1);
  }
}

// Run the conversion
envToJson();
