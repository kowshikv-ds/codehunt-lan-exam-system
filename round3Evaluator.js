const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const MAX_CONCURRENT = 3;
let activeProcesses = 0;
let queue = [];

function runQueued(task) {
    if (activeProcesses < MAX_CONCURRENT) {
        activeProcesses++;
        task();
    } else {
        queue.push(task);
    }
}

function nextInQueue() {
    activeProcesses--;
    if (queue.length > 0) {
        const nextTask = queue.shift();
        activeProcesses++;
        nextTask();
    }
}

function evaluatePython(userCode, inputValue, expectedOutput, callback){

    // Indent user code inside solve()
    const indentedCode = userCode
        .split("\n")
        .map(line => "    " + line)
        .join("\n");

    const wrappedCode = `
def solve(n):
${indentedCode}

try:
    result = solve(${inputValue})
    print(result)
except Exception:
    print("ERROR")
`;

    const tempFile = `temp_${Date.now()}_${Math.random()}.py`;

    fs.writeFileSync(tempFile, wrappedCode);

    runQueued(() => {

        exec(`python ${tempFile}`, { timeout: 2000 }, (error, stdout, stderr) => {

            if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
            }

            let result = false;

            if (!error && !stderr) {
                const actual = String(stdout).trim();
                const expected = String(expectedOutput).trim();
                result = actual === expected;
            }

            callback(result);
            nextInQueue();
        });

    });
}

const sqlite3 = require("sqlite3").verbose();

function evaluateSQL(userQuery, schemaJSON, dataJSON, expectedJSON, callback){

    if(!userQuery.trim().toLowerCase().startsWith("select")){
        return callback(false);
    }

    userQuery = userQuery.trim().replace(/;$/, "");

    const db = new sqlite3.Database(":memory:");

    db.serialize(() => {

        try {

            const schema = JSON.parse(schemaJSON);
            const data   = JSON.parse(dataJSON);
            const expected = JSON.parse(expectedJSON);

            // Create tables
            for(const tableName in schema){

                const columns = schema[tableName];
                const colDefs = Object.entries(columns)
                    .map(([col, type]) => `${col} ${type}`)
                    .join(", ");

                db.run(`CREATE TABLE ${tableName} (${colDefs})`);
            }

            // Insert data
            for(const tableName in data){

                data[tableName].forEach(row => {

                    const columns = Object.keys(row);
                    const placeholders = columns.map(() => "?").join(", ");
                    const values = Object.values(row);

                    db.run(
                        `INSERT INTO ${tableName} (${columns.join(",")}) VALUES (${placeholders})`,
                        values
                    );
                });
            }

            db.all(userQuery, [], (err, rows) => {

                if(err){
                    db.close();
                    return callback(false);
                }

                if(!userQuery.toLowerCase().includes("order by")){
                    rows.sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
                    expected.sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
                }

                const resultJSON = JSON.stringify(rows);
                db.close();

                callback(resultJSON === JSON.stringify(expected));
            });

        } catch(e){
            db.close();
            callback(false);
        }

    });
}

module.exports = { evaluatePython, evaluateSQL };