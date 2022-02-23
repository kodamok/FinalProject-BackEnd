import express from 'express';
import {
  example,
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
} from '../controllers/exampleController';
import checkAuth from '../middlewares/checkAuth';

export const router = express.Router();

// Routes Login and Signup POST
router.post('/login', login);
router.post('/signup', signUp);

// Send Verification Email
router.patch('/verifyEmail', verifyEmail);

// Send Email With Link to Reset Password
router.patch('/resetPassword', setNewPassword);

// Middleware (CheckAuth)
// TODO Check Auth Middleware
router.use(checkAuth);

// Email is Verified
router.post('/verifyEmail', sendLinkToVerifiedEmail);

// Password has been reset
router.post('/resetPassword', sendLinkToResetPassword);

// PROJECT ROUTES

// GET
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
router.post('/message', addMessage);
