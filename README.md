# KD AI Book Editor

*AI-powered book writing, editing, and content generation platform built with Next.js + OpenAI.*

## 🚀 Overview

**KD AI Book Editor** is a modern web application that allows users to create, write, edit, organize, and enhance complete books using AI.

The platform combines a powerful book editor with OpenAI-powered content generation to help users create professional books faster and manage their content in one place.

Built using:

* **Next.js (App Router)**
* **TypeScript**
* **OpenAI JSON / Text Models**
* **AI Image Generation**
* **Custom Book Editor Engine**
* **MySQL Database**
* **AWS S3 Storage**

### Key Features

* AI-powered book content generation
* Create and manage complete books
* Chapter-based book structure
* Rich text book editor
* Generate headings, paragraphs, and sections with AI
* AI-assisted rewriting and content improvement
* Book cover and image support
* Upload and manage book assets
* Automatic content saving
* User authentication system
* Personal user dashboard
* Secure book data management
* Organized book projects
* Modern responsive editor interface
* Cloud-based image and asset storage

Ideal for:

* Authors
* Students
* Content creators
* Publishers
* Researchers
* Professionals
* Anyone who wants to create books faster with AI

---

## 🛠️ Tech Stack

* **Next.js 14+**
* **TypeScript**
* **React**
* **OpenAI API**
* **Tailwind CSS**
* **Server Actions / Route Handlers**
* **MySQL**
* **AWS S3**
* **Secure Authentication System**
* **React Components**

---

## 📦 Installation

Clone the repository:

```bash
git clone https://github.com/kd-ai-book-editor.git

cd BookEditorV1
```

Install dependencies:

```bash
npm install
```

Create your environment configuration:

```bash
cp .env.example .env
```

Configure the required environment variables for:

* OpenAI API
* MySQL Database
* AWS S3
* Authentication

Run the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

in your browser.

---

## Project structure

The app is split into four separate areas plus shared code. Each area has its own
folder, its own route group and its own stylesheet, so work in one rarely touches another.

| Area | Routes | Code | Styles |
| --- | --- | --- | --- |
| **User site** — marketing, auth, dashboard, billing, settings | `app/(site)`, `app/api/(site)` | `modules/site`, alias `@site/*` | `modules/site/styles/site.css` |
| **Admin (BMS)** — overview, accounts, messages | `app/(admin)`, `app/api/(admin)` | `modules/admin`, alias `@admin/*` | `modules/admin/styles/admin.css` |
| **Editor** — the book editor | `app/(editor)`, `app/api/(editor)` | `modules/editor`, alias `@editor/*` | `modules/editor/styles/editor.css` |
| **Open preview** — public reader, no account needed | `app/(reader)`, `app/api/(reader)` | `modules/reader`, alias `@reader/*` | `modules/reader/styles/reader.css` |

Shared code lives in `modules/shared` (alias `@shared/*`): authentication, database,
API helpers, plans, fonts and the base stylesheet every area loads.

Route groups in brackets do not appear in URLs: `app/(site)/pricing` still serves `/pricing`.

Administration is a separate system: its accounts live in `admin_users`, sign in at
`/admin/login` with their own session cookie, and have nothing to do with customer
accounts. Create the first one with `npm run admin -- add you@example.com "Your name"`;
after that, an owner adds the rest from **Administrators** in the panel.

---

## 📚 Book Editor

The editor is designed around a structured book workflow.

Users can:

* Create a new book
* Add and manage chapters
* Write and edit book content
* Generate content using AI
* Rewrite or improve existing text
* Insert images
* Manage book assets
* Organize chapter content
* Save book progress
* Continue editing books from the dashboard

---

## 🤖 AI Integration

OpenAI is used to assist users during the book creation process.

AI features can include:

* Book idea generation
* Book title generation
* Chapter generation
* Chapter outline generation
* Paragraph generation
* Content expansion
* Content rewriting
* Grammar and writing improvements
* Summarization
* Tone adjustment
* Image generation

---

## 🔐 Authentication & Dashboard

KD AI Book Editor includes a secure authentication and dashboard system.

Users can:

* Create an account
* Log in securely
* Access their personal dashboard
* Create multiple book projects
* Open existing books
* Edit and manage books
* Manage profile information
* Securely access their own book data

---

## ☁️ Storage

Application data is stored using:

### MySQL

Used for structured application data such as:

* Users
* Books
* Chapters
* Book metadata
* Editor data
* Project information

### AWS S3

Used for file and media storage such as:

* Book images
* Profile images
* Book covers
* Uploaded assets
* AI-generated images
* Book-related files

---

## 🎯 Project Goal

The goal of **KD AI Book Editor** is to provide a complete AI-powered environment where users can go from an initial book idea to a professionally structured book without switching between multiple applications.

It combines:

**AI Generation + Book Writing + Editing + Asset Management + Cloud Storage**

## Admin sales page builder

Open **Administration → Sales Page Builder** to edit the public homepage. The builder supports editable offer/countdown bars, hero content, video with benefits, feature cards, calls to action, pricing, testimonials, FAQs and footer links. Sections can be reordered, duplicated, hidden or removed, with undo/redo and desktop, tablet and mobile previews.

**Save draft** stores edits privately in MySQL. **Publish** saves the current editor content and makes it the homepage at `/`. **Unpublish** in Brand & page settings restores the original landing page while preserving the draft. Saving further changes to a published page does not change its live version until Publish is used again. Conflicting saves from another tab are rejected rather than silently overwriting changes.

The builder creates `sales_page` and `sales_page_media` tables on first admin access; both are also included in `database/schema.sql`. Image uploads use the project's existing S3 configuration and are converted to WebP. Image URLs and YouTube/Vimeo/direct video URLs can also be entered. Pricing and CTA links are configured in the editor; a price label does not alter package pricing or checkout behavior.

Validation and renderer tests run with `npm run test:sales-page`; browser interaction checks with mocked persistence run with `npm run test:sales-page:browser`. `npm run test:sales-page:db` checks the configured database inside a transaction and rolls back all test content writes.

into one modern platform.
