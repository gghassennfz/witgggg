# WitG Backend

This is the backend API and service layer for the WitG AI-powered project management application.

## Tech Stack
- Node.js + Express.js (API server)
- PostgreSQL (managed by Supabase)
- Supabase Auth (user management)
- Socket.io (real-time features)
- Integrations: GitHub, Figma, Slack, Google Drive
- AI: Gemini/OpenAI endpoints for smart features

## Getting Started
1. Install dependencies: `npm install`
2. Set up your `.env` file with database and API keys
3. Start the server: `npm run dev`

## Folder Structure
- `/src` — Express routes, controllers, services
- `/migrations` — SQL migration scripts
- `/integrations` — Third-party API logic

## Database
- See `database_schema.sql` for the initial schema
- Managed by Supabase (with additional custom tables)

## Features
- Project, task, member, and comment management
- Real-time collaboration
- AI-powered suggestions and analytics
- OAuth and RBAC
- Webhooks for integrations
