import Project from '../models/Project.js';
import { getIO } from '../socket.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// Default columns template for new projects
const DEFAULT_COLUMNS_TEMPLATE = [
  { key: 'todo', title: 'To do', order: 1 },
  { key: 'inprogress', title: 'In Progress', order: 2 },
  { key: 'done', title: 'Done', order: 3 },
];

export async function listProjects(req, res) {
  try {
    // Return projects owned by the user or where the user is a member
    const projects = await Project.find({
      $or: [{ ownerId: req.userId }, { members: req.userId }],
    })
      .populate('ownerId', 'name email')
      .populate('members', 'name email');
    return res.json({ projects });
  } catch (err) {
    console.error('List projects error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getProject(req, res) {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId)
      .populate('ownerId', 'name email')
      .populate('members', 'name email');

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Allow owner or members to view
    const isOwner = project.ownerId._id.toString() === req.userId;
    const isMember =
      project.members &&
      project.members.some((m) => m._id.toString() === req.userId);
    if (!isOwner && !isMember) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.json({ project });
  } catch (err) {
    console.error('Get project error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createProject(req, res) {
  try {
    const { name, description, columns } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name required' });
    }

    // generate a short join code (6 hex chars) for other users to join
    let joinCode = crypto.randomBytes(3).toString('hex');
    // ensure uniqueness (retry a few times)
    for (let i = 0; i < 5; i++) {
      // eslint-disable-next-line no-await-in-loop
      const exists = await Project.findOne({ joinCode });
      if (!exists) break;
      joinCode = crypto.randomBytes(3).toString('hex');
    }

    const projectData = {
      ownerId: req.userId,
      name,
      description,
      columns:
        columns ||
        DEFAULT_COLUMNS_TEMPLATE.map((col) => ({ ...col, id: uuidv4() })), // copy all the properties of each column can generate a unique id
      joinCode,
      members: [],
    };

    const project = await Project.create(projectData);
    return res.status(201).json({ project });
  } catch (err) {
    console.error('Create project error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateProject(req, res) {
  try {
    const { projectId } = req.params;
    const { name, description, columns } = req.body;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Only owner can update project (including column settings)
    if (project.ownerId.toString() !== req.userId) {
      return res
        .status(403)
        .json({ error: 'Only the project owner can modify project settings' });
    }

    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;
    if (columns !== undefined) project.columns = columns;

    await project.save();
    try {
      const io = getIO();
      if (io)
        io.to(String(project._id)).emit('project:columns-updated', {
          projectId: String(project._id),
          columns: project.columns,
        });
    } catch (e) {
      console.warn('Socket emit error (updateProject):', e);
    }
    return res.json({ project });
  } catch (err) {
    console.error('Update project error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteProject(req, res) {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Only owner can delete
    if (project.ownerId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await Project.findByIdAndDelete(projectId);
    return res.status(204).send();
  } catch (err) {
    console.error('Delete project error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function joinProjectByCode(req, res) {
  try {
    const { joinCode } = req.body;
    if (!joinCode) return res.status(400).json({ error: 'joinCode required' });

    const project = await Project.findOne({ joinCode });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Owner cannot "join" as member
    if (project.ownerId.toString() === req.userId) {
      return res
        .status(400)
        .json({ error: 'Owner is already part of the project' });
    }

    const alreadyMember =
      project.members &&
      project.members.some((m) => m.toString() === req.userId);
    if (alreadyMember) {
      // Populate before returning
      await project.populate('ownerId', 'name email');
      await project.populate('members', 'name email');
      return res.status(200).json({ project, message: 'Already a member' });
    }

    project.members = project.members || [];
    project.members.push(req.userId);
    await project.save();

    // Populate before returning
    await project.populate('ownerId', 'name email');
    await project.populate('members', 'name email');

    // Emit socket event to notify about new member
    try {
      const io = getIO();
      if (io) {
        const newMember = project.members.find(
          (m) => m._id.toString() === req.userId,
        );
        // Emit to project room for members currently viewing the project
        io.to(String(project._id)).emit('project:member-joined', {
          projectId: String(project._id),
          memberId: req.userId,
          member: newMember,
        });

        // Emit to user-specific room so their projects list updates
        io.to(`user:${req.userId}`).emit('user:joined-project', {
          project: project,
          projectId: String(project._id),
          projectName: project.name,
        });
      }
    } catch (e) {
      console.warn('Socket emit error (joinProjectByCode):', e);
    }

    return res.json({ project, message: 'Joined project' });
  } catch (err) {
    console.error('Join project error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function removeMember(req, res) {
  try {
    const { projectId, memberId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Only owner can remove members
    if (project.ownerId.toString() !== req.userId) {
      return res
        .status(403)
        .json({ error: 'Only the project owner can remove members' });
    }

    // Owner cannot remove themselves
    if (memberId === req.userId) {
      return res
        .status(400)
        .json({ error: 'Owner cannot be removed from the project' });
    }

    // Check if the user is actually a member
    const memberIndex = project.members.findIndex(
      (m) => m.toString() === memberId,
    );
    if (memberIndex === -1) {
      return res
        .status(404)
        .json({ error: 'Member not found in this project' });
    }

    // Remove the member
    project.members.splice(memberIndex, 1);
    await project.save();

    // Populate before returning
    await project.populate('ownerId', 'name email');
    await project.populate('members', 'name email');

    // Emit socket event to notify about member removal
    try {
      const io = getIO();
      if (io) {
        // Emit to project room for members currently viewing the project
        io.to(String(project._id)).emit('project:member-removed', {
          projectId: String(project._id),
          memberId,
        });

        // Emit to user-specific room so removed user sees it on projects list page
        io.to(`user:${memberId}`).emit('user:removed-from-project', {
          projectId: String(project._id),
          projectName: project.name,
        });
      }
    } catch (e) {
      console.warn('Socket emit error (removeMember):', e);
    }

    return res.json({ project, message: 'Member removed successfully' });
  } catch (err) {
    console.error('Remove member error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
