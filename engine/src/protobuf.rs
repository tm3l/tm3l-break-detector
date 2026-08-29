use crate::models::{Change, IPCResponse, Summary};
use regex::Regex;

pub fn check_protobuf_migration(code: &str) -> IPCResponse {
    let mut changes = Vec::new();
    let mut breaking = 0;

    let removed_field_re = Regex::new(r"^\s*-\s*(optional|repeated|required)?\s*(\w+)\s+(\w+)\s*=\s*(\d+)\s*;").unwrap();

    for (i, line) in code.lines().enumerate() {
        let line_num = i + 1;
        
        if let Some(caps) = removed_field_re.captures(line) {
            let field_name = caps.get(3).map_or("", |m| m.as_str());
            let tag = caps.get(4).map_or("", |m| m.as_str());
            changes.push(Change {
                severity: "BREAKING".to_string(),
                path: format!("line:L{}", line_num),
                description: format!("Removed Protobuf field: {} with tag {}", field_name, tag),
                citation: "Protobuf Schema Breaking Change".to_string(),
                proposed_fix: "Reserve the tag and name to prevent accidental reuse in the future.".to_string(),
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
