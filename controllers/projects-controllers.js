const mongoose = require('mongoose');
const HttpError = require('../models/http-error');
const uuid = require('uuid/v1');

const Project = require('../models/project');
const User = require('../models/user');
const ProjectMember = require('../models/project-member');
const { uploadFile, deleteFile } = require('../services/s3');
const logger = require('../services/logger');
const mailer = require('../nodemailer');

require('dotenv').config();

const findUser = async (userId) => {
  let user;

  try {
    user = await User.findById(userId);
  } catch (err) {
    const error = new HttpError(
      'Creating project failed, please try again.',
      500
    );
    return next(error);
  }

  if (!user) {
    const error = new HttpError('Could not find author for provided id.', 404);
    return next(error);
  }

  return user;
}

const findProject = async (projectId) => {
  let project;

  try {
    project = await Project.findById(projectId).populate('comments');
  } catch (err) {
    logger.info(`project has not found, message: ${err}`)
    const error = new HttpError(
      'Something went wrong, could not update project.',
      500
    );
    return next(error);
  }

  return project;
}

const getProjectById = async (req, res, next) => {
  const projectId = req.params.pid;

  let project;
  try {
    project = await Project.findById(projectId).populate({
      path: 'subProjects',
      populate: {
        path: 'comments'
      }
    })
    .populate('comments');
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not find a project.',
      500
    );
    return next(error);
  }

  if (!project) {
    const error = new HttpError(
      'Could not find project for the provided id.',
      404
    );
    return next(error);
  }

  res.json({ project: project.toObject({ getters: true }) });
};

const getUsersProjects = async (req, res, next) => {
  const userId = req.params.uid;

  let projects;
  try {
    const userWithProjects = await User.findById(userId).populate({
      path: 'projects',
      populate: [
        {
          path: 'comments'
        },
        {
          path: 'subProjects',
          populate: {
            path: 'comments'
          }
        }
      ]
    });

    const memberProjects = await Project.find({ sharedWith: userId }).populate({
      path: 'comments',
    });

    const uniqueMemberProjects = memberProjects.filter(project =>
      !userWithProjects.projects.some(userProject => userProject._id.equals(project._id))
    );

    projects = [...userWithProjects.projects, ...uniqueMemberProjects];
  } catch (err) {
    const error = new HttpError(
      'Fetching projects failed, please try again later.',
      500
    );
    return next(error);
  }

  res.json({
    projects: projects.map(project =>
      project.toObject({ getters: true })
    )
  });
};

const getAllProjectsByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  let projects;

  try {
    projects = await Project.find({ creator: userId });
  } catch (e) {
    logger.info(`getAllProjectsByUserId error: ${e}`)
  }

  res.json({
    projects: projects.map(project =>
      project.toObject({ getters: true })
    )
  });
}

const updateProjectsByUserId = async (req, res, next) => {
  const userId = req.params.uid;
  const updatedProjects = req.body.projects;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();

    // Retrieve the user object from the database and update the project order
    const user = await User.findById(userId).session(sess);
    user.projects = updatedProjects;

    // Save the updated user object and commit the transaction
    await user.save({ session: sess });
    await sess.commitTransaction();

    res.status(200).json({ message: 'Project order updated successfully.' });
  } catch (err) {
    const error = new HttpError(
      'Updating project order failed, please try again.',
      500
    );
    return next(error);
  }
}

const createProject = async (req, res, next) => {
  const createdProject = new Project({
    creator: req.userData.userId
  });

  let user;

  user = await findUser(req.userData.userId);

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdProject.save({ session: sess });
  
    const creatorMember = new ProjectMember({
      projectId: createdProject.id,
      userId: user.id,
      role: 'admin',
      status: 'active'
    });

    await creatorMember.save({ session: sess });

    user.projects.push(createdProject);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    logger.info('after close dbtransition error', err);
    const error = new HttpError(
      'Creating project failed, please try again.',
      500
    );
    return next(error);
  }
  
  res.status(201).json({ project: createdProject });
};

const updateProject = async (req, res, next) => {
  logger.info(`"PATCH" update project request to "${req.protocol}://${req.get('host')}/projects/:uid" `)
  const { projectName, description, logoUrl, subProjects } = req.body;
  const projectId = req.params.pid;

  const project = await findProject(projectId);

  if (logoUrl) {
    const { isUploaded, url } = await uploadFile(logoUrl, projectId);

    if (isUploaded) {
      project.logoUrl = url;
    }
  }

  if (projectName === '' || projectName) {
    project.projectName = projectName;
  }

  if (description === '' || description) {
    project.description = description;
  }

  if (subProjects && subProjects.length > 0) {
    const subProjectIds = subProjects.map((subProject) => subProject._id);
    project.subProjects = subProjectIds;
    await Project.updateMany(
      { _id: { $in: subProjectIds } },
      { $set: { parentProject: project._id } }
    );
  }

  try {
    await project.save();
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not update project.',
      500
    );
    return next(error);
  }

  res.status(200).json({ project: project.toObject({ getters: true }) });
};

const deleteProject = async (req, res, next) => {
  const projectId = req.params.pid;

  let project;
  try {
    project = await Project.findById(projectId).populate('creator');
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not delete project.',
      500
    );
    logger.info(`POST deleteProject ${error}`);
    return next(error);
  }

  if (!project) {
    const error = new HttpError('Could not find project for this id.', 404);
    return next(error);
  }

  if (project.creator.id !== req.userData.userId) {
    const error = new HttpError(
      'You are not allowed to delete this project.',
      401
    );
    logger.info(`POST deleteProject ${error}`);
    return next(error);
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await project.remove({ session: sess });
    project.creator.projects.pull(project);
    await project.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not delete project.',
      500
    );
    logger.info(`POST deleteProject ${err}`);
    return next(error);
  }

  try {
    await ProjectMember.deleteMany({ projectId: projectId }).exec();
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not remove project member.',
      500
    );
    logger.info(`POST deleteProject ${err}`);
    return next(error);
  }

  const logoUrl = project.logoUrl;

  if (logoUrl) {
    try {
      await deleteFile(logoUrl);
    } catch (e) {
      logger.info(`"DELETE" request failed, message: ${e.message}. status: 500`)

      const error = new HttpError(
        e.message,
        500
      )
      return next(error);
    }
  }

  res.status(200).json({ message: 'Deleted project.' });
};

const sendInvitation = async (req, res, next) => {
  const projectId = req.params.pid;
  const { email } = req.body;

  // Find the user with the provided email in your database
  try {
    const userToInvite = await User.findOne({ email });
    if (!userToInvite) {
      return res.status(400).json({ message: 'User not found' });
    }
  
    const invitationId = uuid();
  
    const project = await Project.findById(projectId);
    project.invitations.push({
      invitationId,
      email,
    });

     // Add the user to the ProjectMember collection as a member
     const projectMember = new ProjectMember({
      projectId,
      userId: userToInvite.id,
      role: 'admin',
      status: 'pending'
    });

    await projectMember.save();
    await project.save();
  
    const invitationLink = `${process.env.FRONTEND_HOST}/projects/${projectId}/invitations/${invitationId}`;
    // const invitationLink = `http://localhost:5000/projects/${projectId}/invitations/${invitationId}`;
  
    const message = {
      to: email,
      subject: 'Запрошення до проекту',
      html: `
      <div>
        <p>
          Натисни <a href="${invitationLink}">посилання</a> 
          щоб прийняти зарпошення.
        </p>
        <p>
          Даний лист не потребує відповіді
        </p>
      </div>
      `
    };
  
    mailer(message);
  } catch (e) {
    const error = new HttpError('the error happen while sending access invitation', 500);
    logger.info(`sendInvitation ${e.message}`)

    return next(error);
  }

  return res.status(200).json({ message: 'Invitation sent' });
};

const joinToProject = async (req, res, next) => {
  const { pid, invitationId } = req.params;
  const currentUserId = req.userData.userId; // The authenticated user who is joining the project

  try {
    const isMemberAlreadyAdded = Boolean(await ProjectMember.findOne({
      projectId: pid, userId: currentUserId, status: 'active'
    }));

    if (isMemberAlreadyAdded) {
      const error = new HttpError('Користувач вже доданий', 500);
      logger.info(`joinToProject ${error}`)
      return next(error);
    }

    const project = await Project.findOne({
      _id: pid,
      'invitations.invitationId': invitationId,
    });

    if (!project) {
      const error = new HttpError('Invalid invitation', 404);
      logger.info(`joinToProject ${error}`)
      return next(error);
    }
  
    // Add the user to the sharedWith array in the project
    project.sharedWith.push(currentUserId);
    // Remove the invitation from the project
    project.invitations = project.invitations.filter(invitation => invitation.invitationId !== invitationId);
    await project.save();
  
     // Update the ProjectMember record to 'active'
     const projectMember = await ProjectMember.findOneAndUpdate(
      { projectId: pid, userId: currentUserId, status: 'pending' },
      { $set: { status: 'active' } },
      { new: true }
    );

    if (!projectMember) {
      return res.status(400).json({ message: 'User is not invited to join this project' });
    }
  
    await projectMember.save();
  } catch (e) {
    const error = new HttpError(
      `something went wrong: ${e.message}`,
      500
    );

    return next(error);
  } 

  return res.status(200).json({ message: 'Joined project' });
};

const moveProject = async (req, res, next) => {
  const { projectId, toProjectId } = req.body;
  const userId = req.userData.userId;
  const isToUsersProjects = toProjectId === 'В корінь';

  try {
    // Find the project or subproject to move
    const projectToMove = await Project.findById(projectId);
    if (!projectToMove) {
      const error = new HttpError('Project not found.', 404);
      return next(error);
    }
  
    // Check if the user owns the project or subproject to move
    if (projectToMove.creator.toString() !== userId) {
      const error = new HttpError('You are not authorized to move this project.', 401);
      return next(error);
    }
  
    if (!toProjectId || isToUsersProjects) {
      // If there is no target project, add the project to the user's projects
      const user = await User.findById(userId);
      if (!user) {
        const error = new HttpError('User not found.', 404);
        return next(error);
      }

      const projectIndex = user.projects.findIndex(p => p.toString() === projectId);
      if (projectIndex === -1) {
        user.projects.push(projectToMove);
        await user.save();
      }

      // If the project to move is a subproject, remove it from its parent project
      if (projectToMove.parentProject) {
        const parentProject = await Project.findById(projectToMove.parentProject);
        if (!parentProject) {
          const error = new HttpError('Parent project not found.', 404);
          return next(error);
        }
        parentProject.subProjects = parentProject.subProjects
          .filter(subProjectId => subProjectId.toString() !== projectId);
        await parentProject.save();
      }

      // Clear parentProject if becoming a top-level project
      if (projectToMove.parentProject) {
        projectToMove.parentProject = undefined;
      }

      await projectToMove.save();
    } else {
      // Find the project or subproject to move it to
      const toProject = await Project.findById(toProjectId);
      if (!toProject) {
        const error = new HttpError('Target project not found.', 404);
        return next(error);
      }
  
      // Check if the user owns both projects or subprojects
      if (toProject.creator.toString() !== userId) {
        const error = new HttpError('You are not authorized to move the project to this project.', 401);
        return next(error);
      }
  
      // If the project to move is a subproject, remove it from its parent project
      if (projectToMove.parentProject) {
        const parentProject = await Project.findById(projectToMove.parentProject);
        if (!parentProject) {
          const error = new HttpError('Parent project not found.', 404);
          return next(error);
        }
        parentProject.subProjects = parentProject.subProjects
          .filter(subProjectId => subProjectId.toString() !== projectId);
        await parentProject.save();
      }

      toProject.subProjects.push(projectToMove);
      await toProject.save();
  
      // If the project to move was a project and it had subprojects, update their parent project
      if (!projectToMove.parentProject && projectToMove.subProjects.length > 0) {
        const subProjects = await Project.find({ _id: { $in: projectToMove.subProjects } });
        for (const subProject of subProjects) {
          subProject.parentProject = toProject._id;
          await subProject.save();
        }
      }
  
      // If the project to move was a project, remove it from the user's projects array
      if (!projectToMove.parentProject) {
        const user = await User.findById(userId);
        if (!user) {
          const error = new HttpError('User not found.', 404);
          return next(error);
        }
        user.projects = user.projects.filter(userProjectId => userProjectId.toString() !== projectId);
        await user.save();
      }

      projectToMove.parentProject = toProject._id;
      await projectToMove.save();
    }
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not move project.',
      500
    );
    logger.info(`moveProject : ${err}`)
    return next(error);
  }

  res.status(200).json({ message: 'Project moved successfully.' });
};

exports.getProjectById = getProjectById;
exports.getUsersProjects = getUsersProjects;
exports.getAllProjectsByUserId = getAllProjectsByUserId;
exports.updateProjectsByUserId = updateProjectsByUserId;
exports.createProject = createProject;
exports.updateProject = updateProject;
exports.deleteProject = deleteProject;
exports.sendInvitation = sendInvitation;
exports.joinToProject = joinToProject;
exports.moveProject = moveProject;
