const express = require('express');
const session = require('express-session');
const db = require('./database');

const { evaluatePython, evaluateSQL } = require("./round3Evaluator");

const app = express();

app.use(express.json());
app.use(express.static('public'));

app.use(session({
    secret: 'codehunt_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// ================= LOGIN =================

app.post('/login', (req, res) => {

    const { login_id, password } = req.body;

    db.get(
        "SELECT * FROM participants WHERE login_id=? AND password=?",
        [login_id, password],
        (err, row) => {

            if (!row)
                return res.json({ success: false });

            req.session.user = {
                id: row.id,
                name: row.name
            };

            res.json({ success: true });
        }
    );
});

// ================= SESSION CHECK =================

app.get('/session', (req, res) => {

    if (req.session.user) {
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});

// ================= LOGOUT =================

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// ================= START SERVER =================

app.listen(3000, '0.0.0.0', () => {
    console.log("Server running on port 3000");
});

// ================= RESUME INFO =================

app.get('/resume', (req, res) => {

    if (!req.session.user) {
        return res.json({ resume: false });
    }

    const userId = req.session.user.id;

    db.all(
        "SELECT round_number, completed FROM attempts WHERE participant_id=?",
        [userId],
        (err, rows) => {

            if (err || !rows) {
                return res.json({ resume: false });
            }

            let r1 = rows.find(r => r.round_number === 1);
            let r2 = rows.find(r => r.round_number === 2);
            let r3 = rows.find(r => r.round_number === 3);

            if (!r1) return res.json({ stage: "round1_instructions" });

            if (r1 && r1.completed === 0)
                return res.json({ stage: "round1_test" });

            if (!r2)
                return res.json({ stage: "round2_instructions" });

            if (r2 && r2.completed === 0)
                return res.json({ stage: "round2_test" });

            if (r2 && r2.completed === 1 && !r3) {

                db.get(
                    "SELECT qualification_seen FROM participants WHERE id=?",
                    [userId],
                    (err, row) => {

                        if (!row || row.qualification_seen === 0) {
                            return res.json({ stage: "qualification" });
                        }

                        return res.json({ stage: "round3_instructions" });
                    }
                );

                return;
            }

            if (r3 && r3.completed === 0)
                return res.json({ stage: "round3_test" });

            if (r3 && r3.completed === 1)
                return res.json({ stage: "final" });

            res.json({ resume: false });
        }
    );
});

// ================= FETCH QUESTIONS =================

app.get('/questions', (req, res) => {

    if (!req.session.user) {
        return res.status(403).json([]);
    }

    const round = Number(req.query.round);

    console.log("ROUND REQUESTED:", round);

    // ================= ROUND 1 =================
    if (round === 1) {

        const languages = ['C', 'HTML', 'Java', 'Python', 'SQL'];
        let selected = [];
        let done = 0;

        languages.forEach(lang => {

            db.all(
                "SELECT * FROM round1_questions WHERE language=? ORDER BY RANDOM() LIMIT 4",
                [lang],
                (err, rows) => {

                    if (rows) selected = selected.concat(rows);
                    done++;

                    if (done === languages.length) {

                        selected.sort(() => Math.random() - 0.5);

                        const formatted = selected.map(q => {

                            let options = [
                                q.option1,
                                q.option2,
                                q.option3,
                                q.option4
                            ];

                            options.sort(() => Math.random() - 0.5);

                            return {
                                id: q.id,
                                question: q.question,
                                options
                            };
                        });

                        return res.json(formatted);
                    }
                }
            );
        });

        return;
    }

    // ================= ROUND 2 =================
    if (round === 2) {

        const languages = req.session.round2Languages;

        if (!languages || languages.length === 0) {
            return res.json([]);
        }

        let collected = [];
        let done = 0;

        languages.forEach(lang => {

            db.all(
                "SELECT id, question FROM round2_questions WHERE language=? ORDER BY RANDOM() LIMIT 5",
                [lang],
                (err, rows) => {

                    if (rows) collected = collected.concat(rows);
                    done++;

                    if (done === languages.length) {

                        collected.sort(() => Math.random() - 0.5);

                        return res.json(collected);
                    }
                }
            );
        });

        return;
    }

    // ================= ROUND 3 =================
    if (round === 3) {

        db.all(
            "SELECT id, question FROM round3_python_questions ORDER BY RANDOM() LIMIT 2",
            [],
            (err, pyRows) => {

                if (err) {
                    console.log("PY ERROR:", err);
                    return res.json([]);
                }

                db.all(
                    "SELECT id, question FROM round3_sql_questions ORDER BY RANDOM() LIMIT 3",
                    [],
                    (err2, sqlRows) => {

                        if (err2) {
                            console.log("SQL ERROR:", err2);
                            return res.json([]);
                        }

                        const pythonQuestions = pyRows.map(q => ({
                            id: "py_" + q.id,
                            type: "python",
                            question: q.question
                        }));

                        const sqlQuestions = sqlRows.map(q => ({
                            id: "sql_" + q.id,
                            type: "sql",
                            question: q.question
                        }));

                        const all = [...pythonQuestions, ...sqlQuestions];

                        all.sort(() => Math.random() - 0.5);

                        return res.json(all);
                    }
                );
            }
        );

        return;
    }

    // ================= DEFAULT =================
    return res.json([]);
});

// ================= ROUND DURATION =================

app.get('/round-duration', (req, res) => {

    const round = parseInt(req.query.round);

    db.get(
        "SELECT duration_ms FROM rounds WHERE round_number=?",
        [round],
        (err, row) => {

            if (err || !row) {
                return res.json({ duration_ms: 0 });
            }

            res.json({ duration_ms: row.duration_ms });

        }
    );

});

// ================= START ATTEMPT =================

app.post('/start-round', (req, res) => {

    if (!req.session.user)
        return res.json({ success: false });

    const userId = req.session.user.id;
    const round = parseInt(req.body.round);

    db.get(
        "SELECT * FROM attempts WHERE participant_id=? AND round_number=?",
        [userId, round],
        (err, row) => {

            if (row)
                return res.json({ success: true });

            db.run(
                "INSERT INTO attempts (participant_id, round_number, start_time) VALUES (?, ?, ?)",
                [userId, round, Date.now()],
                () => {
                    res.json({ success: true });
                }
            );

        }
    );

});

// ================= SUBMIT ROUND =================

app.post('/submit', (req, res) => {

    if (!req.session.user)
        return res.status(403).json({ score: 0 });

    const userId = req.session.user.id;
    const round = parseInt(req.query.round);
    const { answers, timeTaken } = req.body;

    if (!answers || answers.length === 0)
        return res.json({
            score: 0,
            total_score: 0
        });

    // ================= PREVENT DOUBLE SUBMISSION =================

    db.get(
        "SELECT completed FROM attempts WHERE participant_id=? AND round_number=?",
        [userId, round],
        (err, attemptRow) => {

            if (!attemptRow) {
                return res.json({
                    score: 0,
                    total_score: 0
                });
            }

            if (attemptRow.completed === 1) {
                db.get(
                    "SELECT score FROM attempts WHERE participant_id=? AND round_number=?",
                    [userId, round],
                    (err, row) => {

                        db.get(
                            "SELECT total_score FROM participants WHERE id=?",
                            [userId],
                            (err2, userRow) => {

                                return res.json({
                                    score: row ? row.score : 0,
                                    total_score: userRow ? userRow.total_score : 0
                                });

                            }
                        );

                    }
                );
                return;
            }

            processSubmission();
        }
    );

    // ================= MAIN SUBMISSION LOGIC =================

    function processSubmission() {

        function finalizeScore(score) {

            db.run(
                "UPDATE attempts SET score=?, completed=1, time_taken=? WHERE participant_id=? AND round_number=?",
                [score, timeTaken || 0, userId, round],
                function (err) {

                    if (err) {
                        console.log("Attempt update failed:", err);
                        return res.json({ score: 0, total_score: 0 });
                    }

                    if (this.changes === 0) {
                        console.log("No attempt row updated!");
                        return res.json({ score: 0, total_score: 0 });
                    }

                    // Recalculate total score
                    db.get(
                        "SELECT SUM(score) as totalScore, SUM(time_taken) as totalTime FROM attempts WHERE participant_id=?",
                        [userId],
                        (err, totalRow) => {

                            if (err) {
                                console.log("Total calculation error:", err);
                                return res.json({ score: 0, total_score: 0 });
                            }

                            const totalScore = totalRow && totalRow.totalScore
                                ? totalRow.totalScore
                                : 0;

                            const totalTime = totalRow && totalRow.totalTime
                                ? totalRow.totalTime
                                : 0;

                            db.run(
                                "UPDATE participants SET total_score=?, total_time=? WHERE id=?",
                                [totalScore, totalTime, userId],
                                function (err2) {

                                    if (err2) {
                                        console.log("Participant update error:", err2);
                                        return res.json({ score: 0, total_score: 0 });
                                    }

                                    res.json({
                                        score,
                                        total_score: totalScore,
                                        total_time: totalTime
                                    });

                                }
                            );

                        }
                    );
                }
            );
        }

        // ================= ROUND 3 (Sandbox Evaluation) =================
        if (round === 3) {

            const promises = answers.map(ans => {

                if (ans.id.startsWith("py_")) {

                    const id = ans.id.replace("py_", "");

                    return new Promise(resolve => {

                        db.get(
                            "SELECT * FROM round3_python_questions WHERE id=?",
                            [id],
                            (err, row) => {

                                if (!row) return resolve(0);

                                evaluatePython(
                                    ans.answer,
                                    row.expected_input,
                                    row.expected_output,
                                    (result) => {
                                        resolve(result ? row.marks : 0);
                                    }
                                );
                            }
                        );
                    });

                } else if (ans.id.startsWith("sql_")) {

                    const id = ans.id.replace("sql_", "");

                    return new Promise(resolve => {

                        db.get(
                            "SELECT * FROM round3_sql_questions WHERE id=?",
                            [id],
                            (err, row) => {

                                if (!row) return resolve(0);

                                evaluateSQL(
                                    ans.answer,
                                    row.table_schema_json,
                                    row.table_data_json,
                                    row.expected_result_json,
                                    (result) => {
                                        resolve(result ? row.marks : 0);
                                    }
                                );
                            }
                        );
                    });
                }

                return Promise.resolve(0);
            });

            Promise.all(promises)
                .then(results => {
                    const totalScore = results.reduce((a, b) => a + b, 0);
                    finalizeScore(totalScore);
                })
                .catch(() => {
                    finalizeScore(0);
                });
            return;
        }

        let table = "";
        let correctColumn = "";
        let marksPerQuestion = 1;

        if (round === 1) {
            table = "round1_questions";
            correctColumn = "correct_option";
            marksPerQuestion = 1;
        }
        else if (round === 2) {
            table = "round2_questions";
            correctColumn = "correct_answer";
            marksPerQuestion = 2;
        }

        if (round === 1 || round === 2) {

            const promises = answers.map(ans => {

                return new Promise(resolve => {

                    db.get(
                        `SELECT ${correctColumn} FROM ${table} WHERE id=?`,
                        [ans.id],
                        (err, row) => {

                            if (!row) return resolve(0);

                            let correct = (row[correctColumn] || "").trim();
                            let given = (ans.answer || "").trim();

                            if (round === 2) {

                                correct = correct.replace(/;$/, '');
                                given = given.replace(/;$/, '');

                                correct = correct.replace(/\s+/g, '');
                                given = given.replace(/\s+/g, '');

                                correct = correct.toLowerCase();
                                given = given.toLowerCase();
                            }

                            resolve(given === correct ? marksPerQuestion : 0);
                        }
                    );

                });

            });

            Promise.all(promises)
                .then(results => {

                    const totalScore = results.reduce((a, b) => a + b, 0);
                    finalizeScore(totalScore);

                })
                .catch(() => {
                    finalizeScore(0);
                });

            return;
        }
    }
});

// ================= SAVE ROUND 2 LANGUAGE SELECTION =================
app.post('/select-track', (req, res) => {
    
    if (!req.session.user)
        return res.status(403).json({ success: false });

    req.session.round2Selected = true;

    const { track } = req.body;

    if (track === "A") {
        req.session.round2Languages = ["Java", "Python", "C"];
    }
    else if (track === "B") {
        req.session.round2Languages = ["C", "SQL", "HTML"];
    }
    else {
        return res.json({ success: false });
    }

    res.json({ success: true });

});

// ================= QUALIFICATION VIEWED =================
app.post('/qualification-viewed', (req, res) => {

    if (!req.session.user)
        return res.status(403).json({ ok: false });

    const userId = req.session.user.id;

    db.run(
        "UPDATE participants SET qualification_seen = 1 WHERE id=?",
        [userId],
        function(err){

            if(err){
                console.log("Qualification flag error:", err);
                return res.json({ ok:false });
            }

            res.json({ ok:true });
        }
    );
});

// ================= GET TOTAL SCORE =================
app.get('/getTotalScore', (req, res) => {

    if (!req.session.user)
        return res.status(403).json({ total_score: 0 });

    const userId = req.session.user.id;

    db.get(
        "SELECT total_score FROM participants WHERE id=?",
        [userId],
        (err, row) => {

            if (err || !row)
                return res.json({ total_score: 0 });

            res.json({ total_score: row.total_score || 0 });
        }
    );
});