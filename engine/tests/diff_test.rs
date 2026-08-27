use openapiv3::{OpenAPI, Paths, ReferenceOr, PathItem, Info, Operation, Responses, RequestBody, MediaType, Schema, SchemaKind, Type, ObjectType};
use indexmap::IndexMap;
use break_detector_engine::diff::compare_specs;
use break_detector_engine::config::TM3LConfig;

fn create_schema(required: Vec<&str>) -> Schema {
    let mut obj = ObjectType::default();
    for r in required {
        obj.required.push(r.to_string());
    }
    Schema {
        schema_data: Default::default(),
        schema_kind: SchemaKind::Type(Type::Object(obj)),
    }
}

#[test]
fn test_detect_new_required_field() {
    let mut base = OpenAPI::default();
    let mut target = OpenAPI::default();
    
    let mut base_path = PathItem::default();
    let mut target_path = PathItem::default();
    
    let mut base_op = Operation { responses: Responses::default(), ..Default::default() };
    let mut target_op = Operation { responses: Responses::default(), ..Default::default() };
    
    let mut base_req = RequestBody::default();
    let mut target_req = RequestBody::default();
    
    let mut base_media = MediaType::default();
    let mut target_media = MediaType::default();
    
    // Base has NO required fields
    base_media.schema = Some(ReferenceOr::Item(create_schema(vec![])));
    
    // Target REQUIRES "email"
    target_media.schema = Some(ReferenceOr::Item(create_schema(vec!["email"])));
    
    base_req.content.insert("application/json".to_string(), base_media);
    target_req.content.insert("application/json".to_string(), target_media);
    
    base_op.request_body = Some(ReferenceOr::Item(base_req));
    target_op.request_body = Some(ReferenceOr::Item(target_req));
    
    base_path.post = Some(base_op);
    target_path.post = Some(target_op);
    
    base.paths.paths.insert("/users".to_string(), ReferenceOr::Item(base_path));
    target.paths.paths.insert("/users".to_string(), ReferenceOr::Item(target_path));

    let result = compare_specs(&base, &target, &TM3LConfig::default());

    assert_eq!(result.summary.breaking, 1);
    assert_eq!(result.changes[0].severity, "BREAKING");
    assert_eq!(result.changes[0].path, "paths./users.post.requestBody.email");
    assert_eq!(result.changes[0].description, "Field 'email' was made required, but it was optional before.");
}

fn create_string_enum_schema(values: Vec<&str>) -> Schema {
    let mut s = openapiv3::StringType::default();
    for v in values {
        s.enumeration.push(Some(v.to_string()));
    }
    Schema {
        schema_data: Default::default(),
        schema_kind: SchemaKind::Type(Type::String(s)),
    }
}

fn create_integer_schema() -> Schema {
    Schema {
        schema_data: Default::default(),
        schema_kind: SchemaKind::Type(Type::Integer(openapiv3::IntegerType::default())),
    }
}

fn wrap_in_endpoint(schema: Schema) -> OpenAPI {
    let mut spec = OpenAPI::default();
    let mut path = PathItem::default();
    let mut op = Operation { responses: Responses::default(), ..Default::default() };
    let mut req = RequestBody::default();
    let mut media = MediaType::default();
    
    media.schema = Some(ReferenceOr::Item(schema));
    req.content.insert("application/json".to_string(), media);
    op.request_body = Some(ReferenceOr::Item(req));
    path.post = Some(op);
    spec.paths.paths.insert("/test".to_string(), ReferenceOr::Item(path));
    
    spec
}

#[test]
fn test_detect_enum_value_removed() {
    let base_schema = create_string_enum_schema(vec!["ACTIVE", "PENDING", "CLOSED"]);
    let target_schema = create_string_enum_schema(vec!["ACTIVE", "CLOSED"]); // PENDING removed
    
    let base = wrap_in_endpoint(base_schema);
    let target = wrap_in_endpoint(target_schema);
    
    let result = compare_specs(&base, &target, &TM3LConfig::default());
    assert_eq!(result.summary.breaking, 1);
    assert_eq!(result.changes[0].description, "Enum value 'PENDING' was removed.");
}

#[test]
fn test_detect_data_type_changed() {
    let base_schema = create_integer_schema();
    let target_schema = create_string_enum_schema(vec![]);
    
    let base = wrap_in_endpoint(base_schema);
    let target = wrap_in_endpoint(target_schema);
    
    let result = compare_specs(&base, &target, &TM3LConfig::default());
    assert_eq!(result.summary.breaking, 1);
    assert_eq!(result.changes[0].description, "Data type changed from 'integer' to 'string'.");
}
