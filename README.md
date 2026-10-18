# Shree Radhe Boutique

A private, mobile-friendly measurement book for a single tailoring business. This project is an actively developed baseline, not a production-certified application. Local development runs React, FastAPI, and PostgreSQL directly on macOS; Docker is not needed for the recommended workflow.

## What is included

- Owner-only password login with signed HTTP-only sessions and CSRF protection.
- Customer create, search, view, edit, archive, gender entry, and gender filtering.
- Customer list pagination (25 rows per page) and a top-of-list add-customer form.
- Versioned garment templates, multiple profiles per customer, and measurement history.
- Measurement-history comparisons when the saved versions use the same unit.
- Tailoring orders with search, editable details, due dates, statuses, saved-measurement links, price, advance payments, and remaining balances.
- Home-screen delivery queue and unpaid-balance list, printable order slips and measurement sheets, plus an orders CSV export.
- Customer JSON export, duplicate-entry warning, editable contact notes, and explicit permanent deletion after name confirmation.
- Optional browser reminders for due/overdue open orders while the app is open; browser notifications do not run as a background reminder service.
- 500 fictional demo customers with 3–4 randomized garment profiles and 1–3 generated orders each.
- Repeatable seed operation backfills missing demo orders; cleanup targets seeded orders and customers only, while preserving demo customers that have app-created orders.
- Responsive React PWA shell and a new boutique-themed icon.
- Warm dashboard with a forest-green sidebar, mobile slide-out navigation, KPI cards, due-order queue, and unpaid-balance summary.
- PostgreSQL schema migrations managed by Alembic.

## Install on an Apple Silicon Mac

### 1. Install the required software

Install Apple's command line tools if prompted:

```bash
xcode-select --install
```

Install Homebrew from [brew.sh](https://brew.sh/), then install Python, [Node.js](https://nodejs.org/en/download/), and [PostgreSQL 16](https://formulae.brew.sh/formula/postgresql@16):

```bash
brew install python@3.12 node postgresql@16
brew services start postgresql@16
```

Python 3.12 or newer is required; PostgreSQL 16 or newer is supported. Node.js provides npm, which installs the frontend packages. Docker Desktop is not required.

### 2. Create a local database

Open Terminal in this project folder and create the database:

```bash
createdb shree_radhe_boutique
```

Homebrew PostgreSQL uses your macOS account for local connections by default. No database password is needed for this local-only setup. If you already have a database with this name, keep it and skip this command.

### 3. Configure the backend

Create the local configuration file:

```bash
cp .env.example .env
```

Generate a unique session secret:

```bash
python3 -c 'import secrets; print(secrets.token_urlsafe(48))'
```

Put the output on the `SESSION_SECRET=` line in `.env`. Make an owner password hash:

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -e '.[dev]'
python -c 'import getpass,bcrypt; p=getpass.getpass("Owner password: ").encode(); print(bcrypt.hashpw(p,bcrypt.gensalt()).decode())'
```

Paste the printed hash into `OWNER_PASSWORD_HASH=` in the project-root `.env` file. The hash contains `$` characters, which are safe in this direct local setup. Do not share `.env` or reuse a production password for development.

Apply the database migrations and start the API:

```bash
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Leave this Terminal window running.

### 4. Start the frontend

Open a second Terminal window in the project folder:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The Vite development server forwards `/api` requests to FastAPI at port 8000. Sign in using the owner password you used to create the hash.

## Demo data: seed and safe cleanup

Keep the backend virtual environment activated. These commands operate on the database in `.env`.

Add sample customers until the database contains 500 generated customers. Each gets 3–4 randomized profiles, one sample measurement record per profile, and 1–3 randomized tailoring orders linked to those measurements. Re-running the command does not duplicate customers or generated orders. It also backfills generated orders for older seeded customers that do not have them:

```bash
cd backend
python -m app.demo_data --seed
```

Preview the generated records selected for removal:

```bash
python -m app.demo_data --cleanup
```

To delete only those generated sample customers and their related profiles and measurement records, run:

```bash
python -m app.demo_data --cleanup --confirm-cleanup
```

The cleanup first prints its target counts and then requires typing `DELETE SEEDED DATA`. It selects customers only where the database `seeded` flag is true and orders only where the order `seeded` flag is true. Customers/orders created in the app are not included. If a generated customer has a real app-created order, cleanup removes that customer's generated demo orders but leaves the customer and measurement history in place so the real order remains intact. It does not remove garment templates or the database itself. Back up important data before making database changes.

To reset the generated demo set and then create a fresh combined customer-and-order set, run cleanup first and seed second:

```bash
python -m app.demo_data --cleanup --confirm-cleanup
python -m app.demo_data --seed
```

The cleanup command asks for the confirmation phrase before deleting. Review its preview counts and enter the phrase only when those counts match the demo data you intend to remove.

## Tests and build

Backend tests:

```bash
cd backend
source .venv/bin/activate
pytest app/tests -q
```

Frontend tests and production bundle:

```bash
cd frontend
npm test
npm run build
```

The build output is written to `frontend/dist`. Run these checks after installing dependencies; a successful local development launch alone does not verify a production deployment.

## Orders, payments, and customer data

Open a customer and create an order with its garment description, delivery date, total price, advance, notes, and (optionally) the exact saved measurement version to use. Update the order status from the customer profile or the Orders screen. **Add payment** opens a form showing the current balance, validates the amount received today, and previews the remaining balance. The app stores the current advance total; it does not yet keep a separate payment transaction ledger or print a tax invoice.

The home screen highlights open orders and outstanding balances, including balances on delivered orders. Optional browser notifications are opt-in and are checked while the app is open; they are not delivered in the background after the app is closed. Customer JSON export includes customer details, measurement profiles and versions, and orders. Permanent deletion requires typing the exact customer name and removes that customer's orders and measurement records; export or back up data first. Archiving remains available when you want to hide a customer while retaining records.

Customer city is optional and is included in customer search. After updating an existing local database, apply the new migrations before starting the backend:

```bash
cd backend
source .venv/bin/activate
alembic upgrade head
```

## Android install troubleshooting

The earlier phone address was `http://192.168.1.25:8080`. That is HTTP on a local network IP, which Android Chrome does not treat as a secure origin. **That is why the same install error can remain even after fixing the icons.** Chrome requires a secure origin for PWA installation; `localhost` is a special case for development, but the Mac's `localhost` does not make the Android phone's LAN address secure. See [Chrome's installability guidance](https://developer.chrome.com/docs/lighthouse/pwa/installable-manifest).

The app now builds a manifest with its name, standalone display mode, start URL, and 192×192 and 512×512 PNG icons, plus a generated service worker. Those app files are ready, but installation from the phone still needs the site to be served at a public or otherwise trusted **HTTPS** address. A valid domain certificate and HTTPS reverse proxy (for example, Caddy) are needed on the server. Do not expose the development Vite or FastAPI ports to the internet.

### Check the PWA build on the Mac

```bash
cd frontend
npm run build
npm run preview
```

Open `http://localhost:4173` in desktop Chrome. Go to **DevTools → Application → Manifest** and check the **Installability** section and loaded icons. The localhost check validates the built manifest and service worker; it does not make the Mac's LAN IP installable on Android.

### Install on Android after HTTPS is configured

1. Open the exact `https://...` site in Android Chrome and confirm the address bar shows a valid secure connection.
2. If this site was opened before with HTTP, clear its old site data and service worker in Chrome, then reload the HTTPS address.
3. Open Chrome's menu and choose **Install app** / **Add to home screen**.
4. Launch the new icon and verify login and customer search. Customer data is not available offline.

The Android PWA icon assets are supplied as PNG sizes 192×192 and 512×512, with an SVG source icon. Verify the Installability section on the actual HTTPS site if Chrome still does not offer installation; it reports the remaining manifest or icon issue.

## Optional Docker workflow

Docker Compose files remain available for users who want the earlier container workflow. For that path, first create an owner password hash as above, then copy `.env.docker.example` to `.env`, fill in the hash and unique session secret, and run `docker compose up --build`. Docker Compose treats `$` as variable interpolation, so double each `$` in the bcrypt hash (for example, `$2b$12$...` becomes `$$2b$$12$$...`). The direct macOS workflow above is the recommended local development setup.

## Production status

This source is not production-ready by verification. Before public use, deploy behind HTTPS, set `COOKIE_SECURE=true`, use strong unique secrets, restrict allowed origins, configure encrypted off-server database backups, verify a restore, add login rate limiting and monitoring, and run staging and Android end-to-end checks. Do not expose the development Vite or FastAPI servers directly to the internet.
