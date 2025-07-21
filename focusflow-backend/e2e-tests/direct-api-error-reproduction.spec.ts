import { test, expect } from '@playwright/test';

// Direct API Error Reproduction Test
// This test directly calls the API endpoints to isolate the JSON parsing error
test.describe('Direct API JSON Error Reproduction', () => {
  const BASE_URL = 'http://localhost:8080/api';

  test('Direct API Test: Empty Description vs Description with Text', async ({ page }) => {
    console.log('🔬 Starting Direct API Test for JSON Error Reproduction');

    // Test Case A: Empty Description
    await test.step('Test Case A: Empty Description (Expected Success)', async () => {
      console.log('🟢 Testing with EMPTY description');
      
      const requestPayloadA = {
        type: "learning_plan",
        params: {
          title: "測試任務",
          description: "", // Empty description
          language: "en",
          taskType: "skill_learning",
          currentProficiency: "beginner",
          targetProficiency: "intermediate"
        },
        options: {}
      };

      console.log('📤 Sending API request A:', JSON.stringify(requestPayloadA, null, 2));

      // Make API request
      const responseA = await page.request.post(`${BASE_URL}/jobs`, {
        data: requestPayloadA,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('📥 Response A Status:', responseA.status());
      
      const responseBodyA = await responseA.text();
      console.log('📄 Response A Body:', responseBodyA);

      // Verify response is valid JSON
      try {
        const parsedResponseA = JSON.parse(responseBodyA);
        console.log('✅ Case A: JSON parsing successful');
        console.log('📋 Parsed Response A:', JSON.stringify(parsedResponseA, null, 2));
        
        if (parsedResponseA.jobId) {
          console.log(`🆔 Job ID A: ${parsedResponseA.jobId}`);
          
          // Poll for completion
          let jobCompleted = false;
          let pollCount = 0;
          const maxPolls = 30;
          
          while (!jobCompleted && pollCount < maxPolls) {
            await page.waitForTimeout(2000);
            pollCount++;
            
            const pollResponse = await page.request.get(`${BASE_URL}/jobs/${parsedResponseA.jobId}`);
            const pollBody = await pollResponse.text();
            
            console.log(`📊 Poll ${pollCount} for Job A - Status: ${pollResponse.status()}`);
            
            try {
              const pollData = JSON.parse(pollBody);
              console.log(`🔄 Job A Status: ${pollData.status}`);
              
              if (pollData.status === 'completed') {
                jobCompleted = true;
                console.log('✅ Job A completed successfully');
                console.log('📋 Final Result A:', JSON.stringify(pollData.result, null, 2));
              } else if (pollData.status === 'failed') {
                console.log('❌ Job A failed');
                console.log('🚨 Error A:', pollData.error);
                break;
              }
            } catch (error) {
              console.log('❌ JSON parsing error in poll response A:', error.message);
              console.log('📄 Raw poll response A:', pollBody);
              break;
            }
          }
        }
      } catch (error) {
        console.log('❌ Case A: JSON parsing failed:', error.message);
        console.log('📄 Raw response A that failed to parse:', responseBodyA);
      }
    });

    // Test Case B: Description with Text
    await test.step('Test Case B: Description with Text (Expected to trigger error)', async () => {
      console.log('🔴 Testing with DESCRIPTION text');
      
      const requestPayloadB = {
        type: "learning_plan",
        params: {
          title: "測試任務",
          description: "這是一個簡單的描述文字，用來測試是否會觸發JSON解析錯誤", // Description with text
          language: "en",
          taskType: "skill_learning",
          currentProficiency: "beginner",
          targetProficiency: "intermediate"
        },
        options: {}
      };

      console.log('📤 Sending API request B:', JSON.stringify(requestPayloadB, null, 2));

      // Make API request
      const responseB = await page.request.post(`${BASE_URL}/jobs`, {
        data: requestPayloadB,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('📥 Response B Status:', responseB.status());
      
      const responseBodyB = await responseB.text();
      console.log('📄 Response B Body:', responseBodyB);

      // Verify response is valid JSON
      try {
        const parsedResponseB = JSON.parse(responseBodyB);
        console.log('✅ Case B: JSON parsing successful');
        console.log('📋 Parsed Response B:', JSON.stringify(parsedResponseB, null, 2));
        
        if (parsedResponseB.jobId) {
          console.log(`🆔 Job ID B: ${parsedResponseB.jobId}`);
          
          // Poll for completion
          let jobCompleted = false;
          let pollCount = 0;
          const maxPolls = 30;
          
          while (!jobCompleted && pollCount < maxPolls) {
            await page.waitForTimeout(2000);
            pollCount++;
            
            const pollResponse = await page.request.get(`${BASE_URL}/jobs/${parsedResponseB.jobId}`);
            const pollBody = await pollResponse.text();
            
            console.log(`📊 Poll ${pollCount} for Job B - Status: ${pollResponse.status()}`);
            console.log(`📄 Poll response B preview: ${pollBody.substring(0, 200)}...`);
            
            try {
              const pollData = JSON.parse(pollBody);
              console.log(`🔄 Job B Status: ${pollData.status}`);
              
              if (pollData.status === 'completed') {
                jobCompleted = true;
                console.log('✅ Job B completed successfully');
                console.log('📋 Final Result B:', JSON.stringify(pollData.result, null, 2));
              } else if (pollData.status === 'failed') {
                console.log('❌ Job B failed');
                console.log('🚨 Error B:', pollData.error);
                break;
              }
            } catch (error) {
              console.log('🚨 FOUND IT! JSON parsing error in poll response B:', error.message);
              console.log('📄 Raw poll response B that failed to parse:', pollBody);
              console.log('🔍 Response length:', pollBody.length);
              console.log('🔍 Response starts with:', pollBody.substring(0, 50));
              console.log('🔍 Response ends with:', pollBody.substring(pollBody.length - 50));
              
              // Check if response is truncated
              if (!pollBody.startsWith('{') && !pollBody.startsWith('[')) {
                console.log('⚠️ Response does not start with JSON bracket');
              }
              if (!pollBody.endsWith('}') && !pollBody.endsWith(']')) {
                console.log('⚠️ Response does not end with JSON bracket');
              }
              
              // This is the error we're looking for!
              console.log('🎯 SUCCESS: Reproduced the JSON parsing error!');
              break;
            }
          }
        }
      } catch (error) {
        console.log('❌ Case B: JSON parsing failed:', error.message);
        console.log('📄 Raw response B that failed to parse:', responseBodyB);
      }
    });

    // Comparative Analysis
    await test.step('Generate Comparative Analysis', async () => {
      console.log('📊 COMPARATIVE ANALYSIS COMPLETE');
      console.log('🔍 Key Findings:');
      console.log('  1. Both scenarios should be tested to identify when JSON parsing fails');
      console.log('  2. Error likely occurs during polling phase, not initial request');
      console.log('  3. May be related to response truncation or malformed JSON from backend');
      console.log('  4. Description field presence may affect AI processing and response format');
    });
  });
});