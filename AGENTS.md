# AGENTS.md

This document defines **strict operational guidelines** for all **AI agents** (including OpenAI Codex, ChatGPT-based tools, GitHub Apps, or any automated refactoring/testing bot) contributing to this repository.

The purpose of these rules is to:
- maintain high-quality code  
- ensure transparent and reviewable changes  
- make all automation predictable and aligned with project standards  
- guarantee compatibility with GitHub Actions and Spotless formatting

All AI agents **must** follow these rules at all times.

---

## 1. Code Modification Rules

When an AI agent generates or updates code:

### **1.1 Changes must be clear and minimal**
- Modify only what is necessary.  
- Do not rewrite unrelated parts of files unless explicitly asked.  
- Avoid introducing stylistic differences that contradict Spotless formatting.

### **1.2 Add comments explaining intent**
- Provide meaningful comments for non-obvious logic.  
- Document assumptions and edge cases.  
- Never generate uncommented complex logic.

### **1.3 Avoid unnecessary abstractions**
- Do not introduce new patterns, classes, or frameworks unless explicitly requested.

> **AI Agent Requirement:**  
> “Every non-trivial code change must be accompanied by a short explanation comment about intent.”

---

## 2. Pull Request Requirements

When an AI agent opens or updates a PR:

### **2.1 Provide a structured PR description**
Use the format:

- **Summary** — what was changed and why  
- **Implementation Details** — key points of the changes  
- **Tests** — what tests were added or updated  
- **CI/CD Impact** — note any workflow changes  
- **Breaking Changes** — if applicable  
- **Related Issues** — references like `Fixes #123`

### **2.2 PRs must be self-contained**
- Ensure code compiles and tests pass.  
- Ensure Spotless formatting is applied.  
- Avoid PRs that require manual reviewer troubleshooting.

### **2.3 PRs must not mix concerns**
- One PR = one feature or fix.  
- Refactors must be separate PRs unless tied directly to the change.

> **AI Agent Requirement:**  
> “Always generate a human-readable PR description. Never open a PR with incomplete explanation.”

---

## 3. Commit Requirements

AI agents that commit code must:

### **3.1 Use meaningful, imperative commit messages**
Examples:
- `Add support for Vaadin Flow endpoint detection`
- `Fix VS Code extension crash when scanning tsconfig`
- `Refactor project initialization logic`

### **3.2 Provide a commit body when needed**
Include:
- reasons for the change  
- implementation notes  
- tests added/updated  

### **3.3 One commit per logical change**
Do not squash unrelated updates.
Do not create massive multi-purpose commits.

> **AI Agent Requirement:**  
> “Commit messages must explain *why*, not only *what*.”

---

## 4. Testing Requirements

AI agents must ensure:

### **4.1 Every new feature has tests**
- Unit tests for small pieces  
- Integration tests for VS Code extension behavior  
- Regression tests for bug fixes  

### **4.2 Tests must run in GitHub Actions**
- No environment-specific assumptions  
- No hard-coded OS paths  
- No dependencies that are unavailable in CI  

### **4.3 Avoid flaky tests**
- No randomness without seeding  
- No slow network-based tests  
- No reliance on external services unless mocked

> **AI Agent Requirement:**  
> “If a feature is added, a related test must be added. Never skip testing.”

---

## 5. GitHub Actions Compatibility

AI agents must verify that all changes:

### **5.1 Run cleanly in CI**
- If workflows need adjustments, modify them with clear documentation.  
- Ensure no missing environment steps.

### **5.2 Match the commands used in CI**
- If CI runs `npm test`, the agent must run it too.  
- If CI runs Spotless, the agent must run Spotless locally before committing.

### **5.3 No OS-specific or local-environment assumptions**
- Code must work on GitHub Actions’ Linux environment.

> **AI Agent Requirement:**  
> “Always simulate the GitHub Actions environment when generating code or tests.”

---

## 6. Spotless Formatting Compliance

AI agents must:

### **6.1 Apply formatting before committing**
Use the repository’s configured commands, e.g.:
./gradlew spotlessApply


### **6.2 Never manually override formatting**
- Do not fight Spotless rules.  
- Adjust code to be compatible with formatting rather than disabling it.

### **6.3 Keep formatting-only changes separate**
If Spotless reformats many lines, isolate it as a separate commit.

> **AI Agent Requirement:**  
> “Never leave unformatted code. Formatting failures should be resolved before committing.”

---

## 7. Required Pre-PR Checklist for AI Agents

Before opening a PR, an AI agent must ensure:

- [ ] Code builds successfully  
- [ ] All tests pass  
- [ ] All new features have tests  
- [ ] Changes run correctly in GitHub Actions environment  
- [ ] Spotless formatting applied  
- [ ] Code is commented  
- [ ] PR description is complete and meaningful  
- [ ] Commit messages are clean and explanatory  
- [ ] No unrelated changes included  

---

## 8. Summary of Agent Behavior Constraints

AI agents must:

- generate **minimal, precise** changes  
- **comment** all non-obvious logic  
- **explain** all PRs and commits  
- **test new features**  
- ensure **CI compatibility**  
- apply **Spotless formatting**  
- avoid unnecessary refactors  
- avoid making assumptions about developer environments  

They must **never**:

- generate unexplained code  
- skip tests for new functionality  
- open unclear or low-quality PRs  
- introduce formatting violations  
- create noisy, multi-purpose commits  
- add dependencies not supported in GitHub Actions  
