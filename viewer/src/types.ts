export interface BreakingChange {
  severity?: 'BREAKING' | 'DANGEROUS' | 'ADDITIVE';
  path?: string;
  description?: string;
  citation?: string;
  proposed_fix?: string;
  line?: string;
  oldCode?: string;
  newCode?: string;
}

export interface DetectedLanguage {
  name: string;
  version?: string;
  runtime?: string;
}

export interface Dependency {
  name: string;
  is_c_extension?: boolean;
  is_native?: boolean;
  package_hint?: string;
}

export interface Entrypoint {
  kind: string;
  line?: string;
}

export interface PackagingCaveat {
  severity: 'WARNING' | 'INFO';
  message: string;
}

export interface CodeAnalysis {
  language: DetectedLanguage;
  dependencies: Dependency[];
  entrypoints: Entrypoint[];
  caveats: PackagingCaveat[];
  function_count: number;
  class_count: number;
  line_count: number;
}
