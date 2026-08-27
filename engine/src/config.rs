use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Deserialize, Serialize, Default, Clone)]
pub struct TM3LConfig {
    #[serde(default)]
    pub ignore_rules: Vec<String>,
    #[serde(default)]
    pub allow_breaking_enums: bool,
    #[serde(default)]
    pub allow_type_coercion: bool,
    #[serde(default)]
    pub strict_mode: bool,
    #[serde(default)]
    pub custom_citations: HashMap<String, String>,
}
