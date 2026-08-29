use crate::models::{Change, IPCResponse, Summary};
use regex::Regex;

pub fn check_sql_migration(code: &str) -> IPCResponse {
    let mut changes = Vec::new();
    let mut breaking = 0;

    let drop_table_re = Regex::new(r"(?i)\bDROP\s+TABLE\s+(\w+)").unwrap();
    let alter_drop_col_re = Regex::new(r"(?i)\bALTER\s+TABLE\s+(\w+)\s+DROP\s+COLUMN\s+(\w+)").unwrap();

    for (i, line) in code.lines().enumerate() {
        let line_num = i + 1;
        
        if let Some(caps) = drop_table_re.captures(line) {
            let table = caps.get(1).map_or("", |m| m.as_str());
            changes.push(Change {
                severity: "BREAKING".to_string(),
                path: format!("line:L{}", line_num),
                description: format!("Destructive operation detected: DROP TABLE {}", table),
                citation: "SQL Destructive Operation".to_string(),
                proposed_fix: "Review this migration carefully. Consider archiving or renaming the table instead.".to_string(),
            });
            breaking += 1;
        }

        if let Some(caps) = alter_drop_col_re.captures(line) {
            let table = caps.get(1).map_or("", |m| m.as_str());
            let col = caps.get(2).map_or("", |m| m.as_str());
            changes.push(Change {
                severity: "BREAKING".to_string(),
                path: format!("line:L{}", line_num),
                description: format!("Destructive operation detected: ALTER TABLE {} DROP COLUMN {}", table, col),
                citation: "SQL Destructive Operation".to_string(),
                proposed_fix: "Review this migration carefully. Dropping columns can break existing queries.".to_string(),
            });
            breaking += 1;
        }
    }

    IPCResponse {
        summary: Summary {
            breaking,
            dangerous: 0,
            additive: 0,
        },
        changes,
    }
}
