use anyhow::{Context, Result};
use break_detector_engine::code_diff::check_code_migration;
use break_detector_engine::config::TM3LConfig;
use break_detector_engine::diff::compare_specs;
use clap::Parser;
use std::fs;

#[derive(Parser, Debug)]
#[command(author, version, about)]
struct Args {
    #[arg(long)]
    base: Option<String>,

    #[arg(long)]
    target: String,

    #[arg(long)]
    config: Option<String>,

    #[arg(long, default_value = "openapi")]
    mode: String,

    #[arg(long, default_value = "python")]
    language: String,
}

fn main() -> Result<()> {
    let args = Args::parse();

    let config: TM3LConfig = if let Some(config_path) = args.config {
        let content = fs::read_to_string(&config_path)
            .with_context(|| format!("Failed to read config: {}", config_path))?;
        if config_path.ends_with(".yaml") || config_path.ends_with(".yml") {
            serde_yaml::from_str(&content).context("Failed to parse YAML config")?
        } else {
            serde_json::from_str(&content).context("Failed to parse JSON config")?
        }
    } else {
        TM3LConfig::default()
    };

    if args.mode == "python_migration" || args.mode == "code_migration" {
        let target_file = fs::read_to_string(&args.target)
            .with_context(|| format!("Failed to read source file: {}", args.target))?;
        let lang = if args.mode == "python_migration" && args.language == "python" {
            "python"
        } else {
            &args.language
        };
        let result = check_code_migration(&target_file, lang);
        println!("{}", serde_json::to_string_pretty(&result)?);
        return Ok(());
    }

    let base_path = args.base.context("--base is required in openapi mode")?;
    let base_file = fs::read_to_string(&base_path)
        .with_context(|| format!("Failed to read base spec: {}", base_path))?;
    let target_file = fs::read_to_string(&args.target)
        .with_context(|| format!("Failed to read target spec: {}", args.target))?;

    let base_spec: openapiv3::OpenAPI =
        serde_json::from_str(&base_file).context("Failed to parse base spec as OpenAPI JSON")?;
    let target_spec: openapiv3::OpenAPI = serde_json::from_str(&target_file)
        .context("Failed to parse target spec as OpenAPI JSON")?;

    let result = compare_specs(&base_spec, &target_spec, &config);
    println!("{}", serde_json::to_string_pretty(&result)?);
    Ok(())
}
