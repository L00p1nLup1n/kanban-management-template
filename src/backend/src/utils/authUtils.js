/**
 * Check if a user has access to a project (owner or member)
 * @param {Object} project - Project document from MongoDB
 * @param {string} userId - User ID to check
 * @returns {boolean}
 */
export function userHasProjectAccess(project, userId) {
  if (!project) return false;
  const isOwner =
    project.ownerId && project.ownerId.toString() === String(userId);
  const isMember =
    Array.isArray(project.members) &&
    project.members.some((m) => String(m) === String(userId));
  return isOwner || isMember;
}

/**
 * Check if a user is the owner of a project
 * @param {Object} project - Project document from MongoDB
 * @param {string} userId - User ID to check
 * @returns {boolean}
 */
export function userIsProjectOwner(project, userId) {
  if (!project) return false;
  return project.ownerId && project.ownerId.toString() === String(userId);
}