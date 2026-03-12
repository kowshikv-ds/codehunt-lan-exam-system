# CodeHunt – LAN Based Coding Competition System

CodeHunt is a LAN-based competitive programming examination platform designed to conduct multi-round coding contests within a local network environment.

The system allows institutions to organize coding competitions without relying on internet connectivity, making it suitable for campus events, internal hackathons, and controlled examination environments.

---

# Overview

CodeHunt manages the entire contest lifecycle including:

* Participant authentication
* Multi-round competition flow
* Automated evaluation of answers
* Real-time scoring
* Qualification filtering
* Anti-cheat monitoring
* Final result generation

Participants connect to a **local server using a browser**, complete multiple rounds of challenges, and the system automatically evaluates submissions and calculates scores.

---

# Competition Structure

The competition consists of **three rounds**.

---

## Round 1 – MCQ Programming Fundamentals

* Total Questions: **20**
* Languages included:

  * C
  * Java
  * Python
  * SQL
  * HTML
* Each question carries **1 mark**
* No negative marking
* Duration: **10 minutes**

Questions are randomly selected from the database for each participant.

---

## Round 2 – Fill-in-the-Blank Coding

Participants select a **track**.

### Track A

* C
* Java
* Python

### Track B

* C
* SQL
* HTML

Features:

* 5 questions per language
* Exact answer matching
* Each question carries **2 marks**
* Duration: **10 minutes**

### Qualification Rule

Participants qualify for Round 3 only if:

```
Round1 + Round2 ≥ 30 marks
```

---

## Round 3 – Coding Challenge

The final round contains:

* Python programming problems
* SQL query problems

Evaluation process:

* Python solutions are executed using a Python interpreter.
* SQL queries are executed in a temporary SQLite database.
* Results are compared with expected outputs.

Each question carries **5 marks**.

Duration: **25 minutes**

---

# Features

## Authentication System

Participants login using:

* Login ID
* Password

Session management is handled using **Express sessions**.

---

## Automatic Evaluation

The system evaluates answers automatically.

### Round 1

MCQ answers are matched with the correct option stored in the database.

### Round 2

Text answers are normalized and compared with expected answers.

### Round 3

* Python code is executed and the output is validated.
* SQL queries are executed in an in-memory SQLite database and the result is compared with the expected output.

---

## Anti-Cheating Monitoring

The frontend monitors user actions including:

* Tab switching
* Exiting fullscreen
* Browser back navigation
* Page refresh attempts

If the violation count exceeds the allowed threshold, the test is automatically submitted.

---

## Resume Mechanism

If a participant reconnects during the competition, the system checks their progress and resumes the exam from the correct stage.

This prevents accidental data loss during network interruptions.

---

## Automatic Scoring

Scores are calculated per round and aggregated into:

* Total Score
* Total Time Taken

Leaderboard ranking is based on:

1. Highest total score
2. Lowest total time

---

# System Architecture

```
Participants (Browser)
        │
        │ HTTP over LAN
        ▼
Node.js + Express Server
        │
        ├── SQLite Database
        │
        └── Python Execution Engine
```

The system operates completely within a **Local Area Network (LAN)**.

---

# Technology Stack

## Backend

* Node.js
* Express.js

## Database

* SQLite (WAL Mode)

## Frontend

* HTML
* CSS
* JavaScript

## Code Evaluation

* Python interpreter
* SQLite in-memory database

---

# Project Structure

```
codehunt-lan-exam-system

server.js
database.js
round3Evaluator.js

package.json
package-lock.json

public/
    index.html

codehunt.db
codehunt.db-shm
codehunt.db-wal
```

---

# Installation

Clone the repository

```
git clone https://github.com/YOUR_USERNAME/codehunt-lan-exam-system
```

Move into the project directory

```
cd codehunt-lan-exam-system
```

Install dependencies

```
npm install
```

Start the server

```
node server.js
```

Server will run on:

```
http://localhost:3000
```

Other machines on the same LAN can access the system using the server machine's IP address.

Example:

```
http://192.168.x.x:3000
```

---

# Database

The system uses **SQLite**.

Database file:

```
codehunt.db
```

Tables included in the system:

* participants
* attempts
* round1_questions
* round2_questions
* round3_python_questions
* round3_sql_questions
* rounds

---

# Leaderboard Export

Leaderboard results can be exported using SQLite commands.

Example:

```
sqlite3 codehunt.db
.headers on
.mode csv
.output leaderboard.csv
```

Ranking is calculated using:

* Total Marks
* Time Taken

---

# Limitations

This system is designed primarily for **controlled LAN environments**.

Some components such as:

* password storage
* Python code execution

are implemented for simplicity and may require additional security measures for internet deployment.

---

# Author

Kowshik
B.Tech – Computer Science and Engineering (Data Science)

---

# Purpose

This project was developed to create a structured platform for conducting coding competitions within a local network environment while minimizing manual evaluation and coordination effort.
