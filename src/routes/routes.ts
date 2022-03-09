import express, { Application, RequestHandler } from 'express';
const multer = require('multer');
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
  getFreelancers,
  getStatistics,
  stopServer,
  googleLogin,
  generatePdfRoute,
  uploadFilesToProject,
  api_ListFiles,
  api_deleteFiles,
} from '../controllers/exampleController';
import checkAuth from '../middlewares/checkAuth';
import path from 'path';
import { handleUploadMiddleware } from '../utils/uploadSetup';

const storage = multer.diskStorage({
  destination: 'src/files',
  filename: function (req: any, file: any, cb: any) {
    cb(null, 'IMAGE-' + Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1000000 },
});

export const router = express.Router();

// Experiment routes

router.delete('/remove', api_deleteFiles);
router.get('/list', api_ListFiles);
router.post('/pdf', generatePdfRoute);
router.get('/status', status);

// Routes Login and Signup POST
router.post('/login', login);
router.post('/signup', signUp);
router.post('/googleLogin', googleLogin);

// Send Verification Email
router.post('/verifyEmail', sendLinkToVerifiedEmail);

// Send Email With Link to Reset Password
router.post('/resetPassword', sendLinkToResetPassword);

// Middleware (CheckAuth)
router.use(checkAuth as any);

router.get('/events/:token', eventsHandler as any);
router.get('/stopServer', stopServer as any);

// Email is Verified
router.patch('/verifyEmail', verifyEmail as any);

// Password has been reset
router.patch('/resetPassword', setNewPassword as any);

// PROJECT ROUTES

// GET
router.get('/project', getProjects as any);
router.get('/project/:projectId', getOneProject);
// POST
router.post('/project/:clientId', addProject as any);
// PATCH
router.patch('/project/:projectId', updateOneProject as any);
// DELETE
router.delete('/project/:projectId', deleteOneProject as any);

// USER ROUTES

// GET
router.get('/user/freelancer/:freelancerId', getClients as any);
router.get('/user/freelancers/:clientId', getFreelancers as any);
router.get('/user/:clientId', getOneClient);
// POST
router.post('/user', addClient as any);
// PATCH
router.patch('/user/:clientId?', updateOneClient as any);
// DELETE
router.delete('/user/:clientId', deleteOneClient);

// MESSAGE ROUTES

// GET
router.get('/message', getMessage);
// POST
router.post('/message', addMessage as any);

// Statistics
router.get('/statistics', getStatistics as any);

// Upload Files
router.post('/uploadFile/project/:projectId', handleUploadMiddleware.array('files2', 6), uploadFilesToProject as any);
