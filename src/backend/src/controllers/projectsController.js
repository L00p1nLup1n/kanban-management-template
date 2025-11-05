import Project from '../models/Project.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// Default columns for new projects
const DEFAULT_COLUMNS = [
    { id: uuidv4(), key: 'hot-tasks', title: 'Hot tasks', order: 1 },
    { id: uuidv4(), key: 'to-do', title: 'To do', order: 2 },
    { id: uuidv4(), key: 'in-work', title: 'In work', order: 3 },
    { id: uuidv4(), key: 'done', title: 'Done', order: 4 },
];

export async function listProjects(req, res) {
    try {
        // Return projects owned by the user or where the user is a member
        const projects = await Project.find({
            $or: [ { ownerId: req.userId }, { members: req.userId } ]
        });
        return res.json({ projects });
    } catch (err) {
        console.error('List projects error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export async function getProject(req, res) {
    try {
        const { projectId } = req.params;
        const project = await Project.findById(projectId);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Allow owner or members to view
        const isOwner = project.ownerId.toString() === req.userId;
        const isMember = project.members && project.members.some(m => m.toString() === req.userId);
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
            columns: columns || DEFAULT_COLUMNS,
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

        // Only owner can update project
        if (project.ownerId.toString() !== req.userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        if (name !== undefined) project.name = name;
        if (description !== undefined) project.description = description;
        if (columns !== undefined) project.columns = columns;

        await project.save();
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
            return res.status(400).json({ error: 'Owner is already part of the project' });
        }

        const alreadyMember = project.members && project.members.some(m => m.toString() === req.userId);
        if (alreadyMember) {
            return res.status(200).json({ project, message: 'Already a member' });
        }

        project.members = project.members || [];
        project.members.push(req.userId);
        await project.save();

        return res.json({ project, message: 'Joined project' });
    } catch (err) {
        console.error('Join project error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
