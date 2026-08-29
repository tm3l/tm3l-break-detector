use crate::models::{Change, IPCResponse, Summary};
use regex::Regex;

pub fn check_graphql_migration(code: &str) -> IPCResponse {
    let mut changes = Vec::new();
    let mut breaking = 0;

    let removed_field_re = Regex::new(r"^\s*-\s*(\w+)\s*:").unwrap();
    let removed_type_re = Regex::new(r"^\s*-\s*(type|interface|enum|union)\s+(\w+)").unwrap();

    for (i, line) in code.lines().enumerate() {
        let line_num = i + 1;
        
        if let Some(caps) = removed_field_re.captures(line) {
            let field_name = caps.get(1).map_or("", |m| m.as_str());
            changes.push(Change {
                severity: "BREAKING".to_string(),
                path: format!("line:L{}", line_num),
                description: format!("Removed GraphQL field: {}", field_name),
                citation: "GraphQL Schema Breaking Change".to_string(),
                proposed_fix: "Deprecate the field using @deprecated before removing it entirely.".to_string(),
            });
            breaking += 1;
        }

        if let Some(caps) = removed_type_re.captures(line) {
            let kind = caps.get(1).map_or("", |m| m.as_str());
            let name = caps.get(2).map_or("", |m| m.as_str());
            changes.push(Change {
                severity: "BREAKING".to_string(),
                path: format!("line:L{}", line_num),
                description: format!("Removed GraphQL {}: {}", kind, name),
                citation: "GraphQL Schema Breaking Change".to_string(),
                proposed_fix: "Ensure clients are no longer relying on this type before removal.".to_string(),
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
