use crate::models::{Change, IPCResponse, Summary};
use tree_sitter::{Node, Parser};

pub fn check_code_migration(code: &str, language: &str) -> IPCResponse {
    match language.to_lowercase().as_str() {
        "python" | "py" | "python_migration" => check_python_migration(code),
        "go" | "golang" => check_go_migration(code),
        "typescript" | "ts" | "javascript" | "js" => check_typescript_migration(code),
        _ => check_python_migration(code),
    }
}

pub fn check_python_migration(code: &str) -> IPCResponse {
    let mut parser = Parser::new();
    parser
        .set_language(tree_sitter_python::language())
        .expect("Error loading Python grammar");

    let tree = match parser.parse(code, None) {
        Some(t) => t,
        None => {
            return IPCResponse {
                summary: Summary {
                    breaking: 0,
                    dangerous: 0,
                    additive: 0,
                },
                changes: Vec::new(),
            };
        }
    };

    let mut changes = Vec::new();
    let mut breaking = 0;
    let source_bytes = code.as_bytes();

    walk_python_node(
        tree.root_node(),
        source_bytes,
        code,
        &mut changes,
        &mut breaking,
    );

    IPCResponse {
        summary: Summary {
            breaking,
            dangerous: 0,
            additive: 0,
        },
        changes,
    }
}

fn walk_python_node(
    node: Node,
    source: &[u8],
    full_code: &str,
    changes: &mut Vec<Change>,
    breaking: &mut usize,
) {
    let kind = node.kind();
    let node_text = node.utf8_text(source).unwrap_or("");
    let line_num = node.start_position().row + 1;
    let path = format!("line:L{}", line_num);

    match kind {
        // 1. Python 2 print statement
        "print_statement" => {
            let trimmed = node_text.trim();
            let arg = if let Some(stripped) = trimmed.strip_prefix("print") {
                stripped.trim()
            } else {
                trimmed
            };
            changes.push(Change {
                severity: "BREAKING".to_string(),
                path: path.clone(),
                description: "Python 2 print statement without parentheses is invalid in Python 3."
                    .to_string(),
                citation: "PEP 3105: Make print a function".to_string(),
                proposed_fix: format!("print({})", arg),
            });
            *breaking += 1;
        }

        // 2. Call expressions: xrange, raw_input, unicode, apply, dict methods
        "call" => {
            if let Some(function_node) = node.child_by_field_name("function") {
                let fn_text = function_node.utf8_text(source).unwrap_or("");

                // Global function calls
                match fn_text {
                    "xrange" => {
                        let line_content = get_line(full_code, line_num);
                        changes.push(Change {
                            severity: "BREAKING".to_string(),
                            path: path.clone(),
                            description: "xrange() was removed in Python 3. Use range() instead."
                                .to_string(),
                            citation: "PEP 3100: Miscellaneous Python 3.0 Plans".to_string(),
                            proposed_fix: line_content.replace("xrange(", "range("),
                        });
                        *breaking += 1;
                    }
                    "raw_input" => {
                        let line_content = get_line(full_code, line_num);
                        changes.push(Change {
                            severity: "BREAKING".to_string(),
                            path: path.clone(),
                            description: "raw_input() was renamed to input() in Python 3."
                                .to_string(),
                            citation: "PEP 3111: Simple input built-in".to_string(),
                            proposed_fix: line_content.replace("raw_input(", "input("),
                        });
                        *breaking += 1;
                    }
                    "unicode" => {
                        let line_content = get_line(full_code, line_num);
                        changes.push(Change {
                            severity: "BREAKING".to_string(),
                            path: path.clone(),
                            description: "unicode() was removed in Python 3. All strings are unicode by default. Use str() instead.".to_string(),
                            citation: "PEP 3100: Miscellaneous Python 3.0 Plans".to_string(),
                            proposed_fix: line_content.replace("unicode(", "str("),
                        });
                        *breaking += 1;
                    }
                    "apply" => {
                        let line_content = get_line(full_code, line_num);
                        if let Some(args_node) = node.child_by_field_name("arguments") {
                            let args_text = args_node.utf8_text(source).unwrap_or("");
                            let inner_args = args_text.trim().strip_prefix('(').unwrap_or(args_text);
                            let inner_args = inner_args.strip_suffix(')').unwrap_or(inner_args);
                            let parts: Vec<&str> = inner_args.splitn(2, ',').collect();
                            if parts.len() == 2 {
                                let fn_name = parts[0].trim();
                                let fn_args = parts[1].trim();
                                changes.push(Change {
                                    severity: "BREAKING".to_string(),
                                    path: path.clone(),
                                    description: "apply() built-in was removed in Python 3.".to_string(),
                                    citation: "PEP 3100: Miscellaneous Python 3.0 Plans".to_string(),
                                    proposed_fix: format!("{}(*{})", fn_name, fn_args),
                                });
                                *breaking += 1;
                            }
                        } else {
                            changes.push(Change {
                                severity: "BREAKING".to_string(),
                                path: path.clone(),
                                description: "apply() built-in was removed in Python 3.".to_string(),
                                citation: "PEP 3100: Miscellaneous Python 3.0 Plans".to_string(),
                                proposed_fix: line_content.replace("apply(", "func(*"),
                            });
                            *breaking += 1;
                        }
                    }
                    _ => {}
                }

                // Attribute calls on objects, e.g. d.iteritems(), d.has_key(...)
                if function_node.kind() == "attribute" {
                    if let Some(attr_node) = function_node.child_by_field_name("attribute") {
                        let attr_name = attr_node.utf8_text(source).unwrap_or("");
                        let line_content = get_line(full_code, line_num);

                        match attr_name {
                            "iteritems" => {
                                changes.push(Change {
                                    severity: "BREAKING".to_string(),
                                    path: path.clone(),
                                    description: ".iteritems() was removed in Python 3.".to_string(),
                                    citation: "PEP 3106: Revamping dict.keys(), .values() and .items()".to_string(),
                                    proposed_fix: line_content.replace(".iteritems()", ".items()"),
                                });
                                *breaking += 1;
                            }
                            "iterkeys" => {
                                changes.push(Change {
                                    severity: "BREAKING".to_string(),
                                    path: path.clone(),
                                    description: ".iterkeys() was removed in Python 3.".to_string(),
                                    citation: "PEP 3106: Revamping dict.keys(), .values() and .items()".to_string(),
                                    proposed_fix: line_content.replace(".iterkeys()", ".keys()"),
                                });
                                *breaking += 1;
                            }
                            "itervalues" => {
                                changes.push(Change {
                                    severity: "BREAKING".to_string(),
                                    path: path.clone(),
                                    description: ".itervalues() was removed in Python 3.".to_string(),
                                    citation: "PEP 3106: Revamping dict.keys(), .values() and .items()".to_string(),
                                    proposed_fix: line_content.replace(".itervalues()", ".values()"),
                                });
                                *breaking += 1;
                            }
                            "has_key" => {
                                let arg_text = if let Some(args_node) = node.child_by_field_name("arguments") {
                                    let raw = args_node.utf8_text(source).unwrap_or("");
                                    let raw = raw.trim().strip_prefix('(').unwrap_or(raw);
                                    raw.strip_suffix(')').unwrap_or(raw).trim()
                                } else {
                                    "key"
                                };
                                changes.push(Change {
                                    severity: "BREAKING".to_string(),
                                    path: path.clone(),
                                    description: ".has_key(k) was removed in Python 3.".to_string(),
                                    citation: "PEP 3100: Miscellaneous Python 3.0 Plans".to_string(),
                                    proposed_fix: format!("{} in dict", arg_text),
                                });
                                *breaking += 1;
                            }
                            _ => {}
                        }
                    }
                }
            }
        }

        // 3. Except clause with comma syntax: except Exception, e:
        "except_clause" => {
            if node_text.contains(',') && !node_text.contains(" as ") {
                let trimmed = node_text.trim();
                let clean = trimmed.strip_prefix("except").unwrap_or(trimmed).trim();
                let clean = clean.strip_suffix(':').unwrap_or(clean).trim();
                let parts: Vec<&str> = clean.split(',').collect();
                if parts.len() == 2 {
                    let exc = parts[0].trim();
                    let var = parts[1].trim();
                    changes.push(Change {
                        severity: "BREAKING".to_string(),
                        path: path.clone(),
                        description: "Old 'except Exception, e:' syntax is invalid in Python 3."
                            .to_string(),
                        citation: "PEP 3110: Catching Exceptions in Python 3000".to_string(),
                        proposed_fix: format!("except {} as {}:", exc, var),
                    });
                    *breaking += 1;
                }
            }
        }

        // 4. Legacy imports: urllib2, httplib, urlparse, ConfigParser, Queue, cPickle, StringIO
        "import_statement" => {
            let mut cursor = node.walk();
            for child in node.children(&mut cursor) {
                if child.kind() == "dotted_name" {
                    let mod_name = child.utf8_text(source).unwrap_or("");
                    check_legacy_python_module(mod_name, &path, changes, breaking);
                } else if child.kind() == "aliased_import" {
                    if let Some(name_node) = child.child_by_field_name("name") {
                        let mod_name = name_node.utf8_text(source).unwrap_or("");
                        check_legacy_python_module(mod_name, &path, changes, breaking);
                    }
                }
            }
        }
        "import_from_statement" => {
            if let Some(mod_node) = node.child_by_field_name("module_name") {
                let mod_name = mod_node.utf8_text(source).unwrap_or("");
                check_legacy_python_module(mod_name, &path, changes, breaking);
            }
        }

        // 5. Long integer literal syntax: 123456L
        "integer" => {
            if node_text.ends_with('L') || node_text.ends_with('l') {
                let num = &node_text[..node_text.len() - 1];
                let line_content = get_line(full_code, line_num);
                changes.push(Change {
                    severity: "BREAKING".to_string(),
                    path: path.clone(),
                    description: "Long integer literal syntax (e.g., 123L) is invalid in Python 3. All integers are long by default.".to_string(),
                    citation: "PEP 0237: Unifying Long Integers and Integers".to_string(),
                    proposed_fix: line_content.replace(node_text, num),
                });
                *breaking += 1;
            }
        }

        // 6. Handle errors or expression statements where print without parens might be parsed as ERROR
        "ERROR" => {
            let trimmed = node_text.trim();
            if trimmed.starts_with("print ") || trimmed.starts_with("print\t") {
                let arg = trimmed.strip_prefix("print").unwrap_or("").trim();
                changes.push(Change {
                    severity: "BREAKING".to_string(),
                    path: path.clone(),
                    description: "Python 2 print statement without parentheses is invalid in Python 3."
                        .to_string(),
                    citation: "PEP 3105: Make print a function".to_string(),
                    proposed_fix: format!("print({})", arg),
                });
                *breaking += 1;
            } else if trimmed.contains("except ") && trimmed.contains(',') && !trimmed.contains(" as ") {
                let re_except = regex::Regex::new(r#"except\s+(\w+)\s*,\s*(\w+)\s*:"#);
                if let Ok(re) = re_except {
                    if let Some(caps) = re.captures(trimmed) {
                        let exc = caps.get(1).map_or("", |m| m.as_str());
                        let var = caps.get(2).map_or("", |m| m.as_str());
                        changes.push(Change {
                            severity: "BREAKING".to_string(),
                            path: path.clone(),
                            description: "Old 'except Exception, e:' syntax is invalid in Python 3."
                                .to_string(),
                            citation: "PEP 3110: Catching Exceptions in Python 3000".to_string(),
                            proposed_fix: format!("except {} as {}:", exc, var),
                        });
                        *breaking += 1;
                    }
                }
            }
        }

        _ => {}
    }

    // Traverse child nodes
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        walk_python_node(child, source, full_code, changes, breaking);
    }
}

pub fn check_go_migration(code: &str) -> IPCResponse {
    let mut parser = Parser::new();
    parser
        .set_language(tree_sitter_go::language())
        .expect("Error loading Go grammar");

    let tree = match parser.parse(code, None) {
        Some(t) => t,
        None => {
            return IPCResponse {
                summary: Summary {
                    breaking: 0,
                    dangerous: 0,
                    additive: 0,
                },
                changes: Vec::new(),
            };
        }
    };

    let mut changes = Vec::new();
    let source_bytes = code.as_bytes();

    walk_go_node(
        tree.root_node(),
        source_bytes,
        &mut changes,
    );

    let dangerous = changes.iter().filter(|c| c.severity == "DANGEROUS").count();
    let breaking = changes.iter().filter(|c| c.severity == "BREAKING").count();
    let additive = changes.iter().filter(|c| c.severity == "ADDITIVE").count();

    IPCResponse {
        summary: Summary {
            breaking,
            dangerous,
            additive,
        },
        changes,
    }
}

fn walk_go_node(
    node: Node,
    source: &[u8],
    changes: &mut Vec<Change>,
) {
    let kind = node.kind();
    let node_text = node.utf8_text(source).unwrap_or("");
    let line_num = node.start_position().row + 1;
    let path = format!("line:L{}", line_num);

    if kind == "import_spec" {
        let clean_path = node_text.trim().trim_matches('"');
        if clean_path == "io/ioutil" {
            changes.push(Change {
                severity: "DANGEROUS".to_string(),
                path: path.clone(),
                description: "Package 'io/ioutil' was deprecated in Go 1.16.".to_string(),
                citation: "Go 1.16 Release Notes: io/ioutil deprecation".to_string(),
                proposed_fix: "Use package 'io' or 'os' equivalents instead.".to_string(),
            });
        }
    }

    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        walk_go_node(child, source, changes);
    }
}

pub fn check_typescript_migration(code: &str) -> IPCResponse {
    let mut parser = Parser::new();
    parser
        .set_language(tree_sitter_typescript::language_typescript())
        .expect("Error loading TypeScript grammar");

    let tree = match parser.parse(code, None) {
        Some(t) => t,
        None => {
            return IPCResponse {
                summary: Summary {
                    breaking: 0,
                    dangerous: 0,
                    additive: 0,
                },
                changes: Vec::new(),
            };
        }
    };

    let mut changes = Vec::new();
    let source_bytes = code.as_bytes();

    walk_typescript_node(
        tree.root_node(),
        source_bytes,
        &mut changes,
    );

    let dangerous = changes.iter().filter(|c| c.severity == "DANGEROUS").count();
    let breaking = changes.iter().filter(|c| c.severity == "BREAKING").count();
    let additive = changes.iter().filter(|c| c.severity == "ADDITIVE").count();

    IPCResponse {
        summary: Summary {
            breaking,
            dangerous,
            additive,
        },
        changes,
    }
}

fn walk_typescript_node(
    node: Node,
    source: &[u8],
    changes: &mut Vec<Change>,
) {
    let kind = node.kind();
    let node_text = node.utf8_text(source).unwrap_or("");
    let line_num = node.start_position().row + 1;
    let path = format!("line:L{}", line_num);

    if kind == "variable_declaration" && node_text.starts_with("var ") {
        changes.push(Change {
            severity: "DANGEROUS".to_string(),
            path: path.clone(),
            description: "Usage of 'var' keyword. Prefer 'const' or 'let' for block-scoped semantics.".to_string(),
            citation: "TypeScript ESLint: no-var".to_string(),
            proposed_fix: node_text.replacen("var ", "const ", 1),
        });
    }

    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        walk_typescript_node(child, source, changes);
    }
}

fn check_legacy_python_module(
    module: &str,
    path: &str,
    changes: &mut Vec<Change>,
    breaking: &mut usize,
) {
    let py3_equiv = match module {
        "urllib2" => Some("urllib.request / urllib.error"),
        "httplib" => Some("http.client"),
        "urlparse" => Some("urllib.parse"),
        "ConfigParser" => Some("configparser"),
        "Queue" => Some("queue"),
        "cPickle" => Some("pickle"),
        "StringIO" => Some("io.StringIO"),
        _ => None,
    };
    if let Some(equiv) = py3_equiv {
        changes.push(Change {
            severity: "BREAKING".to_string(),
            path: path.to_string(),
            description: format!("Legacy module '{}' was removed/renamed in Python 3.", module),
            citation: "PEP 3108: Standard Library Reorganization".to_string(),
            proposed_fix: format!("Replace '{}' with '{}'", module, equiv),
        });
        *breaking += 1;
    }
}

fn get_line(code: &str, line_num: usize) -> String {
    code.lines()
        .nth(line_num.saturating_sub(1))
        .unwrap_or("")
        .to_string()
}

