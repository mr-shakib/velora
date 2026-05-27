# CoupleVerse --- Full Product Specification

## Private Digital Space for Two People

Version: 1.0\
Target users: Exactly 2 authenticated users (couple-only system)

------------------------------------------------------------------------

# 1. Vision

Build a private website acting as:

-   Memory diary
-   Shared social feed
-   Date planner
-   Relationship timeline
-   Countdown system
-   Shared goals tracker
-   Chat system
-   Anniversary generator
-   AI recap assistant
-   Digital scrapbook

Goal:

> A personal operating system for a relationship.

------------------------------------------------------------------------

# 2. Tech Stack

## Frontend

-   Next.js 15 (App Router)
-   TypeScript
-   TailwindCSS
-   Shadcn/UI
-   Framer Motion
-   Zustand (light state)
-   TanStack Query
-   React Hook Form + Zod

## Backend (Recommended)

### Choice: NestJS ✅

Reasons:

-   Strong architecture
-   JWT auth
-   WebSockets
-   Notifications
-   Cron jobs
-   Scalable APIs
-   Easier future mobile support

Structure:

Auth Module\
User Module\
Memory Module\
Timeline Module\
Chat Module\
Notification Module\
Planner Module\
AI Module

------------------------------------------------------------------------

# 3. Design System

Primary palette:

Creamy White: HEX: #F8F4EC

Mint Green: HEX: #A8D5BA

Accent dark: #5C7A6B

Text: #2B2B2B

Muted: #8C8C8C

Radius: 20px

Theme: Soft / minimal / warm

------------------------------------------------------------------------

# Dynamic Theme Engine (Important)

Users can change colors anytime.

Need:

Theme table:

theme: - primary - secondary - background - text - border

Store:

database + local cache

Provide:

Settings → Appearance

Options:

Preset 1: Cream + Mint

Preset 2: Cream + Sage

Preset 3: Dark + Forest

Preset 4: Custom picker

Implementation:

CSS variables:

--bg --primary --secondary

------------------------------------------------------------------------

# 4. Authentication

Only 2 users allowed.

Methods:

Email OTP\
Password login\
Google login (optional)

Features:

Refresh token\
Remember device\
Session tracking

------------------------------------------------------------------------

# 5. Dashboard

Show:

Together for: X days\
Next date countdown\
Recent memories\
Partner mood\
Upcoming events\
Bucket progress

------------------------------------------------------------------------

# 6. Memory Feed

Like Instagram + diary.

Card:

Photo\
Video\
Caption\
Location\
Mood\
Tags\
Date

Features:

Albums\
Search\
Filters\
Map memories

------------------------------------------------------------------------

# 7. Relationship Timeline

Chronological milestones.

Examples:

First chat\
First meet\
Proposal\
Trips

Each:

Image\
Story\
Date

------------------------------------------------------------------------

# 8. Date Planner

Shared calendar

Need:

Create event\
Reminder\
Budget\
Checklist

------------------------------------------------------------------------

# 9. Bucket List

Examples:

Travel together\
Movie night

Need:

Status\
Deadline\
Progress

------------------------------------------------------------------------

# 10. Chat

Realtime socket chat

Features:

Image\
Reaction\
Reply\
Pinned memory

------------------------------------------------------------------------

# 11. Countdown Widgets

Anniversary

Birthday

Next trip

------------------------------------------------------------------------

# 12. AI Features (V2)

Monthly recap

Memory summarization

Date ideas

Caption generation

------------------------------------------------------------------------

# 13. Notifications

Use Firebase Cloud Messaging

Triggers:

New memory

Upcoming date

Miss you button

------------------------------------------------------------------------

# 14. Storage

Use:

Cloudinary OR Supabase Storage

------------------------------------------------------------------------

# 15. Database

PostgreSQL + Prisma

Core tables:

users\
themes\
memories\
timeline_events\
messages\
bucket_items\
plans\
notifications

------------------------------------------------------------------------

# 16. Security

HTTPS

Rate limit

Refresh token rotation

Encrypted secrets

------------------------------------------------------------------------

# 17. Deployment

Frontend: Vercel

Backend: Railway

DB: Neon PostgreSQL

------------------------------------------------------------------------

# 18. Future

Flutter app using same APIs

Desktop app

Printed anniversary books

------------------------------------------------------------------------

# Claude Workflow

Ask Claude to implement in phases:

Phase 1: Auth + Dashboard

Phase 2: Memory system

Phase 3: Planner + Timeline

Phase 4: Chat

Phase 5: AI

Never build everything simultaneously.
