import express from 'express';
import {
  login,
  signUp,
  addProject,
  getProjects,
  getOneProject,
  updateOneProject,
  deleteOneProject,
  deleteOneClient,
  getOneClient,
  updateOneClient,
  getClients,
  addClient,
  sendLinkToVerifiedEmail,
  verifyEmail,
  sendLinkToResetPassword,
  setNewPassword,
  addMessage,
  getMessage,
  eventsHandler,
  status,
} from '../controllers/exampleController';
import checkAuth from '../middlewares/checkAuth';

export const router = express.Router();

// Experiment routes

router.get('/status', status);
// router.post('/fact', addFact);

// Routes Login and Signup POST
router.post('/login', login);
router.post('/signup', signUp);

// Send Verification Email
router.post('/verifyEmail', sendLinkToVerifiedEmail);

// Send Email With Link to Reset Password
router.post('/resetPassword', sendLinkToResetPassword);

// Middleware (CheckAuth)

// @ts-ignore
router.use(checkAuth);

// @ts-ignore
router.get('/events/:token', eventsHandler);

// Email is Verified
// @ts-ignore
router.patch('/verifyEmail', verifyEmail);

// Password has been reset
// @ts-ignore
router.patch('/resetPassword', setNewPassword);

// PROJECT ROUTES

// GET
// @ts-ignore
router.get('/project', getProjects);
router.get('/project/:id', getOneProject);
// POST
router.post('/project', addProject);
// PATCH
router.patch('/project/:id', updateOneProject);
// DELETE
router.delete('/project/:id', deleteOneProject);

// USER ROUTES

// GET
// @ts-ignore
router.get('/user/freelancer/:freelancerId', getClients);
router.get('/user/:userId', getOneClient);
// POST
router.post('/user', addClient);
// PATCH
router.patch('/user/:id', updateOneClient);
// DELETE
router.delete('/user/:id', deleteOneClient);

// MESSAGE ROUTES

// GET
router.get('/message', getMessage);
// POST
// @ts-ignore
router.post('/message', addMessage);
