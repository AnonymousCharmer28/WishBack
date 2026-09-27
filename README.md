# WishBack 🎂

### *Remember the people who remember you.*

WishBack is a lightweight birthday reciprocity tracker that helps you keep track of **who wished you, when they wished you, and whether you wished them back** — across multiple years.

It turns birthday wishes into simple, transparent data without turning friendship into a competition.

---

## Features

### Dashboard

A central overview of your birthday circle.

* **WishBack Score** with a plain-language explanation
* Reciprocity statistics
* Recently logged wish events
* Quick access to people and upcoming birthdays

### Calendar

A monthly birthday calendar showing everyone in your circle.

* Birthdays displayed directly on their dates
* Navigate between months
* Click a birthday to open that person's details

### Your Circle

Manage everyone whose birthdays you want to track.

* Search people by name
* Filter by relationship tag
* Filter birthdays coming up within **30 days**
* Open any person for their complete history

### Today

A dedicated sidebar showing what's relevant right now.

* Birthday greeting
* One-tap actions for people whose birthday is **today**
* Upcoming birthdays for the current week
* Quick logging of wishes

---

## Full CRUD

WishBack supports complete **Create, Read, Update, and Delete** functionality.

### People

Each person contains:

* Name
* Birthday
* Relationship tag
* Wish history

You can create, view, edit, and delete people directly from the **Person Detail** view.

Deleting a person also removes their associated wish history.

### Wish Events

Wish events are stored as individual records rather than a simple yes/no value.

Each event contains:

* Person
* Direction
* Timestamp
* Year

This allows WishBack to track the same person's birthday reciprocity **separately across multiple years**.

You can:

* Log a wish instantly
* Backdate a wish
* Edit an existing event
* Delete an event

---

## ⏱️ Timing Classification

Every wish event receives a playful timing label based on its timestamp compared with the **nearest occurrence of that person's birthday**.

| Label              | Meaning                            |
| ------------------ | ---------------------------------- |
| 🌅 **Early Bird**  | Wished well before the birthday    |
| 🎂 **On the Day**  | Wished on their birthday           |
| 🌙 **Last Minute** | Wished shortly before the birthday |
| 🕊️ **Belated**    | Wished after the birthday          |
| 👻 **Didn't Wish** | No wish was logged                 |

> These labels are descriptive and playful — **not judgments** about a person or friendship.

---

## WishBack Score

The **WishBack Score** provides a simple measure of birthday reciprocity.

### Formula

**Reciprocated birthday-years ÷ birthday-years with any activity**

The result is displayed as a percentage along with a plain-language explanation.

The score is calculated **only from the wish events you have logged**.

It is **not**:

* A friendship rating
* A personality score
* A measure of someone's character
* A judgment of how much someone cares

It simply answers:

> **"Across the birthday years I've recorded, how often was the exchange reciprocated?"**

---

## How It Works

WishBack uses a simple data model:

```text
People
  │
  ├── Name
  ├── Birthday
  ├── Relationship Tag
  │
  └── Wish Events
        ├── Direction
        ├── Timestamp
        └── Year
```

Because wish events are stored individually, the application can build a history over time instead of overwriting previous years.

---

## Tech Stack

WishBack intentionally uses a simple, dependency-free frontend.

| Technology       | Purpose                            |
| ---------------- | ---------------------------------- |
| **HTML5**        | Application structure              |
| **CSS3**         | Styling, layout, responsive design |
| **JavaScript**   | Application logic and interactions |
| **localStorage** | Client-side data persistence       |

### No build step.

### No frameworks.

### No external dependencies.

Everything runs directly in the browser.

---

## Run Locally

Clone the repository:

```bash
git clone https://github.com/AnonymousCharmer28/WishBack.git
cd WishBack
```

### Option 1 — Python

```bash
python3 -m http.server 5500
```

Then open:

```text
http://localhost:5500
```

### Option 2 — VS Code

Install the **Live Server** extension and open `index.html` with Live Server.

### Option 3 — Directly

You can also open `index.html` directly in your browser.

---

## Data Storage

Currently, all WishBack data is stored locally using the browser's:

```text
localStorage
```

This means:

* No account is required
* No server is required
* Data stays in the browser
* Data does not automatically sync between devices

Clearing browser storage will remove the locally stored application data.

---

## Roadmap

### Phase 1 — Frontend

* Multi-view application
* People management
* Wish event CRUD
* Calendar
* Birthday filtering
* Timing classification
* Reciprocity score
* localStorage persistence
* Responsive interface

### Phase 2 — Backend

* User authentication
* Supabase / PostgreSQL
* Cloud persistence
* Cross-device synchronization

Planned data relationship:

```text
Users
  │
  └── People
        │
        └── Wish Events
```

### Phase 3 — Notifications

* Browser push notifications
* Birthday reminders
* Email reminders
* Scheduled notifications

### Phase 4 — Portfolio Polish

* Advanced analytics
* Historical reciprocity trends
* Data visualizations
* Deployment
* Case-study documentation

---

## Why WishBack?

Birthdays are small things that can sometimes reveal interesting patterns.

Someone remembered yours.

You remembered theirs.

Maybe someone forgot.

Maybe you forgot.

WishBack isn't designed to tell you **who is a good friend**.

It's designed to give you a simple place to remember what actually happened — without the drama. 

---

## Project Structure

```text
WishBack/
│
├── index.html
├── style.css
├── script.js
└── README.md
```

---

## Privacy

WishBack currently stores data locally in your browser using `localStorage`.

No backend or external database is required for the current version.

---

## License

This project is licensed under the **MIT License**.

Do whatever you want with it. 

---

## Project

**WishBack** — *Remember the people who remember you.*

Built as a frontend-focused web application using vanilla HTML, CSS, and JavaScript.
