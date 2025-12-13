const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const db = new sqlite3.Database('./data/dev.sqlite');

db.serialize(() => {
    db.all("SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", (err, tables) => {
        if (err) throw err;

        let output = "";

        // Export CREATE TABLE statements
        tables.forEach(t => {
            if (t.sql) output += t.sql + ";\n\n";
        });

        // Export INSERT statements
        db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", (err, tableNames) => {
            if (err) throw err;

            let pending = tableNames.length;

            tableNames.forEach(table => {
                db.all(`SELECT * FROM ${table.name}`, (err, rows) => {
                    if (err) throw err;

                    rows.forEach(row => {
                        const columns = Object.keys(row).join(", ");
                        const values = Object.values(row)
                            .map(v => typeof v === 'string' ? `'${v.replace(/'/g,"''")}'` : v)
                            .join(", ");

                        output += `INSERT INTO ${table.name} (${columns}) VALUES (${values});\n`;
                    });

                    if (--pending === 0) {
                        fs.writeFileSync('sqlite-export.sql', output);
                        console.log("✅ SQLite export created: sqlite-export.sql");
                        db.close();
                    }
                });
            });
        });
    });
});
