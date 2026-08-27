use serde::{Deserialize, Serialize};
use tree_sitter::{Parser, Node};

#[derive(Serialize, Deserialize, Debug, Default)]
pub struct DetectedLanguage {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub runtime: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Default)]
pub struct Dependency {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_c_extension: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_native: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub package_hint: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Default)]
pub struct Entrypoint {
    pub kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub line: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Default)]
pub struct PackagingCaveat {
    pub severity: String,
    pub message: String,
}

#[derive(Serialize, Deserialize, Debug, Default)]
pub struct CodeAnalysis {
    pub language: DetectedLanguage,
    pub dependencies: Vec<Dependency>,
    pub entrypoints: Vec<Entrypoint>,
    pub caveats: Vec<PackagingCaveat>,
    pub function_count: usize,
    pub class_count: usize,
    pub line_count: usize,
}

pub fn analyze_code(source: &str, lang: &str) -> CodeAnalysis {
    let mut analysis = CodeAnalysis::default();
    analysis.line_count = source.lines().count();

    let mut parser = Parser::new();
    match lang {
        "python" => {
            parser.set_language(tree_sitter_python::language()).unwrap();
            let tree = parser.parse(source, None).unwrap();
            analyze_python_tree(&tree.root_node(), source, &mut analysis);
            analysis.language.name = "Python".to_string();
            analysis.language.version = Some("3.x".to_string());
            analysis.language.runtime = Some("CPython".to_string());
        }
        "go" => {
            parser.set_language(tree_sitter_go::language()).unwrap();
            let tree = parser.parse(source, None).unwrap();
            analyze_go_tree(&tree.root_node(), source, &mut analysis);
            analysis.language.name = "Go".to_string();
            analysis.language.version = Some("1.x".to_string());
        }
        "javascript" | "js" | "typescript" | "ts" => {
            parser.set_language(tree_sitter_javascript::language()).unwrap();
            let tree = parser.parse(source, None).unwrap();
            analyze_js_tree(&tree.root_node(), source, &mut analysis);
            analysis.language.name = "JavaScript".to_string();
            analysis.language.runtime = Some("Node.js".to_string());
        }
        _ => {
            analysis.language.name = "Unknown".to_string();
        }
    }

    analysis
}

fn analyze_python_tree(root: &Node, source: &str, analysis: &mut CodeAnalysis) {
    let source_bytes = source.as_bytes();
    traverse_python(root, source_bytes, analysis);

    let mut has_cext = false;
    for dep in &mut analysis.dependencies {
        if is_python_cext(&dep.name) {
            dep.is_c_extension = Some(true);
            has_cext = true;
        }
        dep.package_hint = Some(format!("pip install {}", dep.name));
    }
    
    if has_cext {
        analysis.caveats.push(PackagingCaveat {
            severity: "WARNING".to_string(),
            message: "C-extension dependencies detected (e.g. pandas, numpy, torch). When using PyInstaller, you MUST add --hidden-import flags for each C-extension. Nuitka may require --include-package overrides.".to_string(),
        });
    }
    
    if analysis.function_count == 0 && analysis.class_count == 0 {
        analysis.caveats.push(PackagingCaveat {
            severity: "INFO".to_string(),
            message: "No functions or classes detected. This may be a script rather than a module. PyInstaller should work without a --spec file.".to_string(),
        });
    }
}

fn traverse_python(node: &Node, source: &[u8], analysis: &mut CodeAnalysis) {
    let kind = node.kind();
    match kind {
        "function_definition" => analysis.function_count += 1,
        "class_definition" => analysis.class_count += 1,
        "import_statement" | "import_from_statement" => {
            let mut walker = node.walk();
            for child in node.children(&mut walker) {
                if child.kind() == "dotted_name" {
                    if let Ok(name) = child.utf8_text(source) {
                        let base_module = name.split('.').next().unwrap_or(name);
                        if !analysis.dependencies.iter().any(|d| d.name == base_module) {
                            analysis.dependencies.push(Dependency {
                                name: base_module.to_string(),
                                ..Default::default()
                            });
                        }
                    }
                }
            }
        },
        "if_statement" => {
            if let Ok(text) = node.utf8_text(source) {
                if text.contains("__name__ == \"__main__\"") || text.contains("__name__ == '__main__'") {
                    analysis.entrypoints.push(Entrypoint {
                        kind: "python_main".to_string(),
                        line: Some(text.lines().next().unwrap_or("").to_string()),
                    });
                }
            }
        }
        _ => {}
    }
    
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        traverse_python(&child, source, analysis);
    }
}

fn is_python_cext(name: &str) -> bool {
    matches!(name, "numpy" | "pandas" | "scipy" | "torch" | "tensorflow" | "cv2" | "PIL" | "Pillow" | "sklearn" | "matplotlib" | "lxml" | "psycopg2" | "cryptography" | "cffi" | "pydantic")
}

fn analyze_go_tree(root: &Node, source: &str, analysis: &mut CodeAnalysis) {
    let source_bytes = source.as_bytes();
    traverse_go(root, source_bytes, analysis);

    for dep in &mut analysis.dependencies {
        dep.package_hint = Some(format!("go get {}", dep.name));
    }

    if source.contains("import \"C\"") || source.contains("// #include") {
        analysis.caveats.push(PackagingCaveat {
            severity: "WARNING".to_string(),
            message: "CGO detected (import \"C\"). You CANNOT use CGO_ENABLED=0 for fully static builds. The output binary will depend on system glibc. Consider using CGO_ENABLED=1 with a musl-based Alpine image for portable static compilation.".to_string(),
        });
    } else {
        analysis.caveats.push(PackagingCaveat {
            severity: "INFO".to_string(),
            message: "No CGO detected. You can build a fully static binary with: CGO_ENABLED=0 GOOS=linux go build -a -ldflags '-extldflags \"-static\"' -o app ./cmd/...".to_string(),
        });
    }
}

fn traverse_go(node: &Node, source: &[u8], analysis: &mut CodeAnalysis) {
    match node.kind() {
        "function_declaration" => {
            analysis.function_count += 1;
            if let Some(name_node) = node.child_by_field_name("name") {
                if let Ok(name) = name_node.utf8_text(source) {
                    if name == "main" {
                        analysis.entrypoints.push(Entrypoint {
                            kind: "go_main".to_string(),
                            line: Some("func main() {".to_string()), 
                        });
                    }
                }
            }
        },
        "type_declaration" => {
            if let Ok(text) = node.utf8_text(source) {
                if text.contains("struct") {
                    analysis.class_count += 1;
                }
            }
        },
        "import_spec" => {
            if let Some(path_node) = node.child_by_field_name("path") {
                if let Ok(path_str) = path_node.utf8_text(source) {
                    let cleaned = path_str.trim_matches('"');
                    if !cleaned.is_empty() && !analysis.dependencies.iter().any(|d| d.name == cleaned) {
                        analysis.dependencies.push(Dependency {
                            name: cleaned.to_string(),
                            ..Default::default()
                        });
                    }
                }
            }
        },
        _ => {}
    }

    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        traverse_go(&child, source, analysis);
    }
}

fn analyze_js_tree(root: &Node, source: &str, analysis: &mut CodeAnalysis) {
    let source_bytes = source.as_bytes();
    traverse_js(root, source_bytes, analysis);

    for dep in &mut analysis.dependencies {
        dep.package_hint = Some(format!("npm install {}", dep.name));
    }

    analysis.caveats.push(PackagingCaveat {
        severity: "INFO".to_string(),
        message: "For Node.js standalone binary packaging, consider using: pkg (Vercel), ncc (Vercel), or esbuild + pkg. Electron is recommended for GUI apps.".to_string(),
    });
}

fn traverse_js(node: &Node, source: &[u8], analysis: &mut CodeAnalysis) {
    match node.kind() {
        "function_declaration" | "arrow_function" => {
            analysis.function_count += 1;
        },
        "class_declaration" => {
            analysis.class_count += 1;
        },
        "import_statement" => {
            if let Some(source_node) = node.child_by_field_name("source") {
                if let Ok(path_str) = source_node.utf8_text(source) {
                    let cleaned = path_str.trim_matches('\'').trim_matches('"');
                    if !cleaned.starts_with('.') && !analysis.dependencies.iter().any(|d| d.name == cleaned) {
                        analysis.dependencies.push(Dependency {
                            name: cleaned.to_string(),
                            ..Default::default()
                        });
                    }
                }
            }
        },
        "call_expression" => {
            if let Some(func) = node.child_by_field_name("function") {
                if let Ok(func_name) = func.utf8_text(source) {
                    if func_name == "require" {
                        if let Some(args) = node.child_by_field_name("arguments") {
                            if let Some(arg) = args.named_child(0) {
                                if arg.kind() == "string" {
                                    if let Ok(path_str) = arg.utf8_text(source) {
                                        let cleaned = path_str.trim_matches('\'').trim_matches('"');
                                        if !cleaned.starts_with('.') && !analysis.dependencies.iter().any(|d| d.name == cleaned) {
                                            analysis.dependencies.push(Dependency {
                                                name: cleaned.to_string(),
                                                ..Default::default()
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        _ => {}
    }

    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        traverse_js(&child, source, analysis);
    }
}
