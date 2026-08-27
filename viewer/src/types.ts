export interface BreakingChange {
  path?: string;
  citation?: string;
  proposed_fix?: string;
  line?: string;
  oldCode?: string;
  newCode?: string;
}
