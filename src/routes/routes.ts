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
  getFreelancers,
  getStatistics,
  stopServer,
  googleLogin,
  generatePdfRoute,
  uploadFilesToProject,
  api_ListFiles,
  api_deleteFiles,
  sendEmailFromContactForm,
} from '../controllers/exampleController';
import checkAuth from '../middlewares/checkAuth';
import { handleUploadMiddleware } from '../middlewares/uploadSetup';

export const router = express.Router();

// LOGIN, SIGNUP, EMAIL ROUTES --------------------

// POST
router.post('/login', login);
router.post('/signup', signUp);
router.post('/googleLogin', googleLogin);
router.post('/verifyEmail', sendLinkToVerifiedEmail);
router.post('/resetPassword', sendLinkToResetPassword);
router.post('/contactForm', sendEmailFromContactForm);

// Middleware (CheckAuth) ----------------
router.use(checkAuth as any);

// PATCH
router.patch('/verifyEmail', verifyEmail as any);
router.patch('/resetPassword', setNewPassword as any);

// USER ROUTES -----------------

// GET
router.get('/user/freelancer/:limit?', getClients as any);
router.get('/user/freelancers', getFreelancers as any);
router.get('/user/:clientId', getOneClient);
// POST
router.post('/user', addClient as any);
// PATCH
router.patch('/user/:clientId?', updateOneClient as any);
// DELETE
router.delete('/user/:clientId', deleteOneClient);

// PROJECT ROUTES ----------------------

// GET
router.get('/project/:limit?', getProjects as any);
router.get('/projectOne/:projectId', getOneProject);
// POST
router.post('/project/:clientId', addProject as any);
router.post('/uploadFile/project/:projectId', handleUploadMiddleware.array('files2', 10), uploadFilesToProject as any);
// PATCH
router.patch('/project/:projectId', updateOneProject as any);
// DELETE
router.delete('/project/:projectId', deleteOneProject as any);

// MESSAGE/CHAT ROUTES --------------

// GET
router.get('/message', getMessage);
router.get('/status', status);
router.get('/events/:token', eventsHandler as any);
router.get('/stopServer', stopServer as any);
// POST
router.post('/message', addMessage as any);

// STATISTICS ROUTES ---------------
// GET
router.get('/statistics', getStatistics as any);

// GENERATE PDF ROUTES ----------
// POST
router.post('/pdf', generatePdfRoute);

// Experiment routes

router.delete('/remove', api_deleteFiles);
router.get('/list', api_ListFiles);
