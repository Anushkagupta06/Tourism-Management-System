# WanderEase — Tourism Management System (MySQL Version)

A responsive Tourism Management System built for the Web Development project.

## Technologies
- HTML5
- CSS3
- JavaScript
- Node.js
- Express.js
- MySQL
- mysql2
- express-session
- bcryptjs

## Main modules
1. Home / tourism landing page
2. User Registration and Login
3. Destination Management (Admin CRUD)
4. Tour Package Management (Admin CRUD)
5. Search / Filter / Sort
6. Booking System
7. Booking History and Cancellation
8. Reviews and Ratings
9. Contact / Enquiry
10. User/Admin Dashboard

## MySQL setup

### 1. Install MySQL
Install MySQL Server and MySQL Workbench.

### 2. Create the database
Open MySQL Workbench, open `database.sql`, and run the complete script.

The script creates:
- `wanderease` database
- `users`
- `destinations`
- `packages`
- `bookings`
- `reviews`
- `enquiries`

It also inserts demo destinations, packages, and an admin account.

### 3. Configure `.env`
Copy `.env.example` and rename the copy to `.env`.

Example for a default local MySQL installation:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=wanderease

SESSION_SECRET=change-this-to-a-long-random-string
```

If your MySQL root account has a password, put it in `DB_PASSWORD`.

### 4. Install Node packages

Open VS Code terminal inside this project folder:

```bash
npm install
```

### 5. Start

```bash
npm start
```

You should see:

```text
MySQL connected successfully.
WanderEase running at http://localhost:3000
```

Open:

http://localhost:3000

## Demo admin login

Email:
`admin@tourism.com`

Password:
`admin123`

## Normal user
Use the Registration form to create a normal user account.

## Important
This version stores application data in MySQL, so destinations, packages, users, bookings, reviews and enquiries persist after restarting the Node.js server.

Do not upload your `.env` file to GitHub. It is already included in `.gitignore`.

## Project structure

```text
TourismManagementSystem/
│
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
│
├── database.sql
├── .env.example
├── .gitignore
├── package.json
├── server.js
└── README.md
```
