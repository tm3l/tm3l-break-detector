use break_detector_engine::config::TM3LConfig;
use break_detector_engine::diff::compare_specs;
use openapiv3::{OpenAPI, Operation, PathItem, Paths, ReferenceOr, Responses};

fn make_api_with_get(path: &str) -> OpenAPI {
    let mut api = OpenAPI::default();
    let mut paths = indexmap::IndexMap::new();
    paths.insert(
        path.to_string(),
        ReferenceOr::Item(PathItem {
            get: Some(Operation {
                responses: Responses::default(),
                ..Default::default()
            }),
            ..Default::default()
        }),
    );
    api.paths = Paths {
        paths,
        extensions: indexmap::IndexMap::new(),
    };
    api
}

#[test]
fn test_default_config_detects_removed_endpoint() {
    let base = make_api_with_get("/users");
    let target = OpenAPI::default();
    let config = TM3LConfig::default();
    let res = compare_specs(&base, &target, &config);
    assert_eq!(res.summary.breaking, 1);
}

#[test]
fn test_ignore_removed_endpoint() {
    let base = make_api_with_get("/users");
    let target = OpenAPI::default();
    let config = TM3LConfig {
        ignore_rules: vec!["removed_endpoint".to_string()],
        ..Default::default()
    };
    let res = compare_specs(&base, &target, &config);
    assert_eq!(res.summary.breaking, 0);
}

#[test]
fn test_allow_type_coercion_suppresses_type_change() {
    let base_json = r#"{
        "openapi": "3.0.0",
        "info": { "title": "t", "version": "1" },
        "paths": {
            "/u": {
                "post": {
                    "requestBody": {
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "age": { "type": "integer" }
                                    }
                                }
                            }
                        }
                    },
                    "responses": { "200": { "description": "ok" } }
                }
            }
        }
    }"#;
    let target_json = r#"{
        "openapi": "3.0.0",
        "info": { "title": "t", "version": "1" },
        "paths": {
            "/u": {
                "post": {
                    "requestBody": {
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "age": { "type": "string" }
                                    }
                                }
                            }
                        }
                    },
                    "responses": { "200": { "description": "ok" } }
                }
            }
        }
    }"#;
    let base: OpenAPI = serde_json::from_str(base_json).expect("valid base json");
    let target: OpenAPI = serde_json::from_str(target_json).expect("valid target json");

    let strict_config = TM3LConfig::default();
    let strict_res = compare_specs(&base, &target, &strict_config);
    assert_eq!(
        strict_res.summary.breaking, 1,
        "Strict mode must detect type change"
    );

    let lenient_config = TM3LConfig {
        allow_type_coercion: true,
        ..Default::default()
    };
    let lenient_res = compare_specs(&base, &target, &lenient_config);
    assert_eq!(
        lenient_res.summary.breaking, 0,
        "allow_type_coercion must suppress type change"
    );
}
