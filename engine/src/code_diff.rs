use crate::models::{Change, IPCResponse, Summary};
use regex::Regex;

pub fn check_python_migration(code: &str) -> IPCResponse {
    let mut changes = Vec::new();
    let mut breaking = 0;

    let lines: Vec<&str> = code.lines().collect();

    let re_print = Regex::new(r#"^(\s*)print\s+([^(].*)$"#).unwrap();
    let re_xrange = Regex::new(r#"xrange\("#).unwrap();
    let re_raw_input = Regex::new(r#"raw_input\("#).unwrap();
    let re_unicode = Regex::new(r#"\bunicode\("#).unwrap();
    let re_except = Regex::new(r#"except\s+(\w+)\s*,\s*(\w+)\s*:"#).unwrap();
    let re_imports = Regex::new(
        r#"^(import|from)\s+(urllib2|httplib|urlparse|ConfigParser|Queue|cPickle|StringIO)\b"#,
    )
    .unwrap();
    let re_iteritems = Regex::new(r#"\.iteritems\(\)"#).unwrap();
    let re_iterkeys = Regex::new(r#"\.iterkeys\(\)"#).unwrap();
    let re_itervalues = Regex::new(r#"\.itervalues\(\)"#).unwrap();
    let re_has_key = Regex::new(r#"\.has_key\(([^)]+)\)"#).unwrap();
    let re_long_int = Regex::new(r#"\b(\d+)L\b"#).unwrap();
    let re_apply = Regex::new(r#"\bapply\(([^,]+),\s*([^)]+)\)"#).unwrap();

    for (i, line) in lines.iter().enumerate() {
        let line_num = i + 1;
        let path = format!("line:L{}", line_num);
        let trimmed = line.trim();
        if trimmed.starts_with('#') {
            continue;
        }

        if let Some(caps) = re_print.captures(line) {
            let arg = caps.get(2).map_or("", |m| m.as_str()).trim();
            changes.push(Change {
                severity: "BREAKING".to_string(),
                path: path.clone(),
                description: "Python 2 print statement without parentheses is invalid in Python 3."
                    .to_string(),
                citation: "PEP 3105: Make print a function".to_string(),
                proposed_fix: format!("{}print({})", &caps[1], arg),
            });
            breaking += 1;
        }
        if re_xrange.is_match(line) {
            changes.push(Change {
                severity: "BREAKING".to_string(),
                path: path.clone(),
                description: "xrange() was removed in Python 3. Use range() instead.".to_string(),
                citation: "PEP 3100: Miscellaneous Python 3.0 Plans".to_string(),
                proposed_fix: line.replace("xrange(", "range("),
            });
            breaking += 1;
        }
        if re_raw_input.is_match(line) {
            changes.push(Change {
                severity: "BREAKING".to_string(),
                path: path.clone(),
                description: "raw_input() was renamed to input() in Python 3.".to_string(),
                citation: "PEP 3111: Simple input built-in".to_string(),
                proposed_fix: line.replace("raw_input(", "input("),
            });
            breaking += 1;
        }
        if re_unicode.is_match(line) {
            changes.push(Change {
                severity: "BREAKING".to_string(),
                path: path.clone(),
                description: "unicode() was removed in Python 3. All strings are unicode by default. Use str() instead.".to_string(),
                citation: "PEP 3100: Miscellaneous Python 3.0 Plans".to_string(),
                proposed_fix: line.replace("unicode(", "str("),
            });
            breaking += 1;
        }
        if let Some(caps) = re_except.captures(line) {
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
            breaking += 1;
        }
        if let Some(caps) = re_imports.captures(line) {
            let module = caps.get(2).map_or("", |m| m.as_str());
            let py3_equiv = match module {
                "urllib2" => "urllib.request / urllib.error",
                "httplib" => "http.client",
                "urlparse" => "urllib.parse",
                "ConfigParser" => "configparser",
                "Queue" => "queue",
                "cPickle" => "pickle",
                "StringIO" => "io.StringIO",
                _ => "Python 3 equivalent",
            };
            changes.push(Change {
                severity: "BREAKING".to_string(),
                path: path.clone(),
                description: format!(
                    "Legacy module '{}' was removed/renamed in Python 3.",
                    module
                ),
                citation: "PEP 3108: Standard Library Reorganization".to_string(),
                proposed_fix: format!("Replace '{}' with '{}'", module, py3_equiv),
            });
            breaking += 1;
        }
        if re_iteritems.is_match(line) {
            changes.push(Change {
                severity: "BREAKING".to_string(),
                path: path.clone(),
                description: ".iteritems() was removed in Python 3.".to_string(),
                citation: "PEP 3106: Revamping dict.keys(), .values() and .items()".to_string(),
                proposed_fix: line.replace(".iteritems()", ".items()"),
            });
            breaking += 1;
        }
        if re_iterkeys.is_match(line) {
            changes.push(Change {
                severity: "BREAKING".to_string(),
                path: path.clone(),
                description: ".iterkeys() was removed in Python 3.".to_string(),
                citation: "PEP 3106: Revamping dict.keys(), .values() and .items()".to_string(),
                proposed_fix: line.replace(".iterkeys()", ".keys()"),
            });
            breaking += 1;
        }
        if re_itervalues.is_match(line) {
            changes.push(Change {
                severity: "BREAKING".to_string(),
                path: path.clone(),
                description: ".itervalues() was removed in Python 3.".to_string(),
                citation: "PEP 3106: Revamping dict.keys(), .values() and .items()".to_string(),
                proposed_fix: line.replace(".itervalues()", ".values()"),
            });
            breaking += 1;
        }
        if let Some(caps) = re_has_key.captures(line) {
            let key = caps.get(1).map_or("", |m| m.as_str());
            changes.push(Change {
                severity: "BREAKING".to_string(),
                path: path.clone(),
                description: ".has_key(k) was removed in Python 3.".to_string(),
                citation: "PEP 3100: Miscellaneous Python 3.0 Plans".to_string(),
                proposed_fix: format!("{} in dict", key),
            });
            breaking += 1;
        }
        if let Some(caps) = re_long_int.captures(line) {
            let num = caps.get(1).map_or("", |m| m.as_str());
            let full_match = caps.get(0).map_or("", |m| m.as_str());
            changes.push(Change {
                severity: "BREAKING".to_string(),
                path: path.clone(),
                description: "Long integer literal syntax (e.g., 123L) is invalid in Python 3. All integers are long by default.".to_string(),
                citation: "PEP 0237: Unifying Long Integers and Integers".to_string(),
                proposed_fix: line.replace(full_match, num),
            });
            breaking += 1;
        }
        if let Some(caps) = re_apply.captures(line) {
            let fn_name = caps.get(1).map_or("", |m| m.as_str()).trim();
            let args = caps.get(2).map_or("", |m| m.as_str()).trim();
            let full_match = caps.get(0).map_or("", |m| m.as_str());
            changes.push(Change {
                severity: "BREAKING".to_string(),
                path: path.clone(),
                description: "apply() built-in was removed in Python 3.".to_string(),
                citation: "PEP 3100: Miscellaneous Python 3.0 Plans".to_string(),
                proposed_fix: line.replace(full_match, &format!("{}(*{})", fn_name, args)),
            });
            breaking += 1;
        }
    }

    IPCResponse {
        summary: Summary {
            breaking,
            dangerous: 0,
            additive: 0,
        },
        changes,
    }
}
