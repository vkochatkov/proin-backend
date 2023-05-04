const ProjectMember = require('../models/project-member');
const HttpError = require('../models/http-error');

const getProjectMembers = async (req, res, next) => {
  const projectId = req.params.pid;

  let projectMembers;
  try {
    projectMembers = await ProjectMember.find({ projectId })
      .populate('userId', 'name email')
      .select('role status -_id');
  } catch (err) {
    const error = new HttpError(
      'Fetching project members failed, please try again later.',
      500
    );
    return next(error);
  }

  if (!projectMembers || projectMembers.length === 0) {
    const error = new HttpError(
      'Could not find project members for the provided project id.',
      404
    );
    return next(error);
  }

  res.json({
    projectMembers: projectMembers.map((member) => member.toObject())
  });
};

const removeProjectMember = async (req, res, next) => {
  const projectId = req.params.pid;
  const { userId } = req.body;

  let projectMember;
  try {
    projectMember = await ProjectMember.findOne({ userId, projectId });
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not remove the project member.',
      500
    );
    return next(error);
  }

  if (!projectMember) {
    const error = new HttpError(
      'Could not find project member for the provided user id and project id.',
      404
    );
    return next(error);
  }

  try {
    await projectMember.remove();
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not remove the project member.',
      500
    );
    return next(error);
  }

  res.status(200).json({ message: 'Project member removed' });
};

exports.removeProjectMember = removeProjectMember;
exports.getProjectMembers = getProjectMembers;
