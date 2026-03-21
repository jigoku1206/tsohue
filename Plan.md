# Thohue - Collaborative Web Ledger

## 1. Project Overview
**Thohue** (derived from the Taiwanese word for "together") is a lightweight, zero-install web application designed for shared financial tracking. It provides a centralized ledger where multiple users can collaboratively log and monitor shared expenses in real-time. The system is designed with an API-first approach, ensuring seamless synchronization between the web interface and future mobile applications.

## 2. Target Audience
* Couples managing shared living expenses or date funds.
* Small families needing a unified household budget tool.
* Close-knit groups wanting a transparent view of collective spending.

## 3. Technical Architecture & Tech Stack
This project is built for zero-cost deployment, high scalability, and cross-platform readiness.

* Frontend Framework: Next.js (React)
* Backend & API: Next.js Route Handlers (Serverless APIs)
* Database & Authentication: Supabase (PostgreSQL)
  * Built-in email/password authentication.
  * Realtime database subscriptions for instant UI updates.
* Styling: Tailwind CSS & shadcn/ui
* Deployment: Vercel (Hobby Tier - Free)

## 4. Core Features

### 4.1 Web-Based & Mobile-First
* Fully accessible via any modern web browser.
* Responsive UI optimized for mobile devices, designed to function as a Progressive Web App (PWA).

### 4.2 Unified Shared Ledger
* A single workspace where authorized users can view the entire transaction history.
* Real-time synchronization across devices (Web, future iOS/Android apps).

### 4.3 Multi-User Expense Tracking
* Clear attribution for every transaction.
* Each record captures essential data points: Date, Amount, Category, Note, and Who Paid.
* Shared categories configured per household.

### 4.4 Authentication & User Management (Powered by Supabase Auth)
* Secure account creation and JWT-based session management.
* Household Creation: A user can create a shared workspace.
* Invitation System: Generate secure links to invite partners.

### 4.5 Localization & UI Design
* Primary Language: Traditional Chinese (zh-TW) user interface.
* Localized Formatting: New Taiwan Dollar (NT$) formatting and local time conventions.

## 5. Non-Goals (Out of Scope)
* Complex debt settlement algorithms (e.g., Splitwise-style "Who owes who").
* Automatic bank feed integrations.
* Complicated double-entry bookkeeping.

## 6. Future Roadmap
* Cross-platform Mobile Apps (iOS/Android) using Supabase SDKs.
* Export data to CSV.
* Budget limits and alert notifications.