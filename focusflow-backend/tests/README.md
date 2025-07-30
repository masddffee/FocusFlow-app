# MCP Frontend-Backend Integration Test

This comprehensive test suite validates the complete frontend-backend integration for FocusFlow's Smart Generate functionality.

## Overview

The MCP (Model-Context-Protocol) Integration Test is designed to:

1. **Test Real Frontend-Backend API Integration** - Not just curl tests, but actual simulation of frontend API calls
2. **Validate Complete User Experience Flow** - From task input to AI-generated learning plans
3. **Verify Configuration System** - Tests both appConfig.ts and serverConfig.js integration
4. **Test Job Queue End-to-End** - Validates async job processing and polling mechanisms
5. **Validate Error Handling** - Tests edge cases and error scenarios
6. **Measure Performance** - Tracks response times and system efficiency

## Test Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Integration Test                     │
├─────────────────────────────────────────────────────────────┤
│  Frontend Module Simulator (FrontendModuleSimulator)       │
│  ├── Simulates utils/api.ts functions                      │
│  ├── Tests actual HTTP requests to backend                 │
│  └── Validates response formats and error handling         │
├─────────────────────────────────────────────────────────────┤
│  Test Phases:                                              │
│  1. System Health & Configuration Validation               │
│  2. Smart Generate Core Functionality                      │
│  3. Job Queue System Validation                            │
│  4. Error Handling & Edge Cases                            │
│  5. Performance & Load Testing                             │
├─────────────────────────────────────────────────────────────┤
│  Backend Services Tested:                                  │
│  ├── JobQueueService (async job processing)                │
│  ├── GeminiService (real AI API integration)               │
│  ├── Configuration System (unified config loading)         │
│  ├── Error Handling (validation, network, API errors)      │
│  └── Performance Monitoring (response times, efficiency)   │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

Before running the test, ensure:

1. **Backend Server is Running**
   ```bash
   cd focusflow-backend
   npm run dev
   ```
   Server should be accessible at `http://localhost:3000`

2. **Environment Variables Set**
   ```bash
   export GEMINI_API_KEY="your-actual-gemini-api-key"
   # Test uses real Gemini API, not mocked
   ```

3. **Dependencies Installed**
   ```bash
   npm install
   ```

## Running the Test

### Option 1: Using the Test Runner (Recommended)
```bash
npm run test:mcp
```

The test runner will:
- Check all prerequisites automatically
- Provide colored console output
- Display results summary
- Handle errors gracefully

### Option 2: Direct Execution
```bash
npm run test:mcp-direct
# or
node tests/mcp-integration-test.js
```

### Option 3: Manual Execution with Debug
```bash
cd tests
node mcp-integration-test.js
```

## Test Scenarios

### 1. Smart Generate Workflow Test
**Scenario**: Learning React Native Development
- **Input**: Title and description of learning goal
- **Process**: Job submission → polling → completion
- **Validation**: Result structure, AI content quality, timing

### 2. Configuration System Test
- **Frontend Config**: Validates appConfig.ts loading
- **Backend Config**: Validates serverConfig.js integration  
- **Port Consistency**: Ensures frontend calls correct backend port (3000)
- **CORS Setup**: Validates cross-origin request handling

### 3. Job Queue Mechanisms Test
- **Job Lifecycle**: pending → processing → completed/failed
- **Polling Efficiency**: Adaptive polling intervals
- **Status Transitions**: Validates state machine logic
- **Concurrent Handling**: Tests multiple job scenarios

### 4. Error Handling Test
- **Input Validation**: Empty/invalid parameters
- **Network Errors**: Connection failures, timeouts
- **API Errors**: Server errors, rate limiting
- **Graceful Degradation**: Fallback mechanisms

### 5. Performance Testing
- **Response Times**: Measures API call latencies
- **Resource Usage**: Memory and CPU efficiency
- **Throughput**: Concurrent request handling
- **Data Format**: Frontend-backend compatibility

## Test Output

### Console Output
```
🚀 Starting MCP Frontend-Backend Integration Test
================================================================================

📋 Phase 1: System Health and Configuration Validation
------------------------------------------------------------
✅ [156ms] Backend Health Check
   💬 Backend is healthy (156ms)
✅ [89ms] Port Configuration  
   💬 Backend running on correct port (3000)
✅ [45ms] CORS Configuration
   💬 CORS headers are properly configured

🧠 Phase 2: Smart Generate Core Functionality
------------------------------------------------------------
✅ [234ms] Job Submission
   💬 Job submitted successfully (234ms)
   📊 [PROCESSING] 正在分析您的任務並規劃完整的學習路徑...
   📊 [PROCESSING] 正在生成個人化學習問題...
   📊 [COMPLETED] 處理完成！結果已準備就緒。
✅ [12847ms] Job Processing
   💬 Job completed successfully (12847ms)
✅ [67ms] Gemini API Integration
   💬 Real Gemini API integration working correctly

... (additional phases)
```

### Results File
Test results are saved to: `focusflow-backend/test-results/mcp-integration-test-results.json`

```json
{
  "testSummary": {
    "totalDuration": 15432,
    "totalSteps": 18,
    "successfulSteps": 17,
    "failedSteps": 1,
    "successRate": "94%",
    "timestamp": "2025-01-20T10:30:45.123Z"
  },
  "performanceMetrics": {
    "healthCheckResponseTime": 156,
    "jobSubmissionTime": 234,
    "jobCompletionTime": 12847
  },
  "networkRequests": [
    {
      "url": "http://localhost:3000/api/health-check",
      "method": "GET",
      "duration": 156,
      "status": 200,
      "timestamp": "2025-01-20T10:30:45.123Z"
    }
    // ... more requests
  ],
  "jobStatusHistory": [
    {
      "jobId": "uuid-here",
      "status": "pending",
      "progress": { "stage": "queued", "percentage": 0 },
      "pollCount": 0,
      "timestamp": 1642678245123
    }
    // ... status progression
  ]
}
```

## Understanding Test Results

### Success Criteria
- ✅ **Health Check**: Backend responds within 5 seconds
- ✅ **Configuration**: Ports and settings are consistent
- ✅ **Job Processing**: Smart Generate completes successfully
- ✅ **Response Times**: Average < 3 seconds for API calls
- ✅ **Error Handling**: Proper validation and error messages
- ✅ **Data Format**: Frontend-backend compatibility

### Performance Grades
- **A+**: < 500ms average response time
- **A**: < 1000ms average response time  
- **B**: < 2000ms average response time
- **C**: < 3000ms average response time
- **D**: > 3000ms average response time

### Common Issues and Solutions

#### Backend Not Running
```
❌ Backend is not running or not healthy
💡 To start the backend:
   cd focusflow-backend
   npm run dev
```

#### Missing API Key
```
⚠️ Warning: Missing environment variables:
   GEMINI_API_KEY
   Some tests may fail without proper API keys
```

#### Port Configuration Issues
```
❌ Port Configuration validation failed
Check appConfig.ts and serverConfig.js for port consistency
```

## Integration with CI/CD

The test can be integrated into continuous integration pipelines:

```yaml
# .github/workflows/integration-test.yml
- name: Run MCP Integration Test
  run: |
    export GEMINI_API_KEY=${{ secrets.GEMINI_API_KEY }}
    npm run backend &
    sleep 10  # Wait for backend to start
    npm run test:mcp
```

## Development Workflow

1. **Before Committing**: Run integration test to ensure no regressions
2. **After API Changes**: Validate frontend-backend compatibility
3. **Performance Monitoring**: Track response time trends
4. **Error Scenarios**: Test edge cases and error handling

## Extending the Test

To add new test scenarios:

1. **Add to TEST_CONFIG.scenarios**:
   ```javascript
   newScenario: {
     title: 'New Test Case',
     description: 'Test description',
     // ... parameters
   }
   ```

2. **Create Test Method**:
   ```javascript
   async testNewFeature() {
     // Test implementation
   }
   ```

3. **Add to Test Suite**:
   ```javascript
   await this.testNewFeature();
   ```

## Troubleshooting

### Test Hangs on Job Polling
- Check if Gemini API key is valid
- Verify backend job queue is processing
- Check for network connectivity issues

### Network Errors
- Ensure backend is running on port 3000
- Check firewall/proxy settings
- Verify CORS configuration

### Performance Issues
- Monitor system resources during test
- Check for memory leaks in job queue
- Verify Gemini API rate limits

## Related Files

- `mcp-integration-test.js` - Main test implementation
- `run-mcp-test.js` - Test runner with prerequisites checking
- `../routes/ai_router.js` - Backend API endpoints being tested
- `../../utils/api.ts` - Frontend API functions being simulated
- `../../config/appConfig.ts` - Frontend configuration
- `../config/serverConfig.js` - Backend configuration

## Support

For issues with the integration test:
1. Check the generated results file for detailed error information
2. Review console output for specific error messages
3. Verify all prerequisites are met
4. Check backend logs for server-side issues