# Agency OS

A simple **client operations** app for a small agency (websites, projects, quotes, invoices).

One client = one profile. Everything about them lives in one place.

---

## What’s in this folder

| File | What it is |
|------|------------|
| `index.html` | Dashboard (home) |
| `clients.html` | List of all clients |
| `client.html` | One client’s full profile |
| `projects.html` | All projects across clients |
| `proposals.html` | All quotes / proposals |
| `invoices.html` | All invoices |
| `templates.html` | Email templates |
| `agency-os.css` | All styles |
| `agency-os.js` | App logic + data |
| `README.md` | This file |

---

## How to run it

1. Keep **all files in the same folder**.
2. Open `index.html` in a browser (Chrome, Firefox, Edge, Safari).
3. That’s it — no install, no server required.

Data is saved in the browser’s **localStorage**, so your changes survive a refresh.

- First visit loads two **demo clients**.
- After that, add / edit / delete — it remembers.
- Clearing site data (or using another browser) resets to the demo again.

---

## How the pages are built

**HTML pages** hold the shell:

- Sidebar with real links  
- Page title and buttons  
- Search box (on Clients)

**JavaScript** fills in the live data:

- Client cards, project tables, invoices, etc.  
- Forms and modals  
- Saving to localStorage  

So you can read the layout in the HTML, and the “moving parts” live in `agency-os.js`.

---

## What the app can do

### Dashboard
- Total clients  
- Active projects  
- Things waiting on the client  
- Pending proposals  
- Outstanding invoice total  
- Today’s tasks and follow-ups  

### Clients
- Search by name, business, email, phone, or project  
- Add / edit / delete a client  
- Open a full profile  

### Client profile (tabs)
- **Overview** — contact + quick counts  
- **Projects** — jobs and progress  
- **Tasks** — to-dos with due dates  
- **Communication** — log emails + follow-ups  
- **Info requests** — “please send logo / photos”  
- **Proposals** — quotes with line items + VAT  
- **Invoices** — bills; convert from accepted proposal  
- **Notes** — internal only  
- **Timeline** — history of important actions  

### Money helpers
- Line items with prices  
- VAT %  
- Subtotal / VAT / Total  
- Print / PDF-friendly view for proposals and invoices  

### Email templates
- Reusable subjects and bodies  
- Placeholders: `{{client_name}}`, `{{project_name}}`  

---

## How it works (simple story)

Imagine a **notebook** for the agency.

### Customers = folders
Each customer folder holds:

- name, phone, email, status  
- jobs (projects)  
- to-dos (tasks)  
- notes  
- quotes and bills  
- a history of what happened  

### When the app starts
```
LOOK for the saved notebook in the browser
IF found → open it
IF not → create a demo notebook with 2 example customers
SHOW the home page
```

### When something changes
```
UPDATE the notebook
SAVE it (localStorage)
```

### Home page
```
COUNT customers
COUNT open jobs
COUNT things waiting on clients
COUNT unpaid money
LIST tasks and reminders due today
SHOW recent customers
```

### Customers page
```
SHOW every customer as a card
WHEN you search → only matching cards
WHEN you add a customer → new folder + history line + save
WHEN you click a card → open that folder
```

### One customer’s page
Like opening one folder. Tabs = sections:

Overview · Jobs · To-dos · Messages · Requests · Quotes · Bills · Notes · History

### Jobs
```
ADD a job with a stage (New, Design, Development, …)
Computer sets a progress % for that stage
WRITE “Job created” in history
SAVE
```

### To-dos
```
ADD what to do, who, and when
TICK when done → write in history → save
```

### Quotes and bills
```
QUOTE = “This is what it will cost”
  - add lines (name + price)
  - add tax %
  - total = prices + tax

BILL = “Please pay this”
  - can be created from an accepted quote
  - copy the same lines and totals
```

### History
Every important step gets a line:

- “Customer folder created”  
- “Job created: Website”  
- “Task finished: …”  
- “Bill marked Paid”  

---

## Data shape (for developers)

```
Client
  id, name, business, email, phone, status, assignedTo, createdAt
  projects[], tasks[], notes[], timeline[]
  emails[], infoRequests[], followUps[]
  proposals[], invoices[]

Project
  id, name, type, status, progress, startDate, dueDate, description

Task
  id, title, projectId, assignee, dueDate, priority, done

Proposal / Invoice
  id, title, line items (name + price), vatPercent, status, dates
```

Statuses used in the app:

- **Client:** Onboarding, Active, Waiting on Client, On Hold, Completed  
- **Project:** New, Onboarding, Design, Development, Testing, Completed  
- **Proposal:** Draft, Sent, Viewed, Accepted, Rejected, Expired  
- **Invoice:** Unpaid, Partially Paid, Paid, Overdue, Cancelled  

Storage keys in the browser:

- `agency-os:clients`  
- `agency-os:templates`  

---

## If you rebuild this in Java (short map)

1. **Models** — Client, Project, Task, Proposal, Invoice, Template (classes).  
2. **Storage** — database or JSON file instead of localStorage.  
3. **Operations** — create/update/delete client; same for projects, tasks, quotes, bills.  
4. **Helpers** — line total, VAT total, “due today” lists, timeline entry.  
5. **API** (optional) — `GET/POST /api/clients`, `/api/dashboard`, etc.  
6. **Frontend** — keep these HTML pages and call your Java API instead of localStorage.

Pattern for almost every change:

```
find the parent (e.g. client)
create or update the child (job, task, bill…)
optional: write a history line
save
```

---

## Notes

- Money is shown in **South African Rand** (`R` + en-ZA formatting).  
- Email “send” is **simulated** — it only logs to the client’s history.  
- Print / PDF opens a simple printable window for proposals and invoices.  

---

## Quick start again

```
1. Unzip (if needed)
2. Open index.html
3. Click around — Clients, a client profile, Proposals, Invoices
4. Add something, refresh — it should still be there
```

That’s Agency OS.
