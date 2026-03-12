const sqlite3 = require('sqlite3').verbose();

const path = require('path');
const db = new sqlite3.Database(
    path.join(__dirname, 'codehunt.db'),
    (err) => {
        if (err) {
            console.error("Database error:", err);
        } else {
            console.log("Database connected at:", path.join(__dirname, 'codehunt.db'));
        }
    }
);

db.serialize(() => {

    db.run("PRAGMA journal_mode=WAL;");
    db.run("PRAGMA synchronous=NORMAL;");

    // Participants
    db.run(`
        CREATE TABLE IF NOT EXISTS participants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            login_id TEXT UNIQUE,
            password TEXT,
            total_score INTEGER DEFAULT 0,
            total_time INTEGER DEFAULT 0,
            qualification_seen INTEGER DEFAULT 0
        )
    `);

    // Attempts
    db.run(`
        CREATE TABLE IF NOT EXISTS attempts (
            participant_id INTEGER,
            round_number INTEGER,
            start_time INTEGER,
            completed INTEGER DEFAULT 0,
            score INTEGER DEFAULT 0,
            time_taken INTEGER DEFAULT 0,
            PRIMARY KEY (participant_id, round_number)
        )
    `);

    // Round 1 MCQs
    db.run(`
        CREATE TABLE IF NOT EXISTS round1_questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            language TEXT,
            question TEXT,
            option1 TEXT,
            option2 TEXT,
            option3 TEXT,
            option4 TEXT,
            correct_option TEXT
        )
    `);

    // Round 2 Questions
    db.run(`
        CREATE TABLE IF NOT EXISTS round2_questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            language TEXT,
            question TEXT,
            correct_answer TEXT
        )
    `);

    // Round 3 Python Questions
    db.run(`
        CREATE TABLE IF NOT EXISTS round3_python_questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question TEXT,
            expected_input INTEGER,
            expected_output INTEGER,
            marks INTEGER DEFAULT 5
        )
    `);

    // Round 3 SQL Questions
    db.run(`
        CREATE TABLE IF NOT EXISTS round3_sql_questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question TEXT,
            table_schema_json TEXT,
            table_data_json TEXT,
            expected_result_json TEXT,
            marks INTEGER DEFAULT 5
        )
    `);


    // Round durations
    db.run(`
        CREATE TABLE IF NOT EXISTS rounds (
            round_number INTEGER PRIMARY KEY,
            duration_ms INTEGER
        )
    `);

    // Insert default durations if not exist
    db.run(`INSERT OR IGNORE INTO rounds VALUES (1, 600000)`);  // 10 min
    db.run(`INSERT OR IGNORE INTO rounds VALUES (2, 600000)`);  // 10 min
    db.run(`INSERT OR IGNORE INTO rounds VALUES (3, 1500000)`); // 25 min
});

module.exports = db;




















// ========================= HELP =========================

// 1. Reset attempts for a user:
// DELETE FROM attempts WHERE participant_id = (SELECT id FROM participants WHERE username = '<Username>');
// UPDATE participants SET total_score = 0 WHERE username = '<Username>';

// 2. Reset a user:
// UPDATE participants SET total_score = 0, total_time = 0 WHERE id = <Participant_ID>;
// DELETE FROM attempts WHERE participant_id = <Participant_ID>;

// 3. Add user:
// INSERT INTO participants (username, password, total_score) VALUES ('<Username>', '<password>', 0);

// 4. Delete user:
// DELETE FROM participants WHERE id = <Participant_ID>;
// DELETE FROM attempts WHERE participant_id = <Participant_ID>;

// Get leaderboard CSV (In terminal):
//
// sqlite3 codehunt.db
//
// .headers on
// .mode csv
// .output leaderboard.csv
//
// WITH Ranked AS (
//     SELECT
//         p.name AS Name,
//         p.login_id AS Login_ID,
//         IFNULL((SELECT score FROM attempts 
//                 WHERE participant_id = p.id AND round_number = 1), 0) AS Round_1,
//         IFNULL((SELECT score FROM attempts 
//                 WHERE participant_id = p.id AND round_number = 2), 0) AS Round_2,
//         IFNULL((SELECT score FROM attempts 
//                 WHERE participant_id = p.id AND round_number = 3), 0) AS Round_3,
//         p.total_score AS Total_Marks,
//         p.total_time AS Time_Taken
//     FROM participants p
// )
//
// SELECT
//     ROW_NUMBER() OVER (ORDER BY Total_Marks DESC, Time_Taken ASC) AS Rank,
//     Name,
//     Login_ID,
//     Round_1,
//     Round_2,
//     Round_3,
//     Total_Marks,
//     Time_Taken
// FROM Ranked
// ORDER BY Total_Marks DESC, Time_Taken ASC;
//
// .output stdout
// .exit

// =IF(D2+E2>=30,"Qualified","Disqualified")






// ✅ CORRECT WAY TO RESET DATABASE (SAFE METHOD)
//
// Open terminal:
//
// sqlite3 codehunt.db
//
// 🔹 STEP 1 — Delete Attempts
// DELETE FROM attempts;
//
// 🔹 STEP 2 — Delete Participants
// DELETE FROM participants;
//
// 🔹 STEP 3 — Reset Auto Increment (Important)
//
// Otherwise IDs continue from last number.
//
// Run:
//
// DELETE FROM sqlite_sequence WHERE name='participants';
// DELETE FROM sqlite_sequence WHERE name='attempts';
//
//
// Now IDs restart from 1.
//
// 🔹 STEP 4 — Verify
// SELECT COUNT(*) FROM participants;
// SELECT COUNT(*) FROM attempts;
//
//
// Both should return 0.
//
// 🔹 STEP 5 — Exit
// .exit