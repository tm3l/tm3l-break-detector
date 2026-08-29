use crate::models::{Change, IPCResponse, Summary};
use regex::Regex;

pub fn check_terraform_migration(code: &str) -> IPCResponse {
    let mut changes = Vec::new();
    let mut breaking = 0;

    // Pattern to catch Terraform destroy actions for stateful resources
    // Usually it looks like: "- resource \"aws_db_instance\"" or "will be destroyed"
    // Let's check for lines that have "-" or "destroy" and a stateful resource type.
    let stateful_resources = ["aws_db_instance", "aws_rds_cluster", "aws_s3_bucket", "aws_dynamodb_table"];

    for (i, line) in code.lines().enumerate() {
        let line_num = i + 1;
        
        let is_destroy_indicator = line.trim().starts_with("- ") || line.contains("will be destroyed") || line.contains("- destroy");
        
        if is_destroy_indicator {
            for res in &stateful_resources {
                if line.contains(res) {
                    changes.push(Change {
                        severity: "BREAKING".to_string(),
                        path: format!("line:L{}", line_num),
                        description: format!("Destructive operation detected on stateful resource: {}", res),
                        citation: "Terraform Stateful Resource Deletion".to_string(),
                        proposed_fix: "Ensure that data is backed up before destroying stateful resources. Consider retaining the resource or migrating data first.".to_string(),
                    });
                    breaking += 1;
                    break;
                }
            }
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
