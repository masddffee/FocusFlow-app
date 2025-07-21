# CLAUDE.md 
**Document Version:** 2.0
**Last Updated:** July 17, 2025
**Project:** FocusFlow - AI Smart Learning Planner and Focus Assistant
**Using API:** gemini 2.5 Flash
---

This document provides the highest-priority guiding principles for Claude Code (claude.ai/code) when working on the **FocusFlow** project.

## Critical Rules - Read and Confirm Before Starting Any Task

**Rule Compliance System Activated**
*Claude Code must explicitly confirm these rules before beginning any task, without exception.*
**Rule Confirmation Required**
Before starting **ANY** task, Claude Code must respond:
**"Critical rules confirmed - I will comply with all prohibitions and mandatory requirements listed in FocusFlow CLAUDE.md."**

---

### Absolute Prohibitions

* **NEVER create new files in the root directory.** → All code must be placed in the appropriate module under `src/`.
* **NEVER create duplicate files or suffixes like `_v2`, `_new`, `_enhanced`.** → ALWAYS search for existing functionality and extend it. This prevents technical debt.
* **NEVER hard-code any prompts.** → All AI prompts must be imported from files under `/lib/prompts/`.
* **NEVER call third-party APIs (e.g., Gemini) directly from the frontend (`app/`, `components/`).** → All AI requests must be proxied through secure backend endpoints (e.g., `/api/ai/plan`).
* **NEVER copy and paste code blocks longer than three lines.** → Immediately extract them into reusable functions or components.
* **Never modify large core files such as ai.js or add-task.tsx directly**. If you want to modify them, please ask first and specify in detail what program you want to modify and what functions it has.
* **NEVER ignore or skip any errors**. → Once an error occurs (whether it is a TypeScript compilation error, an API response exception, a test failure, or an ESLint warning), it must be corrected immediately, and no subsequent development, submission, or deployment actions may be performed until the error is completely resolved.
* **NEVER sign Claude Code**. 

### Mandatory Requirements

* **Search before you create:** Before creating any new function or component, **must** use the `grep` tool to search the project for similar extensible features.
* **Layered architecture:** Strictly follow the call order “UI layer (`app/`) → API layer (`utils/api.ts`) → routing layer (`routes/ai.js`) → service layer (`services/`)”.
* **Single source of truth (SSOT):** Each core concept (e.g., the data structure for a learning plan) must be defined in one authoritative place (e.g., `types/task.ts`); all other code must import and reference that definition.
* **Code verification first:** Every newly created or modified functional module must first be tested locally and its functionality and correctness must be verified. Only after confirming that there are no errors and that it meets the expected behavior can the next step (such as integration, submission or deployment) be entered.
* **Test file cleanup:** All test files temporarily created to verify the function (such as manual test pages, console output verification codes, etc.) must be deleted immediately after the unit is completed to keep the project clean and avoid technical debt.
* **Backup after each commit:** After every `git commit`, **must** immediately run `git push origin main` to ensure the work is backed up to the remote repository.
* **Use Task Agents for all long-running operations:** Any operation that may exceed 30 seconds (especially AI generation and testing) **must** run in a background Task Agent to prevent interruptions due to context switching.

---

## Project Architecture & Overview

**FocusFlow** is an AI-powered productivity and learning application built with React Native (Expo) and Node.js. It transforms large goals into daily actionable plans through AI-driven task decomposition, smart scheduling, and scientific learning methods.

### Tech Stack
* **Frontend:** React Native (Expo SDK 53+), Zustand (state management), i18next (internationalization), NativeWind (styling)
* **Backend:** Node.js, Express.js
* **AI Model:** Google Gemini (proxied through backend API)
* **Local Storage:** AsyncStorage

### Key Directories
* `app/`: (UI/Page layer) All pages defined by Expo Router.
* `components/`: (UI components) Reusable React components.
* `store/`: (State management) All Zustand data stores.
* `utils/`: (Frontend utilities) Helper functions such as `api.ts`.
* `types/`: (Type definitions) All TypeScript types for the project.
* `focusflow-backend/`: (Backend services)
  * `routes/`: Express API routes, e.g., `ai.js`.
  * `lib/services/`: Core backend services such as `geminiService.js` and `jobQueueService.js`.
  * `lib/prompts/`: AI brain, storing all prompt templates.

---

## Development Workflow & Commands

### Common Commands

* Start full development environment: `npm run dev`
* Start frontend only: `npm start`
* Start backend only: `npm run backend`

### Complex Task Workflow (MANDATORY for tasks > 3 steps)

1. **Task Decomposition:**
   * `TodoWrite`: First, use this tool to break down complex requirements (e.g., “optimize cache service”) into a clear list of steps with checkpoints.
2. **Parallel Execution:**
   * `Task Agents`: For each independent subtask (e.g., “modify set function”, “write unit tests”), launch a parallel Task Agent to handle it.
3. **Checkpoint Commits:**
   * Once one or a group of related subtasks is complete, **immediately** run `git add .` and `git commit -m "feat: [description]"`.
4. **Remote Backup:**
   * After every commit, **immediately** run `git push origin main`.
5. **Verification:**
   * After key features are implemented, run the relevant test scripts (`npm test` or `npm run backend:test`) to verify that changes did not break existing functionality.

---

## GitHub Integration & Auto-Backup
### Initialization Workflow
* **Scenario:** When AI detects this `CLAUDE.md` file in a new project.
* **Action:**
  1. AI must ask the user: “GitHub repository setup: Would you like to configure a remote GitHub repository for this project?”
  2. Provide options: “1. Create new repository”, “2. Link to existing repository”, “3. Skip setup”.
  3. Based on user choice, use the `gh` CLI tool to run the corresponding `git remote add` and `git push` commands.
### Enforced Backup Process
* **Rule:** After every `git commit`, **must** run `git push origin main`.
* **Reason:** Ensure that any completed work unit is not lost due to local environment issues; this is the lifeline of professional development.

---

* **Please respond before starting any task**:Critical rules confirmed - I will comply with all prohibitions and mandatory requirements listed in FocusFlow CLAUDE.md.
You are now ready to begin the development process. Please follow the above structure and guidelines for every task.
