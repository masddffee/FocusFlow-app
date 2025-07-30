#!/usr/bin/env node

/**
 * Test Setup Validation Script
 * 
 * This script validates that the MCP integration test environment
 * is properly configured and ready to run.
 */

const fs = require('fs');
const path = require('path');

class TestSetupValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.backendDir = path.join(__dirname, '..');
    this.frontendDir = path.join(__dirname, '../..');
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m'
    };
    
    const symbols = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };
    
    console.log(`${colors[type]}${symbols[type]} ${message}${colors.reset}`);
  }

  checkFile(filePath, description, required = true) {
    if (fs.existsSync(filePath)) {
      this.log(`${description} exists`, 'success');
      return true;
    } else {
      const message = `${description} not found: ${filePath}`;
      if (required) {
        this.errors.push(message);
        this.log(message, 'error');
      } else {
        this.warnings.push(message);
        this.log(message, 'warning');
      }
      return false;
    }
  }

  checkDirectory(dirPath, description) {
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      this.log(`${description} directory exists`, 'success');
      return true;
    } else {
      const message = `${description} directory not found: ${dirPath}`;
      this.errors.push(message);
      this.log(message, 'error');
      return false;
    }
  }

  checkNodeModules() {
    const backendNodeModules = path.join(this.backendDir, 'node_modules');
    const frontendNodeModules = path.join(this.frontendDir, 'node_modules');
    
    this.checkDirectory(backendNodeModules, 'Backend node_modules');
    
    // Check for specific required packages
    const requiredPackages = ['axios', 'uuid', 'express', '@google/generative-ai'];
    for (const pkg of requiredPackages) {
      const pkgPath = path.join(backendNodeModules, pkg);
      this.checkDirectory(pkgPath, `Package ${pkg}`);
    }
  }

  checkPackageJson() {
    const packageJsonPath = path.join(this.backendDir, 'package.json');
    if (this.checkFile(packageJsonPath, 'Backend package.json')) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        // Check for test scripts
        if (packageJson.scripts) {
          if (packageJson.scripts['test:mcp']) {
            this.log('test:mcp script found', 'success');
          } else {
            this.warnings.push('test:mcp script not found in package.json');
            this.log('test:mcp script not found', 'warning');
          }
          
          if (packageJson.scripts['test:mcp-direct']) {
            this.log('test:mcp-direct script found', 'success');
          } else {
            this.warnings.push('test:mcp-direct script not found in package.json');
            this.log('test:mcp-direct script not found', 'warning');
          }
        }
        
        // Check dependencies
        const requiredDeps = ['axios', 'express', '@google/generative-ai', 'uuid'];
        for (const dep of requiredDeps) {
          if (packageJson.dependencies && packageJson.dependencies[dep]) {
            this.log(`Dependency ${dep} found`, 'success');
          } else {
            this.errors.push(`Required dependency ${dep} not found`);
            this.log(`Required dependency ${dep} not found`, 'error');
          }
        }
        
      } catch (error) {
        this.errors.push(`Failed to parse package.json: ${error.message}`);
        this.log(`Failed to parse package.json: ${error.message}`, 'error');
      }
    }
  }

  checkTestFiles() {
    const testFiles = [
      {
        path: path.join(__dirname, 'mcp-integration-test.js'),
        description: 'Main MCP integration test'
      },
      {
        path: path.join(__dirname, 'run-mcp-test.js'),
        description: 'MCP test runner'
      },
      {
        path: path.join(__dirname, 'README.md'),
        description: 'Test documentation'
      }
    ];
    
    for (const file of testFiles) {
      this.checkFile(file.path, file.description);
    }
  }

  checkBackendFiles() {
    const backendFiles = [
      {
        path: path.join(this.backendDir, 'index.js'),
        description: 'Backend entry point'
      },
      {
        path: path.join(this.backendDir, 'routes/ai_router.js'),
        description: 'AI router'
      },
      {
        path: path.join(this.backendDir, 'config/serverConfig.js'),
        description: 'Server configuration'
      },
      {
        path: path.join(this.backendDir, 'lib/services/jobQueueService.js'),
        description: 'Job queue service'
      },
      {
        path: path.join(this.backendDir, 'lib/services/geminiService.js'),
        description: 'Gemini service'
      }
    ];
    
    for (const file of backendFiles) {
      this.checkFile(file.path, file.description);
    }
  }

  checkFrontendFiles() {
    const frontendFiles = [
      {
        path: path.join(this.frontendDir, 'utils/api.ts'),
        description: 'Frontend API utilities',
        required: false
      },
      {
        path: path.join(this.frontendDir, 'config/appConfig.ts'),
        description: 'Frontend app configuration',
        required: false
      }
    ];
    
    for (const file of frontendFiles) {
      this.checkFile(file.path, file.description, file.required);
    }
  }

  checkEnvironmentVariables() {
    const requiredEnvVars = ['GEMINI_API_KEY'];
    const optionalEnvVars = ['NODE_ENV', 'PORT'];
    
    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        this.log(`Environment variable ${envVar} is set`, 'success');
      } else {
        this.warnings.push(`Environment variable ${envVar} is not set`);
        this.log(`Environment variable ${envVar} is not set`, 'warning');
      }
    }
    
    for (const envVar of optionalEnvVars) {
      if (process.env[envVar]) {
        this.log(`Optional environment variable ${envVar} is set: ${process.env[envVar]}`, 'info');
      }
    }
  }

  checkPortConfiguration() {
    // Check if any process is running on port 3000
    const { execSync } = require('child_process');
    
    try {
      // This command works on Unix-like systems
      const result = execSync('lsof -ti:3000', { encoding: 'utf8', stdio: 'pipe' });
      if (result.trim()) {
        this.log('Port 3000 is in use (backend may be running)', 'info');
      } else {
        this.log('Port 3000 is available', 'info');
      }
    } catch (error) {
      // Command failed, port is likely available or we can't check
      this.log('Could not check port 3000 status', 'info');
    }
  }

  createDirectories() {
    const dirsToCreate = [
      path.join(this.backendDir, 'test-results'),
      path.join(this.backendDir, 'test-results/screenshots')
    ];
    
    for (const dir of dirsToCreate) {
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
          this.log(`Created directory: ${dir}`, 'success');
        } catch (error) {
          this.warnings.push(`Failed to create directory ${dir}: ${error.message}`);
          this.log(`Failed to create directory ${dir}: ${error.message}`, 'warning');
        }
      } else {
        this.log(`Directory already exists: ${dir}`, 'success');
      }
    }
  }

  async validate() {
    this.log('🔍 Validating MCP Integration Test Setup', 'info');
    console.log('='.repeat(60));
    
    // Run all checks
    this.log('\n📁 Checking directories and files...', 'info');
    this.checkTestFiles();
    this.checkBackendFiles();
    this.checkFrontendFiles();
    
    this.log('\n📦 Checking package configuration...', 'info');
    this.checkPackageJson();
    this.checkNodeModules();
    
    this.log('\n🌍 Checking environment...', 'info');
    this.checkEnvironmentVariables();
    this.checkPortConfiguration();
    
    this.log('\n📁 Creating required directories...', 'info');
    this.createDirectories();
    
    // Summary
    console.log('\n' + '='.repeat(60));
    this.log('📊 Validation Summary', 'info');
    
    if (this.errors.length === 0) {
      this.log('✅ Setup validation passed! Ready to run MCP integration tests.', 'success');
      
      if (this.warnings.length > 0) {
        this.log(`\n⚠️  ${this.warnings.length} warnings found:`, 'warning');
        this.warnings.forEach(warning => {
          console.log(`   • ${warning}`);
        });
        this.log('\nThese warnings may affect test functionality but are not blocking.', 'warning');
      }
      
      this.log('\n🚀 To run the test:', 'info');
      this.log('   npm run test:mcp', 'info');
      this.log('   or: node tests/run-mcp-test.js', 'info');
      
      return true;
    } else {
      this.log(`❌ Setup validation failed! ${this.errors.length} errors found:`, 'error');
      this.errors.forEach(error => {
        console.log(`   • ${error}`);
      });
      
      if (this.warnings.length > 0) {
        this.log(`\n⚠️  ${this.warnings.length} additional warnings:`, 'warning');
        this.warnings.forEach(warning => {
          console.log(`   • ${warning}`);
        });
      }
      
      this.log('\n💡 Please fix these issues before running the integration test.', 'error');
      return false;
    }
  }
}

// Run validation if this file is executed directly
if (require.main === module) {
  const validator = new TestSetupValidator();
  validator.validate().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = TestSetupValidator;