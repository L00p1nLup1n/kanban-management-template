import { VALID_ROLES } from '../../shared/roles.js';

const ROLE_META: Record<string, { label: string; color: string }> = {
  developer: { label: 'Developer', color: 'green' },
  qa_engineer: { label: 'QA Engineer', color: 'orange' },
  devops_engineer: { label: 'DevOps Engineer', color: 'cyan' },
  project_manager: { label: 'Project Manager', color: 'purple' },
  designer: { label: 'Designer', color: 'pink' },
  data_engineer: { label: 'Data Engineer', color: 'blue' },
  security_engineer: { label: 'Security Engineer', color: 'red' },
  product_owner: { label: 'Product Owner', color: 'yellow' },
};

export const IT_ROLES = VALID_ROLES.map((value) => ({
  value,
  label: ROLE_META[value]?.label ?? value,
  color: ROLE_META[value]?.color ?? 'gray',
}));

export function getRoleLabel(role: string): string {
  return IT_ROLES.find((r) => r.value === role)?.label || role;
}

export function getRoleColor(role: string): string {
  return IT_ROLES.find((r) => r.value === role)?.color || 'gray';
}
