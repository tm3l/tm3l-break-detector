use serde::Serialize;

#[derive(Serialize, Debug, PartialEq)]
pub struct Summary {
    pub breaking: usize,
    pub dangerous: usize,
    pub additive: usize,
}

#[derive(Serialize, Debug, PartialEq)]
pub struct Change {
    pub severity: String, // "BREAKING", "DANGEROUS", "ADDITIVE"
    pub path: String,
    pub description: String,
    pub citation: String,
    pub proposed_fix: String,
}

#[derive(Serialize, Debug, PartialEq)]
pub struct IPCResponse {
    pub summary: Summary,
    pub changes: Vec<Change>,
}
