use break_detector_engine::config::TM3LConfig;
use break_detector_engine::diff::compare_specs;
use openapiv3::{
    MediaType, ObjectType, OpenAPI, Operation, PathItem, ReferenceOr, RequestBody, Responses,
    Schema, SchemaKind, Type,
};

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

    let mut base_op = Operation {
        responses: Responses::default(),
        ..Default::default()
    };
    let mut target_op = Operation {
        responses: Responses::default(),
        ..Default::default()
    };

    let mut base_req = RequestBody::default();
    let mut target_req = RequestBody::default();

    let base_media = MediaType {
        schema: Some(ReferenceOr::Item(create_schema(vec![]))),
        ..Default::default()
    };

    let target_media = MediaType {
        schema: Some(ReferenceOr::Item(create_schema(vec!["email"]))),
        ..Default::default()
    };

    base_req
        .content
        .insert("application/json".to_string(), base_media);
    target_req
        .content
        .insert("application/json".to_string(), target_media);

    base_op.request_body = Some(ReferenceOr::Item(base_req));
    target_op.request_body = Some(ReferenceOr::Item(target_req));

    base_path.post = Some(base_op);
    target_path.post = Some(target_op);

    base.paths
        .paths
        .insert("/users".to_string(), ReferenceOr::Item(base_path));
    target
        .paths
        .paths
        .insert("/users".to_string(), ReferenceOr::Item(target_path));

    let result = compare_specs(&base, &target, &TM3LConfig::default());

    assert_eq!(result.summary.breaking, 1);
    assert_eq!(result.changes[0].severity, "BREAKING");
    assert_eq!(
        result.changes[0].path,
        "paths./users.post.requestBody.email"
    );
    assert_eq!(
        result.changes[0].description,
        "Field 'email' was made required, but it was optional before."
    );
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
    let mut op = Operation {
        responses: Responses::default(),
        ..Default::default()
    };
    let mut req = RequestBody::default();
    let media = MediaType {
        schema: Some(ReferenceOr::Item(schema)),
        ..Default::default()
    };

    req.content.insert("application/json".to_string(), media);
    op.request_body = Some(ReferenceOr::Item(req));
    path.post = Some(op);
    spec.paths
        .paths
        .insert("/test".to_string(), ReferenceOr::Item(path));

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
    assert_eq!(
        result.changes[0].description,
        "Enum value 'PENDING' was removed."
    );
}

#[test]
fn test_detect_parameter_removed_and_made_required() {
    use openapiv3::{Parameter, ParameterData, ParameterSchemaOrContent};

    let mut base = OpenAPI::default();
    let mut target = OpenAPI::default();

    let mut base_path = PathItem::default();
    let mut target_path = PathItem::default();

    let base_op = Operation {
        parameters: vec![
            ReferenceOr::Item(Parameter::Query {
                parameter_data: ParameterData {
                    name: "filter".to_string(),
                    description: None,
                    required: false,
                    deprecated: None,
                    format: ParameterSchemaOrContent::Schema(ReferenceOr::Item(create_integer_schema())),
                    example: None,
                    examples: Default::default(),
                    explode: None,
                    extensions: Default::default(),
                },
                allow_reserved: false,
                style: Default::default(),
                allow_empty_value: None,
            }),
            ReferenceOr::Item(Parameter::Query {
                parameter_data: ParameterData {
                    name: "limit".to_string(),
                    description: None,
                    required: false,
                    deprecated: None,
                    format: ParameterSchemaOrContent::Schema(ReferenceOr::Item(create_integer_schema())),
                    example: None,
                    examples: Default::default(),
                    explode: None,
                    extensions: Default::default(),
                },
                allow_reserved: false,
                style: Default::default(),
                allow_empty_value: None,
            }),
        ],
        responses: Responses::default(),
        ..Default::default()
    };

    let target_op = Operation {
        parameters: vec![
            // 'filter' removed
            // 'limit' made required: true
            ReferenceOr::Item(Parameter::Query {
                parameter_data: ParameterData {
                    name: "limit".to_string(),
                    description: None,
                    required: true,
                    deprecated: None,
                    format: ParameterSchemaOrContent::Schema(ReferenceOr::Item(create_integer_schema())),
                    example: None,
                    examples: Default::default(),
                    explode: None,
                    extensions: Default::default(),
                },
                allow_reserved: false,
                style: Default::default(),
                allow_empty_value: None,
            }),
        ],
        responses: Responses::default(),
        ..Default::default()
    };

    base_path.get = Some(base_op);
    target_path.get = Some(target_op);

    base.paths.paths.insert("/items".to_string(), ReferenceOr::Item(base_path));
    target.paths.paths.insert("/items".to_string(), ReferenceOr::Item(target_path));

    let result = compare_specs(&base, &target, &TM3LConfig::default());
    assert_eq!(result.summary.breaking, 2);
    let descs: Vec<String> = result.changes.iter().map(|c| c.description.clone()).collect();
    assert!(descs.iter().any(|d| d.contains("parameter 'filter' was removed")));
    assert!(descs.iter().any(|d| d.contains("parameter 'limit' was made required")));
}

#[test]
fn test_detect_response_code_removed() {
    use openapiv3::{Response, StatusCode};

    let mut base = OpenAPI::default();
    let mut target = OpenAPI::default();

    let mut base_path = PathItem::default();
    let mut target_path = PathItem::default();

    let mut base_responses = Responses::default();
    base_responses.responses.insert(
        StatusCode::Code(200),
        ReferenceOr::Item(Response {
            description: "Success".to_string(),
            ..Default::default()
        }),
    );
    base_responses.responses.insert(
        StatusCode::Code(201),
        ReferenceOr::Item(Response {
            description: "Created".to_string(),
            ..Default::default()
        }),
    );

    let mut target_responses = Responses::default();
    target_responses.responses.insert(
        StatusCode::Code(200),
        ReferenceOr::Item(Response {
            description: "Success".to_string(),
            ..Default::default()
        }),
    ); // 201 removed!

    let base_op = Operation {
        responses: base_responses,
        ..Default::default()
    };
    let target_op = Operation {
        responses: target_responses,
        ..Default::default()
    };

    base_path.post = Some(base_op);
    target_path.post = Some(target_op);

    base.paths.paths.insert("/resource".to_string(), ReferenceOr::Item(base_path));
    target.paths.paths.insert("/resource".to_string(), ReferenceOr::Item(target_path));

    let result = compare_specs(&base, &target, &TM3LConfig::default());
    assert_eq!(result.summary.breaking, 1);
    assert!(result.changes[0].description.contains("Response status code '201' was removed"));
}

