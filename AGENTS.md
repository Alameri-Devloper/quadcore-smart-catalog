# QSC Platform Agent Instructions

## Project Name

QSC Platform - Quadcore Smart Catalog

## Role

You are an implementation engineer working under the project architecture.

Do not change the architecture unless explicitly requested.

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase later

## Architecture Rules

- Follow Domain Driven Design.
- Follow Clean Architecture.
- Use TypeScript only.
- Code language must be English.
- Documentation must be English + Arabic.
- Mobile First.
- Multi-Tenant from day one.
- No hardcoded business logic.
- Do not call database directly inside components.
- Business logic belongs to services.
- Data access belongs to repositories.
- Mock data belongs to mock folder.

## Project Structure

app/
domains/
shared/
docs/
public/

## Catalog Domain Structure

domains/catalog/
├── components/
├── hooks/
├── mock/
├── repositories/
├── schemas/
├── services/
├── types/
└── utils/

## Current Rules

- Product belongs to Product Model.
- Product Model belongs to Category.
- Category belongs to Department.
- Department belongs to Workspace.
- Workspace belongs to Company.
- WhatsApp public catalog uses store number.
- Employee catalog uses employee WhatsApp number.
- If employee WhatsApp is missing, fallback to store WhatsApp.

## Important

Before modifying code:

1. Read docs.
2. Preserve current architecture.
3. Fix only the requested issue.
4. Do not rename folders unless requested.
5. Do not introduce new libraries without approval.

## Current Task

Fix build errors while preserving the architecture.

## Root Cause Analysis

Before fixing any bug:

1. Reproduce the issue.
2. Identify the root cause.
3. Explain the root cause.
4. Apply the smallest safe fix.
5. Verify that the architecture is still respected.

Never apply blind fixes.

## Mandatory Task Report

After every implementation task, always produce a report before stopping.

The report must contain:

### Files Created

### Files Modified

### Files Deleted

### Architecture Changes

### Summary

### Next Recommendation

Then wait for review.

Never continue to another task automatically.
