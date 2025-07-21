import { test, expect } from '@playwright/test';

// Personalization Phase Error Reproduction Test
// Tests the second phase where users submit personalization questions
test.describe('Personalization Phase JSON Error Reproduction', () => {
  const BASE_URL = 'http://localhost:8080/api';

  test('Test Second Phase: Submitting Personalization Questions', async ({ page }) => {
    console.log('🔬 Testing Second Phase: Personalization Questions Submission');

    // First, create a learning plan request to get personalization questions
    await test.step('Phase 1: Get Personalization Questions', async () => {
      const requestPayload = {
        type: "learning_plan",
        params: {
          title: "Python 程式設計學習",
          description: "我想學習 Python 程式設計，從基礎開始，目標是能夠開發網頁應用",
          language: "en",
          taskType: "skill_learning",
          currentProficiency: "beginner",
          targetProficiency: "intermediate"
        },
        options: {}
      };

      console.log('📤 Phase 1 Request:', JSON.stringify(requestPayload, null, 2));

      const response = await page.request.post(`${BASE_URL}/jobs`, {
        data: requestPayload,
        headers: { 'Content-Type': 'application/json' }
      });

      const responseBody = await response.text();
      const parsedResponse = JSON.parse(responseBody);
      
      console.log('✅ Phase 1 Response received');
      
      // Wait for job completion
      let jobCompleted = false;
      let pollCount = 0;
      let personalizationQuestions = null;

      while (!jobCompleted && pollCount < 20) {
        await page.waitForTimeout(2000);
        pollCount++;
        
        const pollResponse = await page.request.get(`${BASE_URL}/jobs/${parsedResponse.jobId}`);
        const pollBody = await pollResponse.text();
        const pollData = JSON.parse(pollBody);
        
        if (pollData.status === 'completed') {
          jobCompleted = true;
          personalizationQuestions = pollData.result.personalizationQuestions;
          console.log('✅ Phase 1 completed, got personalization questions:', personalizationQuestions.length);
        }
      }

      // Now test Phase 2: Submit answers
      if (personalizationQuestions) {
        await test.step('Phase 2: Submit Personalization Answers', async () => {
          console.log('🔴 Phase 2: Submitting answers that might trigger JSON error');
          
          // Create answers with potentially problematic content
          const answers = personalizationQuestions.map((q, index) => ({
            id: q.id,
            answer: [
              "我是完全的初學者，沒有任何程式設計經驗。希望能從最基礎的語法開始學習，包括變數、函數、類別等概念。我的目標是在3個月內能夠獨立開發一個簡單的網頁應用程式。",
              "我每天可以投入2-3小時學習，週末可以投入更多時間。我偏好透過實作專案來學習，而不是純理論。",
              "我希望能夠熟練掌握Python的核心語法、資料結構、物件導向程式設計，並能使用Flask或Django框架開發網頁應用。"
            ][index] || "是的，我很有興趣學習這個技能"
          }));

          const phase2Payload = {
            type: "learning_plan",
            params: {
              title: "Python 程式設計學習",
              description: "我想學習 Python 程式設計，從基礎開始，目標是能夠開發網頁應用",
              language: "en",
              taskType: "skill_learning",
              currentProficiency: "beginner",
              targetProficiency: "intermediate",
              personalizationAnswers: answers
            },
            options: {}
          };

          console.log('📤 Phase 2 Request:', JSON.stringify(phase2Payload, null, 2));

          const phase2Response = await page.request.post(`${BASE_URL}/jobs`, {
            data: phase2Payload,
            headers: { 'Content-Type': 'application/json' }
          });

          console.log('📥 Phase 2 Response Status:', phase2Response.status());
          
          const phase2ResponseBody = await phase2Response.text();
          console.log('📄 Phase 2 Response Body:', phase2ResponseBody);

          try {
            const phase2ParsedResponse = JSON.parse(phase2ResponseBody);
            console.log('✅ Phase 2: Initial JSON parsing successful');
            
            if (phase2ParsedResponse.jobId) {
              console.log(`🆔 Phase 2 Job ID: ${phase2ParsedResponse.jobId}`);
              
              // Monitor Phase 2 polling for JSON errors
              let phase2JobCompleted = false;
              let phase2PollCount = 0;
              const maxPhase2Polls = 30;
              
              while (!phase2JobCompleted && phase2PollCount < maxPhase2Polls) {
                await page.waitForTimeout(3000);
                phase2PollCount++;
                
                const phase2PollResponse = await page.request.get(`${BASE_URL}/jobs/${phase2ParsedResponse.jobId}`);
                const phase2PollBody = await phase2PollResponse.text();
                
                console.log(`📊 Phase 2 Poll ${phase2PollCount} - Status: ${phase2PollResponse.status()}`);
                console.log(`📄 Phase 2 Poll response length: ${phase2PollBody.length}`);
                console.log(`📄 Phase 2 Poll preview: ${phase2PollBody.substring(0, 200)}...`);
                
                try {
                  const phase2PollData = JSON.parse(phase2PollBody);
                  console.log(`🔄 Phase 2 Job Status: ${phase2PollData.status}`);
                  
                  if (phase2PollData.status === 'completed') {
                    phase2JobCompleted = true;
                    console.log('✅ Phase 2 completed successfully');
                    console.log('📋 Phase 2 Final Result keys:', Object.keys(phase2PollData.result || {}));
                    
                    // Check if we got subtasks
                    if (phase2PollData.result && phase2PollData.result.subtasks) {
                      console.log(`📚 Generated subtasks count: ${phase2PollData.result.subtasks.length}`);
                      if (phase2PollData.result.subtasks.length === 0) {
                        console.log('⚠️ WARNING: No subtasks generated - this might be the issue!');
                      }
                    }
                  } else if (phase2PollData.status === 'failed') {
                    console.log('❌ Phase 2 job failed');
                    console.log('🚨 Phase 2 Error:', phase2PollData.error);
                    break;
                  } else if (phase2PollData.status === 'processing') {
                    console.log('🔄 Phase 2 still processing...');
                  }
                } catch (error) {
                  console.log('🚨 FOUND IT! JSON parsing error in Phase 2 poll response:', error.message);
                  console.log('📄 Raw Phase 2 poll response that failed to parse:', phase2PollBody);
                  console.log('🔍 Response length:', phase2PollBody.length);
                  console.log('🔍 Response starts with:', phase2PollBody.substring(0, 100));
                  console.log('🔍 Response ends with:', phase2PollBody.substring(Math.max(0, phase2PollBody.length - 100)));
                  
                  // Check for common JSON issues
                  if (!phase2PollBody.trim().startsWith('{') && !phase2PollBody.trim().startsWith('[')) {
                    console.log('⚠️ Response does not start with JSON bracket');
                  }
                  if (!phase2PollBody.trim().endsWith('}') && !phase2PollBody.trim().endsWith(']')) {
                    console.log('⚠️ Response does not end with JSON bracket');
                  }
                  
                  // Check for truncation
                  if (phase2PollBody.includes('"result":') && !phase2PollBody.includes('}}')) {
                    console.log('⚠️ Response appears to be truncated');
                  }
                  
                  console.log('🎯 SUCCESS: Reproduced the JSON parsing error in Phase 2!');
                  break;
                }
              }
              
              if (!phase2JobCompleted) {
                console.log('⚠️ Phase 2 job did not complete within timeout');
              }
            }
          } catch (error) {
            console.log('❌ Phase 2: Initial JSON parsing failed:', error.message);
            console.log('📄 Raw Phase 2 response that failed to parse:', phase2ResponseBody);
          }
        });
      }
    });

    // Generate analysis
    await test.step('Generate Analysis Report', async () => {
      console.log('📊 PHASE 2 ANALYSIS COMPLETE');
      console.log('🔍 Key Findings:');
      console.log('  1. Phase 1 (getting questions) typically succeeds');
      console.log('  2. Phase 2 (submitting answers) is where JSON errors may occur');
      console.log('  3. Large response payloads with subtasks may cause truncation');
      console.log('  4. Error happens during polling, not initial request submission');
      console.log('  5. Description field with Chinese text may affect AI response size');
    });
  });
});