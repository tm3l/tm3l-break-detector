use break_detector_engine::code_diff::check_python_migration;

#[test]
fn test_print_statement() {
    let code = r#"print "Hello World""#;
    let result = check_python_migration(code);
    assert_eq!(result.summary.breaking, 1);
    assert!(result.changes[0].citation.contains("PEP 3105"));
}

#[test]
fn test_xrange() {
    let code = r#"for i in xrange(10):\n    pass"#;
    let result = check_python_migration(code);
    assert!(result.summary.breaking >= 1);
    assert!(result
        .changes
        .iter()
        .any(|c| c.citation.contains("PEP 3100")));
}

#[test]
fn test_raw_input() {
    let code = r#"name = raw_input("Enter name: ")"#;
    let result = check_python_migration(code);
    assert_eq!(result.summary.breaking, 1);
    assert!(result.changes[0].proposed_fix.contains("input("));
}

#[test]
fn test_unicode() {
    let code = r#"s = unicode("hello")"#;
    let result = check_python_migration(code);
    assert_eq!(result.summary.breaking, 1);
    assert!(result.changes[0].proposed_fix.contains("str("));
}

#[test]
fn test_except_comma_syntax() {
    let code = r#"except Exception, e:"#;
    let result = check_python_migration(code);
    assert_eq!(result.summary.breaking, 1);
    assert!(result.changes[0]
        .proposed_fix
        .contains("except Exception as e:"));
}

#[test]
fn test_legacy_imports() {
    let code = "import urllib2\nimport httplib\nfrom ConfigParser import ConfigParser";
    let result = check_python_migration(code);
    assert_eq!(result.summary.breaking, 3);
}

#[test]
fn test_dict_iter_methods() {
    let code =
        "for k, v in d.iteritems():\n    for k in d.iterkeys():\n        for v in d.itervalues():";
    let result = check_python_migration(code);
    assert_eq!(result.summary.breaking, 3);
}

#[test]
fn test_long_int() {
    let code = "x = 123456L";
    let result = check_python_migration(code);
    assert_eq!(result.summary.breaking, 1);
    assert!(result.changes[0].proposed_fix.contains("123456"));
    assert!(!result.changes[0].proposed_fix.contains("L"));
}

#[test]
fn test_clean_python3_code() {
    let code = r#"
def main():
    name = input("Enter name: ")
    for i in range(10):
        print(f"Hello {name}")

if __name__ == "__main__":
    main()
"#;
    let result = check_python_migration(code);
    assert_eq!(
        result.summary.breaking, 0,
        "Clean Python 3 should have zero breaking changes"
    );
}
