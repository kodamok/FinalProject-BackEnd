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
// import path from 'path';
import { handleUploadMiddleware } from '../middlewares/uploadSetup';

// const storage = multer.diskStorage({
//   destination: 'src/files',
//   filename: function (req: any, file: any, cb: any) {
//     cb(null, 'IMAGE-' + Date.now() + path.extname(file.originalname));
//   },
// });
//
// const upload = multer({
//   storage: storage,
//   limits: { fileSize: 1000000 },
// });

export const router = express.Router();

// Experiment routes

router.delete('/remove', api_deleteFiles);
router.get('/list', api_ListFiles);

// LOGIN, SIGNUP, EMAIL ROUTES --------------------

// Routes Login and Signup POST
router.post('/login', login);
router.post('/signup', signUp);
router.post('/googleLogin', googleLogin);

// Send Verification Email
router.post('/verifyEmail', sendLinkToVerifiedEmail);

// Send Email With Link to Reset Password
router.post('/resetPassword', sendLinkToResetPassword);

// Send email from Contact Form
router.post('/contactForm', sendEmailFromContactForm);

// Middleware (CheckAuth) ----------------
router.use(checkAuth as any);

// Email is Verified
router.patch('/verifyEmail', verifyEmail as any);

// Password has been reset
router.patch('/resetPassword', setNewPassword as any);

// PROJECT ROUTES -------------

// GET
router.get('/project/:limit?', getProjects as any);
router.get('/projectOne/:projectId', getOneProject);
// POST
router.post('/project/:clientId', addProject as any);
// PATCH
router.patch('/project/:projectId', updateOneProject as any);
// DELETE
router.delete('/project/:projectId', deleteOneProject as any);

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

// MESSAGE ROUTES --------------

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

// UPLOAD FILES ROUTES ------------

// POST
router.post('/uploadFile/project/:projectId', handleUploadMiddleware.array('files2', 6), uploadFilesToProject as any);

// GENERATE PDF ROUTES ----------

// POST
router.post('/pdf', generatePdfRoute);
