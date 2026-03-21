/**
 * Test factory helpers — build minimal plain objects that mirror
 * Mongoose document shapes used across service and util tests.
 */

export const OWNER_ID = 'owner-001';
export const MEMBER_ID = 'member-002';
export const STRANGER_ID = 'stranger-003';
export const PROJECT_ID = 'proj-001';
export const TASK_ID = 'task-001';

/**
 * Build a member entry matching the new Project.members subdocument shape:
 * { userId, role, joinedAt }
 * Accepts a plain userId string/object and optional role override.
 */
export function makeMember(userId, role = 'developer', joinedAt = new Date()) {
  return { userId, role, joinedAt };
}

export const DEFAULT_COLUMNS = [
  { key: 'todo', title: 'To do', order: 1, wip: 0 },
  { key: 'inprogress', title: 'In Progress', order: 2, wip: 0 },
  { key: 'done', title: 'Done', order: 3, wip: 0 },
];

/**
 * Build a plain project object with unpopulated (string) ownerId.
 */
export function makeProject(overrides = {}) {
  return {
    _id: PROJECT_ID,
    ownerId: OWNER_ID,
    name: 'Test Project',
    description: '',
    columns: DEFAULT_COLUMNS.map((c) => ({ ...c })),
    members: [],
    joinCode: 'abc123',
    toObject() {
      // eslint-disable-next-line no-unused-vars
      const { toObject, ...rest } = this;
      return rest;
    },
    ...overrides,
  };
}

/**
 * Build a plain project object with populated (object) ownerId and members.
 */
export function makePopulatedProject(overrides = {}) {
  return makeProject({
    ownerId: { _id: OWNER_ID, name: 'Alice', email: 'alice@test.com' },
    ...overrides,
  });
}

/**
 * Build a minimal task object that mimics Mongoose dirty-tracking.
 */
export function makeTask(overrides = {}) {
  const modified = new Set();
  const task = {
    _id: TASK_ID,
    projectId: PROJECT_ID,
    columnKey: 'todo',
    title: 'Test Task',
    order: 1000,
    backlog: false,
    committedAt: undefined,
    startedAt: undefined,
    completedAt: undefined,
    createdBy: OWNER_ID,
    isModified: (field) => modified.has(field),
    _markModified: (field) => modified.add(field),
    ...overrides,
  };

  // Intercept direct field sets to simulate Mongoose isModified tracking
  return new Proxy(task, {
    set(target, prop, value) {
      const before = target[prop];
      target[prop] = value;
      if (
        before !== value &&
        typeof prop === 'string' &&
        !prop.startsWith('_')
      ) {
        modified.add(prop);
      }
      return true;
    },
  });
}
