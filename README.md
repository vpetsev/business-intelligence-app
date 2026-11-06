# business-intelligence-app

## :chart_with_upwards_trend: :bar_chart: BUSINESS INTELLIGENCE APP :bar_chart: :chart_with_downwards_trend:

The Business Intelligence (BI) App enables users to access business information via two categories: analysis, such as online analytical processing (OLAP), and information delivery, such as dashboards.

## Live Link

[Business Intelligence Application](https://bi-app.vercel.app/)

## This site was built by:

- [Victor Petsev](https://github.com/VPetsev)
- [David Carlisle](https://github.com/dbc257)


## Summary

- :star: [Website Link](#website-link)
- :star: [Screenshots](#screenshots)
- :star: [Videos](#videos)
- :star: [Getting Started](#getting-started)
- :star: [Prerequisites](#prerequisites)
- :star: [Installing](#installing)
- :star: [Built With](#built-with)
- :star: [Contributors](#contributors)

## Website-Link

[Business Intelligence App](https://business-intelligence-app.vercel.app/)

## Screenshots

<!-- ![Screen Shot 2020-07-22 at 9 05 12 PM](https://user-images.githubusercontent.com/62611599/88332622-75e12f80-ccf4-11ea-816e-9af2c7a0b3bf.png) -->
<img width="1425" alt="Home Page" src="https://user-images.githubusercontent.com/62611599/88332622-75e12f80-ccf4-11ea-816e-9af2c7a0b3bf.png">

<!-- ![Screen Shot 2020-07-23 at 2 28 48 PM](https://user-images.githubusercontent.com/62611599/88334193-06207400-ccf7-11ea-870a-590d5439081a.png) -->

<img width="1425" alt="About Us Page" src="https://user-images.githubusercontent.com/62611599/88334193-06207400-ccf7-11ea-870a-590d5439081a.png">

<!-- ![Screen Shot 2020-07-23 at 2 29 20 PM](https://user-images.githubusercontent.com/62611599/88334443-66171a80-ccf7-11ea-8d9d-b57ae26618bb.png) -->

<img width="1425" alt="Login Page" src="https://user-images.githubusercontent.com/62611599/88334443-66171a80-ccf7-11ea-8d9d-b57ae26618bb.png">

<!-- ![Screen Shot 2020-07-23 at 2 29 35 PM](https://user-images.githubusercontent.com/62611599/88334595-a24a7b00-ccf7-11ea-97bd-01b9b5ad7bfb.png) -->

<img width="1425" alt="Registration Page" src="https://user-images.githubusercontent.com/62611599/88334595-a24a7b00-ccf7-11ea-97bd-01b9b5ad7bfb.png">

<!-- ![Screen Shot 2020-07-23 at 2 29 54 PM](https://user-images.githubusercontent.com/62611599/88334724-d160ec80-ccf7-11ea-82c3-8811ad7b827f.png) -->

<img width="1425" alt="Explore Page" src="https://user-images.githubusercontent.com/62611599/88334724-d160ec80-ccf7-11ea-82c3-8811ad7b827f.png">

<!-- ![Screen Shot 2020-07-23 at 2 31 07 PM](https://user-images.githubusercontent.com/62611599/88334998-3a486480-ccf8-11ea-9d86-fe57c1b0b18f.png) -->

<img width="1425" alt="Apple, Inc. Chart" src="https://user-images.githubusercontent.com/62611599/88334998-3a486480-ccf8-11ea-9d86-fe57c1b0b18f.png">

<!-- ![Screen Shot 2020-07-23 at 2 36 20 PM](https://user-images.githubusercontent.com/62611599/88335216-8bf0ef00-ccf8-11ea-968d-ef5050d67e7f.png) -->

<img width="236" alt="Login Page on Mobile Device" src="https://user-images.githubusercontent.com/62611599/88335216-8bf0ef00-ccf8-11ea-968d-ef5050d67e7f.png">

## Videos

# ![Screen-Recording-2020-07-23-at-1](https://user-images.githubusercontent.com/59983319/88329444-93f86100-ccef-11ea-9c27-8d26ee5b4c75.gif)

## Getting-Started

Feel free to fork the project and change it to your likings. Try it out by cloning the repo to your local machine or download the zip.

## Prerequisites

You need preferably the latest version of Chrome, and text editor.

#### Go here for Chrome: https://www.google.com/chrome/

#### VSCode is my go to: https://code.visualstudio.com/

## Installing

To get started follow this guide:
ON LINUX/UNIX

# FOR DEVELOPMENT PURPOSES

In your terminal clone repo to your local machine using git clone:

```
git clone git@github.com:dbc257/business-intelligence-app.git
```

Move to your newly cloned repo by entering the following in your terminal:

```
$ cd business-intelligence-app && npm install
```

To open all project files from terminal using VSCode just tpye and enter:

```
$ code .
```

## Built With

- React.js
- Next.js
- Redux
- react-chartsjs-2
- Syntactically Awesome Style Sheets (Sass)
- Cascading Style Sheets (CSS)
- JSON Web Tokens
- bCrypt.js
- Node.js
- PostgreSQL
- ElephantSQL

## Contributors

- **David Carlisle**
- **Victor Petsev**


## Local configuration and regression tests

Use an isolated PostgreSQL database. The committed configuration contains no database passwords; `server/config/config.js` reads `DATABASE_URL` or the `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` environment variables. Production requires `DATABASE_URL`. Previously committed credentials must be rotated by the database owner; deleting them from the current tree cannot revoke copies or remove Git history.

From `server`, install dependencies, copy `.env.example` to `.env`, set a strong random `JWT_PASSWORD`, configure the database, and run:

```sh
npm install
npx sequelize-cli@5 db:migrate
npm start
```

The API listens on port 3001 (override with `PORT`). Guest login is disabled unless `REACT_APP_USERNAME` and `REACT_APP_PASSWORD` identify an existing account. User and guest tokens share the required signing key, include the user ID, and expire after one hour. Saved data reads/uploads require a Bearer token; callers may only access their own user ID. Existing rows with a null owner cannot be reliably attributed automatically and need separate recovery if their ownership is known.

From `client`, configure `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:3001`) before starting or building Next, then run `npm install` and `npm run dev`. On Node 22, this legacy Next 9 build also needs `NODE_OPTIONS=--openssl-legacy-provider`. API URL changes require restarting/rebuilding Next.

The regression suite requires Node 18+ and a fresh, empty PostgreSQL database. It refuses an existing schema and never drops user data. From `server`:

```sh
TEST_DATABASE_URL=postgres://postgres@127.0.0.1:5432/bi_test npm test
```

Tests apply all migrations and exercise real HTTP login failures, valid/invalid/expired tokens, guest identity, cross-user denial, CSV ownership and completed responses, and database-error responses. The new company migration supplies the column already used by the chart model. A misspelled association is corrected without introducing a second `UserId` column.
