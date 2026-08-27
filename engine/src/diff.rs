use openapiv3::{OpenAPI, Schema, ReferenceOr};
use crate::models::{Change, IPCResponse, Summary};
use crate::config::TM3LConfig;

pub fn compare_specs(base: &OpenAPI, target: &OpenAPI, config: &TM3LConfig) -> IPCResponse {
    let mut changes = Vec::new();
    let mut breaking = 0;
    let mut additive = 0;
    let dangerous = 0;

    for (path, base_item_ref) in &base.paths.paths {
        if !target.paths.paths.contains_key(path) {
            if !config.ignore_rules.contains(&"removed_endpoint".to_string()) {
                changes.push(Change {
                    severity: "BREAKING".to_string(),
                    path: format!("paths.{}", path),
                    description: format!("Endpoint '{}' was removed entirely.", path),
                    citation: config.custom_citations.get("removed_endpoint").cloned()
                        .unwrap_or_else(|| "OpenAPI Spec 3.1.0, Section 4.8. Removing paths breaks existing consumers.".to_string()),
                    proposed_fix: "Restore the endpoint and mark it as deprecated instead of removing it.".to_string(),
                });
                breaking += 1;
            }
        } else {
            let base_item = base_item_ref.as_item().unwrap();
            let target_item = target.paths.paths.get(path).unwrap().as_item().unwrap();

            let ops = vec![
                ("GET",    &base_item.get,    &target_item.get),
                ("POST",   &base_item.post,   &target_item.post),
                ("PUT",    &base_item.put,    &target_item.put),
                ("DELETE", &base_item.delete, &target_item.delete),
                ("PATCH",  &base_item.patch,  &target_item.patch),
            ];

            for (method, b_op, t_op) in ops {
                if b_op.is_some() && t_op.is_none() {
                    if !config.ignore_rules.contains(&"removed_method".to_string()) {
                        changes.push(Change {
                            severity: "BREAKING".to_string(),
                            path: format!("paths.{}.{}", path, method.to_lowercase()),
                            description: format!("HTTP Method '{}' was removed from '{}'.", method, path),
                            citation: "RFC 7231. Removing an active HTTP method breaks clients relying on it.".to_string(),
                            proposed_fix: "Restore the method and return a sunset HTTP header or 410 Gone over time.".to_string(),
                        });
                        breaking += 1;
                    }
                } else if let (Some(b), Some(t)) = (b_op, t_op) {
                    if let (Some(ReferenceOr::Item(b_req)), Some(ReferenceOr::Item(t_req))) =
                        (&b.request_body, &t.request_body)
                    {
                        for (media_type, b_content) in &b_req.content {
                            if let Some(t_content) = t_req.content.get(media_type) {
                                if let (
                                    Some(ReferenceOr::Item(b_schema)),
                                    Some(ReferenceOr::Item(t_schema)),
                                ) = (&b_content.schema, &t_content.schema)
                                {
                                    let mut local = diff_schemas(
                                        b_schema, t_schema,
                                        &format!("paths.{}.{}.requestBody", path, method.to_lowercase()),
                                        config,
                                    );
                                    for c in &local {
                                        if c.severity == "BREAKING" { breaking += 1; }
                                        if c.severity == "ADDITIVE" { additive += 1; }
                                    }
                                    changes.append(&mut local);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    IPCResponse { summary: Summary { breaking, dangerous, additive }, changes }
}

fn resolve_schema_ref<'a, T>(schema_ref: &'a ReferenceOr<T>) -> Option<&'a T> {
    match schema_ref {
        ReferenceOr::Item(s) => Some(s),
        ReferenceOr::Reference { .. } => None,
    }
}

fn diff_schemas(base: &Schema, target: &Schema, location: &str, config: &TM3LConfig) -> Vec<Change> {
    let mut changes = Vec::new();

    if let (
        openapiv3::SchemaKind::Type(b_type),
        openapiv3::SchemaKind::Type(t_type),
    ) = (&base.schema_kind, &target.schema_kind)
    {
        let type_name = |t: &openapiv3::Type| match t {
            openapiv3::Type::String(_)  => "string",
            openapiv3::Type::Number(_)  => "number",
            openapiv3::Type::Integer(_) => "integer",
            openapiv3::Type::Object(_)  => "object",
            openapiv3::Type::Array(_)   => "array",
            openapiv3::Type::Boolean(_) => "boolean",
        };

        let b_name = type_name(b_type);
        let t_name = type_name(t_type);
        if b_name != t_name
            && !config.allow_type_coercion
            && !config.ignore_rules.contains(&"type_change".to_string())
        {
            changes.push(Change {
                severity: "BREAKING".to_string(),
                path: location.to_string(),
                description: format!("Data type changed from '{}' to '{}'.", b_name, t_name),
                citation: config.custom_citations.get("type_change").cloned()
                    .unwrap_or_else(|| "Changing a field's data type breaks backwards compatibility.".to_string()),
                proposed_fix: "Keep the original data type or create a new field/endpoint.".to_string(),
            });
        }

        if let (openapiv3::Type::String(b_str), openapiv3::Type::String(t_str)) = (b_type, t_type) {
            if !config.allow_breaking_enums
                && !config.ignore_rules.contains(&"enum_removal".to_string())
            {
                for enum_val in &b_str.enumeration {
                    if !t_str.enumeration.contains(enum_val) {
                        let val_str = enum_val.clone().unwrap_or_else(|| "null".to_string());
                        changes.push(Change {
                            severity: "BREAKING".to_string(),
                            path: location.to_string(),
                            description: format!("Enum value '{}' was removed.", val_str),
                            citation: config.custom_citations.get("enum_removal").cloned()
                                .unwrap_or_else(|| "Removing an enum value breaks backwards compatibility for clients expecting it.".to_string()),
                            proposed_fix: "Restore the enum value.".to_string(),
                        });
                    }
                }
            }
        }

        if let (openapiv3::Type::Object(b_obj), openapiv3::Type::Object(t_obj)) = (b_type, t_type) {
            if !config.ignore_rules.contains(&"new_required_field".to_string()) {
                for req_field in &t_obj.required {
                    if !b_obj.required.contains(req_field) {
                        changes.push(Change {
                            severity: "BREAKING".to_string(),
                            path: format!("{}.{}", location, req_field),
                            description: format!("Field '{}' was made required, but it was optional before.", req_field),
                            citation: config.custom_citations.get("new_required_field").cloned()
                                .unwrap_or_else(|| "Adding a required field to a request breaks backward compatibility for old clients.".to_string()),
                            proposed_fix: "Make the field optional, or introduce a v2 endpoint.".to_string(),
                        });
                    }
                }
            }

            for (prop_name, b_prop_ref) in &b_obj.properties {
                if let Some(t_prop_ref) = t_obj.properties.get(prop_name) {
                    if let (Some(b_prop), Some(t_prop)) =
                        (resolve_schema_ref(b_prop_ref), resolve_schema_ref(t_prop_ref))
                    {
                        let mut sub = diff_schemas(
                            b_prop, t_prop,
                            &format!("{}.{}", location, prop_name),
                            config,
                        );
                        changes.append(&mut sub);
                    }
                }
            }
        }
    }

    changes
}
