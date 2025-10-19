#!/usr/bin/env node

/**
 * MCP Integration Test Runner
 * 
 * This script provides an easy way to run the MCP frontend-backend integration test
 * with proper environment setup and configuration validation.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

// ANSI color codes for better console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

class MCPTestRunner {
  constructor() {
    this.backendUrl = 'http://127.0.0.1:3000'; // 🔧 修復：使用 IPv4 地址
    this.testScript = path.join(__dirname, 'mcp-integration-test.js');
    this.resultDir = path.join(__dirname, '../test-results');
  }

  log(message, color = 'white') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async checkPrerequisites() {
    this.log('\n🔍 Checking Prerequisites...', 'cyan');
    
    // Check if backend is running
    try {
      const response = await axios.get(`${this.backendUrl}/api/health-check`, {
        timeout: 5000
      });
      
      if (response.status === 200 && response.data.status === 'healthy') {
        this.log('✅ Backend is running and healthy', 'green');
        
        // Display backend info
        if (response.data.services) {
          this.log(`   Gemini API: ${response.data.services.gemini}`, 'white');
          this.log(`   Cache Service: ${response.data.services.cache}`, 'white');
          this.log(`   Job Queue: ${response.data.services.jobQueue}`, 'white');
        }
      } else {
        throw new Error('Backend health check failed');
      }
    } catch (error) {
      this.log('❌ Backend is not running or not healthy', 'red');
      this.log(`   Error: ${error.message}`, 'red');
      this.log('\n💡 To start the backend:', 'yellow');
      this.log('   cd focusflow-backend', 'yellow');
      this.log('   npm run dev', 'yellow');
      return false;
    }

    // Check if test script exists
    if (!fs.existsSync(this.testScript)) {
      this.log('❌ Test script not found', 'red');
      this.log(`   Expected location: ${this.testScript}`, 'red');
      return false;
    }

    // Check environment variables - 加載父目錄的 .env 文件
    require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
    
    const requiredEnvVars = ['GEMINI_API_KEY'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      this.log('⚠️  Warning: Missing environment variables:', 'yellow');
      missingVars.forEach(varName => {
        this.log(`   ${varName}`, 'yellow');
      });
      this.log('   Some tests may fail without proper API keys', 'yellow');
    } else {
      this.log('✅ Environment variables are set', 'green');
      this.log(`   GEMINI_API_KEY: ${process.env.GEMINI_API_KEY.substring(0, 10)}...`, 'green');
    }

    // Ensure result directory exists
    if (!fs.existsSync(this.resultDir)) {
      fs.mkdirSync(this.resultDir, { recursive: true });
      this.log('📁 Created test results directory', 'blue');
    }

    return true;
  }

  async runTest() {
    this.log('\n🚀 Starting MCP Integration Test...', 'cyan');
    this.log('='.repeat(60), 'cyan');

    return new Promise((resolve, reject) => {
      const testProcess = spawn('node', [this.testScript], {
        stdio: 'inherit',
        env: { ...process.env }
      });

      testProcess.on('close', (code) => {
        if (code === 0) {
          this.log('\n🎉 Test completed successfully!', 'green');
          resolve(true);
        } else {
          this.log(`\n💥 Test failed with exit code: ${code}`, 'red');
          resolve(false);
        }
      });

      testProcess.on('error', (error) => {
        this.log(`\n🚨 Test execution error: ${error.message}`, 'red');
        reject(error);
      });
    });
  }

  async displayResults() {
    const resultFile = path.join(this.resultDir, 'mcp-integration-test-results.json');
    
    if (fs.existsSync(resultFile)) {
      try {
        const results = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
        
        this.log('\n📊 Test Results Summary:', 'cyan');
        this.log('-'.repeat(40), 'cyan');
        
        const summary = results.testSummary;
        this.log(`Total Duration: ${summary.totalDuration}ms`, 'white');
        this.log(`Total Steps: ${summary.totalSteps}`, 'white');
        this.log(`Successful: ${summary.successfulSteps}`, 'green');
        this.log(`Failed: ${summary.failedSteps}`, summary.failedSteps > 0 ? 'red' : 'white');
        
        const successRate = Math.round((summary.successfulSteps / summary.totalSteps) * 100);
        const successColor = successRate >= 80 ? 'green' : successRate >= 60 ? 'yellow' : 'red';
        this.log(`Success Rate: ${successRate}%`, successColor);

        if (results.performanceMetrics && Object.keys(results.performanceMetrics).length > 0) {
          this.log('\n⚡ Performance Metrics:', 'cyan');
          Object.entries(results.performanceMetrics).forEach(([key, value]) => {
            this.log(`   ${key}: ${value}ms`, 'white');
          });
        }

        if (results.errorLog && results.errorLog.length > 0) {
          this.log('\n🚨 Errors:', 'red');
          results.errorLog.forEach(error => {
            this.log(`   [${error.step}] ${error.error}`, 'red');
          });
        }

        this.log(`\n📝 Full results: ${resultFile}`, 'blue');
        
      } catch (error) {
        this.log(`⚠️  Could not parse results file: ${error.message}`, 'yellow');
      }
    } else {
      this.log('⚠️  No results file found', 'yellow');
    }
  }

  async run() {
    this.log('🔬 MCP Frontend-Backend Integration Test Runner', 'bright');
    this.log(`🕒 Started at: ${new Date().toISOString()}`, 'white');
    
    try {
      // Check prerequisites
      const prereqsPassed = await this.checkPrerequisites();
      if (!prereqsPassed) {
        process.exit(1);
      }

      // Run the test
      const testPassed = await this.runTest();
      
      // Display results
      await this.displayResults();
      
      // Exit with appropriate code
      process.exit(testPassed ? 0 : 1);
      
    } catch (error) {
      this.log(`\n💥 Runner failed: ${error.message}`, 'red');
      process.exit(1);
    }
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🔬 MCP Frontend-Backend Integration Test Runner

Usage: node run-mcp-test.js [options]

Options:
  --help, -h     Show this help message
  --version, -v  Show version information

Prerequisites:
  1. Backend server running on http://localhost:3000
  2. GEMINI_API_KEY environment variable set
  3. Node.js and npm installed

Examples:
  node run-mcp-test.js
  npm run test:mcp

The test will:
  ✅ Validate system health and configuration
  ✅ Test Smart Generate workflow end-to-end
  ✅ Verify job queue polling mechanisms
  ✅ Test error handling and edge cases
  ✅ Measure performance metrics
  ✅ Generate comprehensive report
`);
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log('MCP Integration Test Runner v1.0.0');
    process.exit(0);
  }

  const runner = new MCPTestRunner();
  runner.run();
}

module.exports = MCPTestRunner;