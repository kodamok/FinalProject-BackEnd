import { Application, NextFunction, Request, Response } from 'express';
import HttpError from '../models/httpError';
import User from '../models/User';
import Project from '../models/Project';
import Message from '../models/Message';
// import Billing from '../models/Billing';
const bcrypt = require('bcrypt');
// import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { DataStoredInToken, userData } from '../middlewares/checkAuth';
const sgMail = require('@sendgrid/mail');
//
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const { FRONTEND_URL, JWT_KEY }: any = process.env;

export const example = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.send('<h1>Hello from the TypeScript world!</h1>');
  } catch (e) {
    const error = new HttpError('Something wrong', 501);
    return next(error);
  }
};

// Login/Signup

export const login = async (req: Request, res: Response, next: NextFunction) => {
  const { password, email } = req.body;
  // const email = 'John5@gmail.com';
  // const password = '1231231';
  console.log('i try backend ');
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError('Logging in failed, please try again later.', 500);
    return next(error);
  }
  if (!existingUser) {
    const error = new HttpError('Invalid credentials, could not log you in.', 403);
    return next(error);
  }
  if (existingUser.verifiedEmail === false) return next(new HttpError('You need verify email.', 403));

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    const error = new HttpError('Could not log you in, please check your credentials and try again.', 500);
    return next(error);
  }

  if (!isValidPassword) {
    const error = new HttpError('Invalid credentials, could not log you in.', 403);
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      { userId: existingUser.id, email: existingUser.email, role: existingUser.role, verifiedEmail: existingUser.verifiedEmail },
      `${process.env.JWT_KEY}`,
      { expiresIn: '1h' },
    );
  } catch (err) {
    const error = new HttpError('Logging in failed, please try again later.', 500);
    return next(error);
  }
  res.json({
    userId: existingUser.id,
    email: existingUser.email,
    token: token,
    name: existingUser.name,
    role: existingUser.role,
    exp: Date.now() + 1000 * 60 * 59,
  });
};

export const signUp = async (req: Request, res: Response, next: NextFunction) => {
  const { name, email, password, identityCardNumber, taxNumber } = req.body;
  // const name = 'John7';
  // const email = 'viest1994@gmail.com';
  // const password = '1231231';
  const role = 'Freelancer';
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError('Signing up failed, please try again later.', 500);
    return next(error);
  }

  if (existingUser) {
    const error = new HttpError('User exists already, please login instead.', 422);
    return next(error);
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError('Could not create user, please try again 2.', 500);
    return next(error);
  }

  const createdUser = new User({
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    verifiedEmail: false,
    role,
    identityCardNumber,
    taxNumber,
  });

  try {
    await createdUser.save();
  } catch (err) {
    console.log(err);
    const error = new HttpError('Signing up failed, please try again later 3.', 500);
    return next(error);
  }

  // Creating Token and Send Mail

  let token;
  try {
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email, role: createdUser.role, verifiedEmail: createdUser.verifiedEmail },
      `${process.env.JWT_KEY}`,
      { expiresIn: '1h' },
    );
  } catch (err) {
    const error = new HttpError('Signing up failed, please try again later 1.', 500);
    return next(error);
  }

  const message = `
  Link to verify Account for Nomad Studio  - ${FRONTEND_URL}/verifyEmail/${token}
  `;
  const data = {
    to: email,
    from: 'freelancerwebproject@gmail.com',
    subject: `Link to verify Account - Nomad Studio`,
    text: message,
    html: message.replace(/\r\n/g, '<br>'),
  };

  try {
    await sgMail.send(data);
    console.log('email sent');
  } catch (e: any) {
    console.error(e);
    if (e.response) {
      console.error(e.response.body);
    }
  }

  res.status(201).json({ userId: createdUser.id, email: createdUser.email, name: createdUser.name, role: createdUser.role });
};

// Send Email and Verify Email

export const sendLinkToVerifiedEmail = async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;
  // const email = 'viest1994@gmail.com';
  let existingUser;
  try {
    existingUser = await User.findOne({ email });
  } catch (e) {
    const error = new HttpError('error', 403);
    return next(error);
  }

  if (!existingUser) return next(new HttpError('something wrong 1', 500));

  let token;
  try {
    token = jwt.sign(
      { userId: existingUser.id, email: existingUser.email, role: existingUser.role, verifiedEmail: existingUser.verifiedEmail },
      `${process.env.JWT_KEY}`,
      { expiresIn: '1h' },
    );
  } catch (err) {
    const error = new HttpError('Signing up failed, please try again later 1.', 500);
    return next(error);
  }

  const message = `
  Link to verify Account for Nomad Studio  - ${FRONTEND_URL}/verifyEmail/${token}
  `;
  const data = {
    to: email,
    from: 'freelancerwebproject@gmail.com',
    subject: `Link to verify Account - Nomad Studio`,
    text: message,
    html: message.replace(/\r\n/g, '<br>'),
  };

  try {
    await sgMail.send(data);
    console.log('email sent');
  } catch (e: any) {
    console.error(e);
    if (e.response) {
      console.error(e.response.body);
    }
  }

  res.status(200).json({ message: 'We sent verification email to you' });
};

export const sendContactForm = async (req: Request, res: Response, next: NextFunction) => {
  const { email, name, text } = req.body;
  // const email = 'viest1994@gmail.com';

  const message = `
  Message from our Client (${name}) - ${text}
  `;
  const data = {
    to: 'freelancerwebproject@gmail.com',
    from: email,
    subject: `Email From Client`,
    text: message,
    html: message.replace(/\r\n/g, '<br>'),
  };

  try {
    await sgMail.send(data);
    console.log('email sent');
  } catch (e: any) {
    console.error(e);
    if (e.response) {
      console.error(e.response.body);
    }
  }

  res.status(200).json({ message: 'We sent verification email to you' });
};

export const verifyEmail = async (req: userData, res: Response, next: NextFunction) => {
  const { userId } = req.userData;
  // const userId = '620f8b47078a146053a30c78';
  console.log({ userId });
  let existingUser;
  try {
    existingUser = await User.findByIdAndUpdate(userId, { verifiedEmail: true }, { new: true });
  } catch (e) {
    const error = new HttpError('not exist', 403);
    return next(error);
  }

  if (!existingUser) return next(new HttpError('something wrong 1', 500));

  const message = `
  Your Account is Verified - Nomad Studio
  `;

  const data = {
    to: existingUser.email,
    from: 'freelancerwebproject@gmail.com',
    subject: `Your Account is Verified - Nomad Studio`,
    text: message,
    html: message.replace(/\r\n/g, '<br>'),
  };

  try {
    await sgMail.send(data);
    console.log('email sent correctly');
  } catch (e: any) {
    console.error(e);
    if (e.response) {
      console.error(e.response.body);
    }
  }

  res.status(200).json({ message: 'You Verified Email Correct. Now Log in!' });
};

// Send Email and Reset Password

export const sendLinkToResetPassword = async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;
  // const email = 'viest1994@gmail.com';
  let existingUser;
  try {
    existingUser = await User.findOne({ email });
  } catch (e) {
    const error = new HttpError('error', 403);
    return next(error);
  }

  if (!existingUser) return next(new HttpError('something wrong 1', 500));

  let token;
  try {
    token = jwt.sign(
      { userId: existingUser.id, email: existingUser.email, role: existingUser.role, verifiedEmail: existingUser.verifiedEmail },
      `${process.env.JWT_KEY}`,
      { expiresIn: '1h' },
    );
  } catch (err) {
    const error = new HttpError('Signing up failed, please try again later 1.', 500);
    return next(error);
  }

  const message = `
  Link to reset password for Nomad Studio  - ${FRONTEND_URL}/forgotPassword/${token}
  `;
  const data = {
    to: email,
    from: 'freelancerwebproject@gmail.com',
    subject: `Link to reset password - Nomad Studio`,
    text: message,
    html: message.replace(/\r\n/g, '<br>'),
  };

  try {
    await sgMail.send(data);
    console.log('email sent');
  } catch (e: any) {
    console.error(e);
    if (e.response) {
      console.error(e.response.body);
    }
  }

  res.status(200).json({ message: 'We sent link to reset password' });
};

export const setNewPassword = async (req: userData, res: Response, next: NextFunction) => {
  const { userId } = req.userData;
  const { password } = req.body;
  // console.log({ userId, password });
  // const userId = '620f8b47078a146053a30c78';
  // const password = '1231231';
  let existingUser;
  try {
    existingUser = await User.findById(userId);
  } catch (e) {
    const error = new HttpError('not exist', 403);
    return next(error);
  }

  if (!existingUser) return next(new HttpError('something wrong 1', 500));

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError('Could not create user, please try again 2.', 500);
    return next(error);
  }

  try {
    existingUser = await User.findByIdAndUpdate(userId, { password: hashedPassword });
  } catch (e) {
    const error = new HttpError('something wrong', 500);
    return next(error);
  }

  if (!existingUser) return next(new HttpError('something wrong 2', 500));

  res.status(200).json({ message: 'You Changed Password Correctly. Now you Can Log in!' });
};

// Projects

export const getProjects = async (req: userData, res: Response, next: NextFunction) => {
  const { userId, role } = req.userData;
  let freelancerId: string;
  if (role === 'Freelancer') {
    freelancerId = userId;
  } else {
    throw next(new HttpError('something wrrong', 500));
  }
  // const freelancerId = '620e8720dd0a2b6f50f526da';
  let allProjects;
  try {
    allProjects = await User.findOne({ _id: freelancerId }).populate('projects');
  } catch (e: any) {
    const error = new HttpError(e, 500);
    return next(error);
  }
  if (!allProjects) return next(new HttpError('projects does not exists', 404));
  // res.send({visits: thisCustomer.visits.map((item)=>item.toObject({getters:true}))})
  res.send(allProjects.projects);
};

export const getOneProject = async (req: Request, res: Response, next: NextFunction) => {
  // const {projectId} = req.params;
  // Example
  const projectId = '620f5dd5dce3f5afb68ab26e';
  let oneProject;
  try {
    oneProject = await Project.findById(projectId);
  } catch (e: any) {
    const error = new HttpError(e, 500);
    return next(error);
  }
  if (!oneProject) return next(new HttpError('project does not exist', 404));
  // res.send({visits: thisCustomer.visits.map((item)=>item.toObject({getters:true}))})
  res.send({ oneProject });
};

export const updateOneProject = async (req: Request, res: Response, next: NextFunction) => {
  // const {projectId} = req.params;
  // Example
  const projectId = '620f5dd5dce3f5afb68ab26e';
  const update = {
    name: 'TextUpdated2',
  };
  let oneProject;
  try {
    oneProject = await Project.findByIdAndUpdate(projectId, update, { new: true });
  } catch (e: any) {
    const error = new HttpError(e, 500);
    return next(error);
  }
  if (!oneProject) return next(new HttpError('project does not exist', 404));
  // res.send({visits: thisCustomer.visits.map((item)=>item.toObject({getters:true}))})
  res.send({ message: 'Project Updated', oneProject });
};

export const deleteOneProject = async (req: Request, res: Response, next: NextFunction) => {
  // const {projectId} = req.params;
  // Example
  const projectId = '620f5dd5dce3f5afb68ab26e';
  let oneProject;
  try {
    oneProject = await Project.findByIdAndDelete(projectId);
  } catch (e: any) {
    const error = new HttpError(e, 500);
    return next(error);
  }
  if (!oneProject) return next(new HttpError('project does not exist', 404));
  res.send({ message: 'Project deleted' });
};

export const addProject = async (req: Request, res: Response, next: NextFunction) => {
  // interface ProjectInterface {
  //   name: string;
  //   clientName: string;
  //   text: string;
  // }

  // const { freelancerId } = req.userData;
  // const {
  // clientId
  // name
  // clientName
  // text
  // ownerUser
  // ownerFreelancer
  // } = req.body;

  const clientId = '620e86ee6ea2252da8aa3ff9';
  const freelancerId = '620e8720dd0a2b6f50f526da';
  const newProject = new Project({
    name: 'Name2',
    clientName: 'Client Name2',
    text: 'Text2',
    ownerUser: clientId,
    ownerFreelancer: freelancerId,
  });
  let existingUser;
  let existingFreelancer;
  try {
    // Searching User and push reference to projects
    existingUser = await User.findById(clientId);
    existingUser.projects.push(newProject);
    // Searching Freelancer and push reference to projects
    existingFreelancer = await User.findById(freelancerId);
    existingFreelancer.projects.push(newProject);
    // Saving Models
    await existingUser.save();
    await existingFreelancer.save();
    await newProject.save();
  } catch (e) {
    const error = new HttpError('Something wrong with savings models', 500);
    return next(error);
  }
  res.send({ message: 'Project created' });
};

// Users (Clients, Freelancers)

export const getFreelancers = async (req: userData, res: Response, next: NextFunction) => {
  const { userId, role } = req.userData;
  let clientId: string;
  if (role === 'Client') {
    clientId = userId;
  } else {
    throw next(new HttpError('something wrrong', 500));
  }

  // const freelancerId = '620e8720dd0a2b6f50f526da';
  let allFreelancers: any;
  try {
    allFreelancers = await User.findOne({ _id: clientId }).populate({
      path: 'freelancers',
      select: '-password -messages -verifiedEmail -users',
    });
  } catch (e: any) {
    const error = new HttpError(e, 500);
    return next(error);
  }
  if (!allFreelancers) return next(new HttpError('Freelancers does not exists', 404));
  // res.send({visits: thisCustomer.visits.map((item)=>item.toObject({getters:true}))})
  // res.send(allClients.clients.projects.map((item: any) => item));
  res.send(allFreelancers.freelancers);
};

export const getClients = async (req: userData, res: Response, next: NextFunction) => {
  const { userId, role } = req.userData;
  let freelancerId: string;
  if (role === 'Freelancer') {
    freelancerId = userId;
  } else {
    throw next(new HttpError('something wrrong', 500));
  }

  // const freelancerId = '620e8720dd0a2b6f50f526da';
  let allClients: any;
  try {
    allClients = await User.findOne({ _id: freelancerId }).populate({
      path: 'users',
      select: '-password -messages -verifiedEmail -users -freelancers',
    });
  } catch (e: any) {
    const error = new HttpError(e, 500);
    return next(error);
  }
  if (!allClients) return next(new HttpError('Clients does not exists', 404));
  // res.send({visits: thisCustomer.visits.map((item)=>item.toObject({getters:true}))})
  // res.send(allClients.clients.projects.map((item: any) => item));
  res.send(allClients.users);
};

export const getOneClient = async (req: Request, res: Response, next: NextFunction) => {
  // const {projectId} = req.params;
  // Example
  const clientId = '620e86ee6ea2252da8aa3ff9';
  let oneClient;
  try {
    oneClient = await User.findById(clientId);
  } catch (e: any) {
    const error = new HttpError(e, 500);
    return next(error);
  }
  if (!oneClient) return next(new HttpError('user does not exist', 404));
  // res.send({visits: thisCustomer.visits.map((item)=>item.toObject({getters:true}))})
  res.send({ oneClient });
};

export const updateOneClient = async (req: Request, res: Response, next: NextFunction) => {
  // const {projectId} = req.params;
  // Example
  const clientId = '620e86ee6ea2252da8aa3ff9';
  const update = {
    name: 'Tom Riddle',
  };
  let oneClient;
  try {
    oneClient = await User.findByIdAndUpdate(clientId, update, { new: true });
  } catch (e: any) {
    const error = new HttpError(e, 500);
    return next(error);
  }
  if (!oneClient) return next(new HttpError('user does not exist', 404));
  // res.send({visits: thisCustomer.visits.map((item)=>item.toObject({getters:true}))})
  res.send({ message: 'User Updated', oneClient });
};

export const deleteOneClient = async (req: Request, res: Response, next: NextFunction) => {
  // const {projectId} = req.params;
  // Example
  const clientId = '620e881461bc96e402778285';
  let oneClient;
  try {
    oneClient = await User.findByIdAndDelete(clientId);
  } catch (e: any) {
    const error = new HttpError(e, 500);
    return next(error);
  }
  if (!oneClient) return next(new HttpError('user does not exist', 404));
  res.send({ message: 'User deleted' });
};

export const addClient = async (req: Request, res: Response, next: NextFunction) => {
  const { name, email, password, freelancerId } = req.body;
  // const name = 'John3MyClient';
  // const email = 'John15@gmail.com';
  // const password = '1231231';
  // const freelancerId = '6217d7d302619e4c82dce9d1';
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError('Signing up failed, please try again later.', 500);
    return next(error);
  }

  if (existingUser) {
    const error = new HttpError('User exists already, please login instead.', 422);
    return next(error);
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError('Could not create user, please try again 2.', 500);
    return next(error);
  }

  const createdUser = new User({
    name,
    email,
    password: hashedPassword,
    verifiedEmail: true,
    freelancers: freelancerId,
  });

  let existingFreelancer;
  try {
    existingFreelancer = await User.findById(freelancerId);
    existingFreelancer.users.push(createdUser);
    await existingFreelancer.save();
    await createdUser.save();
  } catch (err) {
    console.log(err);
    const error = new HttpError('Signing up failed, please try again later 3.', 500);
    return next(error);
  }

  res.status(201).json({ userId: createdUser.id, email: createdUser.email, name: createdUser.name, role: createdUser.role });
};

// Messages

export const addMessage = async (req: userData, res: Response, next: NextFunction) => {
  // const text = 'new Message 😀15';
  // User - Owner message
  const { userId } = req.userData;
  // Receiver Message
  const { receiverId, message } = req.body;
  // John12@gmail.com
  // const userId = '6217d7d302619e4c82dce9d1';
  // Freelancer
  // const receiverId = '62192d9c2e604dba40f3a58b';
  // const receiverId = '62174aab25547950c4d6e6c4';
  // Clients John12Gmail.com
  // const receiverId = '621cb6c5bbe612528e95bb96';
  // const receiverId = '621cb6e34b851e3f19ddc4f2';
  // const receiverId = '621cb6e998abd24953dce2d9';
  let existingUser;
  try {
    existingUser = await User.findById(userId);
  } catch (err) {
    const error = new HttpError('Something went wrong', 500);
    return next(error);
  }

  if (!existingUser) {
    const error = new HttpError('User not exist', 422);
    return next(error);
  }

  let existingReceiver;
  try {
    existingReceiver = await User.findById(receiverId);
  } catch (err) {
    const error = new HttpError('Something went wrong', 500);
    return next(error);
  }

  if (!existingReceiver) {
    const error = new HttpError('User not exist', 422);
    return next(error);
  }

  const createdMessage = new Message({
    // TODO change in schema to message
    text: message,
    creator: userId,
    receiver: receiverId,
    nameCreator: existingUser.name,
    nameReceiver: existingReceiver.name,
  });

  try {
    existingUser.messages.push(createdMessage);
    existingReceiver.messages.push(createdMessage);
    await createdMessage.save();
    await existingUser.save();
    await existingReceiver.save();
  } catch (err) {
    console.log(err);
    const error = new HttpError('Something went wrong 2.', 500);
    return next(error);
  }

  res.status(201).json({ message: 'Message Created Correctly', createdMessage });
  // EXPERIMENTAL
  return sendMessagesToMatchedUsers(createdMessage);
};

export const getMessage = async (req: Request, res: Response, next: NextFunction) => {
  // const userId = req.userData;
  // const {freelancerId} = req.body
  const userId = '620f7f63b5d3f9af71000654';
  const freelancerId = '620e8720dd0a2b6f50f526da';
  let allMessagesUser;
  let allMessagesFreelancer;
  try {
    allMessagesUser = await User.findOne({ _id: userId }).populate('messages');
    allMessagesFreelancer = await User.findOne({ _id: freelancerId }).populate('messages');
  } catch (e: any) {
    const error = new HttpError('Something went wrong', 500);
    return next(error);
  }
  if (allMessagesFreelancer.role !== 'Freelancer' || allMessagesUser.role !== 'Client') return next(new HttpError('wrong role', 404));
  if (!allMessagesUser && !allMessagesFreelancer) return next(new HttpError('users not existing', 404));
  // res.send({visits: thisCustomer.visits.map((item)=>item.toObject({getters:true}))})
  res.send({ allMessagesUser, allMessagesFreelancer });
};

// Billings

// Experiment

let clients: any[] = [];
let messages: any;
async function getMessages(id: string) {
  // const userId = '620f7f63b5d3f9af71000654';
  // const freelancerId = '620e8720dd0a2b6f50f526da';
  let allMessages: any;
  try {
    allMessages = await User.findOne({ _id: id }).populate('messages');
  } catch (e: any) {
    console.log(e);
  }
  messages = allMessages.messages;
  return allMessages.messages;
}

export async function eventsHandler(req: userData, res: Response, next: NextFunction) {
  console.log('Hello Events Handler1');
  const { userId } = req.userData;
  const headers = {
    'Content-Type': 'text/event-stream',
    Connection: 'keep-alive',
    'Cache-Control': 'no-cache',
  };
  res.writeHead(200, headers);
  await getMessages(userId);

  const data = `data: ${JSON.stringify(messages)}\n\n`;
  res.write(data);

  const newClient = {
    id: userId,
    res,
  };

  clients.push(newClient);
  req.on('close', () => {
    console.log(`${userId} Connection closed`);
    clients = clients.filter((client) => client.id !== userId);
  });
}

export function status(req: Request, res: Response, next: NextFunction) {
  res.json({ clients: clients.map((item) => item.id) });
}

function sendMessagesToMatchedUsers(newMessage: any) {
  const clientsFiltered = clients.filter((item) => item.id === newMessage.creator.toString() || item.id === newMessage.receiver.toString());
  clientsFiltered.forEach((client) => client.res.write(`data: ${JSON.stringify(newMessage)}\n\n`));
}

// function sendEventsToAll(newMessage: any) {
//   clients.forEach((client) => client.res.write(`data: ${JSON.stringify(newMessage)}\n\n`));
// }

// export async function addFact(req: Request, res: Response, next: NextFunction) {
//   const newMessage = req.body;
//   console.log(newMessage);
//   facts.push(newMessage);
//   res.json(newMessage);
//   return sendEventsToAll(newMessage);
// }
