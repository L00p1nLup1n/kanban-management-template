export const IT_ROLES = [
  { value: 'project_manager', label: 'Project Manager', color: 'purple' },
  { value: 'business_analyst', label: 'Business Analyst', color: 'blue' },
  { value: 'developer', label: 'Developer', color: 'green' },
  { value: 'designer', label: 'Designer', color: 'pink' },
  { value: 'qa_tester', label: 'QA / Tester', color: 'orange' },
  { value: 'devops_engineer', label: 'DevOps Engineer', color: 'cyan' },
  { value: 'scrum_master', label: 'Scrum Master', color: 'yellow' },
] as const;

export type ITRole = typeof IT_ROLES[number]['value'];

export function getRoleLabel(role: string): string {
  return IT_ROLES.find((r) => r.value === role)?.label || role;
}

export function getRoleColor(role: string): string {
  return IT_ROLES.find((r) => r.value === role)?.color || 'gray';
}
