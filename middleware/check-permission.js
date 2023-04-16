const ProjectMember = require('../models/project-member');
const HttpError = require('../models/http-error');

// Middleware to check user permissions
module.exports = async (req, res, next) => {
  try {
    const { pid } = req.params;
    const userId = req.userData.userId; // Assuming user ID is stored in the req.user object

    // Retrieve the project member and user role from the database
    const projectMember = await ProjectMember.findOne({ projectId: pid, userId });
    const { role } = projectMember;

    // Check if the user has the required role for the requested action
    if (role !== 'admin') { // Assuming 'admin' role is required for editing the project
      throw new HttpError('You do not have permission to perform this action', 403);
    }

    // User has the required permissions, continue to the next middleware/route handler
    next();
  } catch (error) {
    next(error);
  }
};
