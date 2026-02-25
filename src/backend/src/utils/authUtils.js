/**
 * Check if a user has access to a project (owner or member)
 * @param {Object} project - Project document from MongoDB
 * @param {string} userId - User ID to check
 * @returns {boolean}
 */
export function userHasProjectAccess(project, userId) {
  if (!project) return false;
  const ownerId = project.ownerId._id || project.ownerId;
  const isOwner = ownerId.toString() === String(userId);
  const isMember =
    Array.isArray(project.members) &&
    project.members.some((m) => {
      if (!m) return false; // guard against null members
      const memberId = m._id || m;
      return memberId.toString() === String(userId);
    });
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
  const ownerId = project.ownerId._id || project.ownerId;
  return ownerId.toString() === String(userId);
}

/**
 * Check if a user is a member of a project but not the owner
 * @param {Object} project - Project document from MongoDB
 * @param {string} userId - User ID to check
 * @returns {boolean}
 */
export function userIsProjectMember(project, userId) {
  if (!project) return false;
  return (
    !userIsProjectOwner(project, userId) &&
    userHasProjectAccess(project, userId)
  );
}
