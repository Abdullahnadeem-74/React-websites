#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 Preparing to deploy the Investment App to Vercel...');

// Check if Vercel CLI is installed
try {
  execSync('vercel --version', { stdio: 'ignore' });
  console.log('✅ Vercel CLI is installed');
} catch (error) {
  console.log('❌ Vercel CLI is not installed. Installing...');
  try {
    execSync('npm install -g vercel', { stdio: 'inherit' });
    console.log('✅ Vercel CLI has been installed');
  } catch (installError) {
    console.error('❌ Failed to install Vercel CLI. Please install it manually with: npm install -g vercel');
    process.exit(1);
  }
}

// Check if user is logged in to Vercel
console.log('🔍 Checking if you are logged in to Vercel...');
try {
  execSync('vercel whoami', { stdio: 'ignore' });
  console.log('✅ You are logged in to Vercel');
} catch (error) {
  console.log('❌ You are not logged in to Vercel. Please login first:');
  try {
    execSync('vercel login', { stdio: 'inherit' });
  } catch (loginError) {
    console.error('❌ Failed to login to Vercel. Please try again later.');
    process.exit(1);
  }
}

rl.question('Do you want to deploy to production? (y/n): ', (answer) => {
  const isProd = answer.toLowerCase() === 'y';
  
  console.log('📦 Building the project...');
  try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Build completed successfully');
  } catch (buildError) {
    console.error('❌ Build failed. Please fix the errors and try again.');
    rl.close();
    process.exit(1);
  }
  
  console.log('🚀 Deploying to Vercel...');
  try {
    if (isProd) {
      execSync('vercel --prod', { stdio: 'inherit' });
    } else {
      execSync('vercel', { stdio: 'inherit' });
    }
    console.log('✅ Deployment successful!');
  } catch (deployError) {
    console.error('❌ Deployment failed. Please check the errors and try again.');
    rl.close();
    process.exit(1);
  }
  
  rl.close();
}); 