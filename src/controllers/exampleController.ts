import { NextFunction, Request, Response } from 'express';
import HttpError from '../models/httpError';
import User from '../models/User';
import Project from '../models/Project';
import Message from '../models/Message';
import * as jwt from 'jsonwebtoken';
import { userData } from '../middlewares/checkAuth';
import { generatePdf } from '../utils/generatePdf';
import { promises as fsPromises } from 'fs';
import path from 'path';
import axios from 'axios';
import bcrypt from 'bcrypt';
import { S3 } from '../middlewares/uploadSetup';
const { cloudinary } = require('../utils/cloudinary');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const { FRONTEND_URL, JWT_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET }: any = process.env;

// LOGIN GOOGLE

async function getAccessTokenFromCode(code: any) {
  const { data } = await axios({
    url: `https://oauth2.googleapis.com/token`,
    method: 'post',
    data: {
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: FRONTEND_URL,
      grant_type: 'authorization_code',
      code,
    },
  });
  console.log({ data }); // { access_token, expires_in, token_type, refresh_token }
  return data.access_token;
}
async function getGoogleUserInfo(accessToken: any) {
  const { data } = await axios({
    url: 'https://www.googleapis.com/oauth2/v2/userinfo',
    method: 'get',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  console.log(data); // { id, email, given_name, family_name }
  return data;
}
export const googleLogin = async (req: Request, res: Response, next: NextFunction) => {
  const { code } = req.body;
  console.log({ code });
  let data: any;
  try {
    const token = await getAccessTokenFromCode(code);
    data = await getGoogleUserInfo(token);
    console.log({ token, data });
    console.log(data.email);
  } catch (e) {
    const error = new HttpError('Something wrong', 501);
    return next(error);
  }

  let existingUser;
  try {
    existingUser = await User.findOne({ email: data.email });
  } catch (e) {
    const error = new HttpError('Something wrong', 501);
    return next(error);
  }

  if (!existingUser) {
    let hashedPassword;
    const randomPassword = (Math.random() * 1000000).toFixed(0);
    console.log({ randomPassword });
    try {
      hashedPassword = await bcrypt.hash(randomPassword, 12);
    } catch (err) {
      const error = new HttpError('Something wrong, please try again 4.', 500);
      return next(error);
    }
    console.log(randomPassword);

    const createdUser = new User({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      verifiedEmail: data.verified_email,
      role: 'Freelancer',
      google: {
        data,
      },
    });
    try {
      await createdUser.save();
    } catch (err) {
      console.log(err);
      const error = new HttpError('Something went wrong, please try again later 3.', 500);
      return next(error);
    }
    if (!createdUser.verifiedEmail) {
      let token;
      try {
        token = jwt.sign(
          { userId: createdUser.id, email: createdUser.email, role: createdUser.role, verifiedEmail: createdUser.verifiedEmail },
          `${JWT_KEY}`,
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
        to: createdUser.email,
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
      res.json({ message: 'You need verify email' });
    }
    if (createdUser.verifiedEmail) {
      let token;
      try {
        token = jwt.sign(
          { userId: createdUser.id, email: createdUser.email, role: createdUser.role, verifiedEmail: createdUser.verifiedEmail },
          `${JWT_KEY}`,
          { expiresIn: '1h' },
        );
      } catch (err) {
        const error = new HttpError('Something went wrong.', 500);
        return next(error);
      }

      const message = `
  You created Account in Nomad Studio with Google Account - here we give you also password to manage user information \r\n
  Keep in safe place or change on website on page Settings \r\n
  password: ${randomPassword}
  `;
      const data = {
        to: createdUser.email,
        from: 'freelancerwebproject@gmail.com',
        subject: `Your password to manage your private data`,
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

      res.json({
        userId: existingUser.id,
        email: existingUser.email,
        token: token,
        name: existingUser.name,
        role: existingUser.role,
        identityCardNumber: existingUser.identityCardNumber,
        taxNumber: existingUser.taxNumber,
        avatar: existingUser.avatar || existingUser.google.picture,
        exp: Date.now() + 1000 * 60 * 59,
      });
    }
  }
  if (existingUser) {
    if (!existingUser?.google?.email) {
      try {
        existingUser.google = data;
        existingUser.save();
      } catch (e) {
        const error = new HttpError('Something went wrong.', 500);
        return next(error);
      }
    }

    if (!existingUser.verifiedEmail) {
      let token;
      try {
        token = jwt.sign(
          { userId: existingUser.id, email: existingUser.email, role: existingUser.role, verifiedEmail: existingUser.verifiedEmail },
          `${JWT_KEY}`,
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
        to: existingUser.email,
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
      res.json({ message: 'You need verify email' });
    }

    if (existingUser.verifiedEmail) {
      let token;
      try {
        token = jwt.sign(
          { userId: existingUser.id, email: existingUser.email, role: existingUser.role, verifiedEmail: existingUser.verifiedEmail },
          `${JWT_KEY}`,
          { expiresIn: '1h' },
        );
      } catch (err) {
        const error = new HttpError('Something went wrong.', 500);
        return next(error);
      }
      res.json({
        userId: existingUser.id,
        email: existingUser.email,
        token: token,
        name: existingUser.name,
        role: existingUser.role,
        identityCardNumber: existingUser.identityCardNumber,
        taxNumber: existingUser.taxNumber,
        avatar: existingUser.avatar || data.picture,
        exp: Date.now() + 1000 * 60 * 59,
      });
    }
  }
};

// Login/Signup

export const login = async (req: Request, res: Response, next: NextFunction) => {
  const { password, email } = req.body;
  // const email = 'John5@gmail.com';
  // const password = '1231231';
  // console.log('i try backend ');
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
      `${JWT_KEY}`,
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
    identityCardNumber: existingUser.identityCardNumber,
    taxNumber: existingUser.taxNumber,
    avatar: existingUser.avatar,
    exp: Date.now() + 1000 * 60 * 59,
  });
};
export const signUp = async (req: Request, res: Response, next: NextFunction) => {
  const { name, email, password, identityCardNumber, taxNumber, image } = req.body;
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

  let imageUrl;
  if (image) {
    try {
      await cloudinary.uploader
        .upload(image, {
          quality: 70,
          upload_preset: 'ml_default',
        })
        .then((result: any) => {
          console.log({ result });
          imageUrl = result.secure_url;
        });
    } catch (e) {
      console.log(e);
      const error = new HttpError('something wrong with upload image', 500);
      return next(error);
    }
  }

  const createdUser = new User({
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    verifiedEmail: false,
    role,
    identityCardNumber: identityCardNumber === '' ? undefined : identityCardNumber,
    taxNumber,
    avatar: imageUrl,
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
      `${JWT_KEY}`,
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
      `${JWT_KEY}`,
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
      `${JWT_KEY}`,
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
  const { userId } = req.userData;
  const { limit } = req.params;

  let allProjects;
  try {
    allProjects = await User.findById(userId).populate({
      path: 'projects',
      select: '-password -messages -verifiedEmail -users -freelancers',
      options: { limit: +limit || 0, sort: { updatedAt: -1 } },
    });
  } catch (e: any) {
    const error = new HttpError('Something went wrong, try again later', 500);
    return next(error);
  }
  if (!allProjects) return next(new HttpError('projects does not exists', 404));
  // console.log({ allProjects });
  // let sortedAndLimited;
  // if (limit) {
  //   sortedAndLimited = allProjects.projects.sort({ createdAt: 1 }).limit(limit);
  //   // console.log({ sortedAndLimited });
  //   res.send(sortedAndLimited);
  // }

  // res.send({visits: thisCustomer.visits.map((item)=>item.toObject({getters:true}))})
  res.send(allProjects.projects);
};
export const getOneProject = async (req: Request, res: Response, next: NextFunction) => {
  const { projectId } = req.params;
  // Example
  // const projectId = '620f5dd5dce3f5afb68ab26e';
  let oneProject;
  try {
    oneProject = await Project.findById(projectId);
  } catch (e: any) {
    const error = new HttpError(e, 500);
    return next(error);
  }
  if (!oneProject) return next(new HttpError('project does not exist', 404));
  // res.send({visits: thisCustomer.visits.map((item)=>item.toObject({getters:true}))})
  res.send(oneProject);
};
export const updateOneProject = async (req: userData, res: Response, next: NextFunction) => {
  const { projectId } = req.params;
  const { role } = req.userData;
  if (role !== 'Freelancer') return next(new HttpError('not allow', 404));
  const { avatar, companyName, clientName, websiteName, taxNumber, startDate, dueDate, services, images, files } = req.body;

  let imageUrl;
  if (avatar && !avatar.startsWith('https')) {
    try {
      await cloudinary.uploader
        .upload(avatar, {
          quality: 70,
          upload_preset: 'ml_default',
        })
        .then((result: any) => {
          console.log({ result });
          imageUrl = result.secure_url;
        });
    } catch (e) {
      console.log(e);
      const error = new HttpError('something wrong with upload image', 500);
      return next(error);
    }
  } else if (avatar && avatar.startsWith('https')) {
    imageUrl = avatar;
  }

  const servicesWithoutEmptyObjects = services.filter((item: any) => item.description !== '' || item.price !== '' || item.serviceName !== '');
  const update = {
    companyName,
    clientName,
    websiteName,
    taxNumber,
    startDate,
    dueDate,
    files,
    images,
    services: servicesWithoutEmptyObjects,
    avatar: imageUrl,
  };

  console.log({ update });

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
export const deleteOneProject = async (req: userData, res: Response, next: NextFunction) => {
  const { projectId } = req.params;
  const { role } = req.userData;
  if (role !== 'Freelancer') return next(new HttpError('not allow', 404));
  // Example
  // const projectId = '620f5dd5dce3f5afb68ab26e';
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
export const addProject = async (req: userData, res: Response, next: NextFunction) => {
  const { userId, role } = req.userData;
  const { clientId } = req.params;
  let freelancerId: string;
  if (role === 'Freelancer') {
    freelancerId = userId;
  } else {
    throw next(new HttpError('something wrrong', 500));
  }
  const { companyName, customerName, website, taxNumber, services, name, description, progress, startDate, dueDate, hoursWorked, image } = req.body;

  let existingUser;
  try {
    existingUser = await User.findById(clientId);
  } catch (e) {
    const error = new HttpError('user not exist', 403);
    return next(error);
  }

  if (!existingUser) return next(new HttpError('something wrong 1', 500));

  let existingFreelancer;
  try {
    existingFreelancer = await User.findById(freelancerId);
  } catch (e) {
    const error = new HttpError('freelancer not exist', 403);
    return next(error);
  }

  if (!existingFreelancer) return next(new HttpError('something wrong 2', 500));

  // const clientId = '620e86ee6ea2252da8aa3ff9';
  // const freelancerId = '620e8720dd0a2b6f50f526da';
  // const newProject = new Project({
  //   text,
  //   clientName: existingUser.name,
  //   freelancerName: existingFreelancer.name,
  //   ownerUser: clientId,
  //   ownerFreelancer: freelancerId,
  // });

  let imageUrl;
  if (image) {
    try {
      await cloudinary.uploader
        .upload(image, {
          quality: 70,
          upload_preset: 'ml_default',
        })
        .then((result: any) => {
          console.log({ result });
          imageUrl = result.secure_url;
        });
    } catch (e) {
      console.log(e);
      const error = new HttpError('something wrong with upload image', 500);
      return next(error);
    }
  }

  const servicesWithoutEmptyObjects = services.filter((item: any) => item.description !== '' || item.price !== '' || item.serviceName !== '');

  const newProject = new Project({
    companyName,
    clientName: customerName || existingUser.name,
    websiteName: website,
    taxNumber,
    services: servicesWithoutEmptyObjects,
    freelancerName: existingFreelancer.name,
    ownerUser: clientId,
    ownerFreelancer: freelancerId,
    name,
    description,
    progress,
    startDate,
    dueDate,
    hoursWorked,
    avatar: imageUrl,
  });

  try {
    await newProject.save();
    // Push reference to projects
    existingUser.projects.push(newProject);
    // Push reference to projects
    existingFreelancer.projects.push(newProject);
    // Saving Models
    await existingUser.save();
    await existingFreelancer.save();
  } catch (e) {
    const error = new HttpError('Something wrong with savings models', 500);
    return next(error);
  }
  res.send({ message: 'Project created', newProject });
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
  const { limit } = req.params;

  // const freelancerId = '620e8720dd0a2b6f50f526da';
  let allClients: any;
  try {
    allClients = await User.findOne({ _id: freelancerId }).populate({
      path: 'users',
      select: '-password -messages -verifiedEmail -freelancers',
      options: { limit: +limit || 0, sort: { updatedAt: -1 } },
    });
  } catch (e: any) {
    const error = new HttpError(e, 500);
    return next(error);
  }
  if (!allClients) return next(new HttpError('Clients does not exists', 404));

  // if (limit) {
  //   const sorted = allClients.users.sort({ createdAt: 1 }).limit(limit);
  //   console.log({ sorted });
  //   res.json(sorted);
  // }

  // res.send({visits: thisCustomer.visits.map((item)=>item.toObject({getters:true}))})
  // res.send(allClients.clients.projects.map((item: any) => item));
  res.send(allClients.users);
};
export const getOneClient = async (req: Request, res: Response, next: NextFunction) => {
  const { clientId } = req.params;
  // Example
  // const clientId = '620e86ee6ea2252da8aa3ff9';
  let oneClient;
  try {
    oneClient = await User.findById(clientId).select(['-password', '-verifiedEmail']);
  } catch (e: any) {
    const error = new HttpError(e, 500);
    return next(error);
  }
  if (!oneClient) return next(new HttpError('user does not exist', 404));
  // res.send({visits: thisCustomer.visits.map((item)=>item.toObject({getters:true}))})
  res.send(oneClient);
};
export const updateOneClient = async (req: userData, res: Response, next: NextFunction) => {
  // const {projectId} = req.params;
  // Example
  // const clientId = '620e86ee6ea2252da8aa3ff9';
  let { userId } = req.userData;
  if (!req.params.clientId) {
    userId = userId;
  } else {
    userId = req.params.clientId;
  }

  const { name, email, newPassword, newPasswordRepeated, password, identityCardNumber, taxNumber, avatar } = req.body;
  if (newPassword) {
    if (newPassword !== newPasswordRepeated) return next(new HttpError('password are not the same', 404));
    if (newPassword.length < 6) return next(new HttpError('Password must be at least 6 characters', 404));
  }
  if (identityCardNumber) {
    if (identityCardNumber.length < 6) return next(new HttpError('Identity Card Number must be at least 6 characters', 404));
  }
  if (taxNumber) {
    if (taxNumber.length < 6) return next(new HttpError('Tax Number must be at least 6 characters', 404));
  }

  let existingUser;
  try {
    existingUser = await User.findById(userId);
  } catch (err) {
    const error = new HttpError('Something went wrong, please try again later.', 500);
    return next(error);
  }
  if (!existingUser) {
    const error = new HttpError('Something went wrong, please try again later. 1', 403);
    return next(error);
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    const error = new HttpError('Password Not Correct', 500);
    return next(error);
  }

  if (!isValidPassword) {
    const error = new HttpError('Password Not Correct', 403);
    return next(error);
  }

  let hashedPassword;
  if (newPassword) {
    try {
      hashedPassword = await bcrypt.hash(newPassword, 12);
    } catch (err) {
      const error = new HttpError('Could not create user, please try again 2.', 500);
      return next(error);
    }
  }

  console.log({ avatar });

  let imageUrl;
  if (avatar && !avatar.startsWith('https')) {
    try {
      await cloudinary.uploader
        .upload(avatar, {
          quality: 70,
          upload_preset: 'ml_default',
        })
        .then((result: any) => {
          console.log({ result });
          imageUrl = result.secure_url;
        });
    } catch (e) {
      console.log(e);
      const error = new HttpError('something wrong with upload image', 500);
      return next(error);
    }
  } else if (avatar && avatar.startsWith('https')) {
    imageUrl = avatar;
  }

  const update = {
    name,
    email,
    password: hashedPassword,
    identityCardNumber,
    taxNumber,
    avatar: imageUrl || existingUser.avatar || existingUser.google.avatar,
  };
  console.log({ imageUrl });
  console.log({ update });

  let updatedClient;
  try {
    updatedClient = await User.findByIdAndUpdate(userId, update, { new: true });
  } catch (e: any) {
    const error = new HttpError(e, 500);
    return next(error);
  }
  // res.send({visits: thisCustomer.visits.map((item)=>item.toObject({getters:true}))})
  res.json({
    email: updatedClient.email,
    name: updatedClient.name,
    identityCardNumber: updatedClient.identityCardNumber,
    taxNumber: updatedClient.taxNumber,
    avatar: updatedClient.avatar,
  });
};
export const deleteOneClient = async (req: Request, res: Response, next: NextFunction) => {
  const { clientId } = req.params;
  // Example
  // const clientId = '620e881461bc96e402778285';
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
export const addClient = async (req: userData, res: Response, next: NextFunction) => {
  const { name, email, password, phone } = req.body;
  const { userId } = req.userData;
  if (password.length < 6) return next(new HttpError('Password must be at least 6 characters', 404));
  if (name.length < 3) return next(new HttpError('Name must be at least 3 characters', 404));
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
    const error = new HttpError('User exists already', 422);
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
    phone,
    verifiedEmail: true,
    freelancers: userId,
  });

  let existingFreelancer;
  try {
    existingFreelancer = await User.findById(userId);
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

// Statistics

export const getStatistics = async (req: userData, res: Response, next: NextFunction) => {
  const { userId, role } = req.userData;
  let freelancerId: string;
  if (role === 'Freelancer') {
    freelancerId = userId;
  } else {
    throw next(new HttpError('something wrrong', 500));
  }
  // const freelancerId = '620e8720dd0a2b6f50f526da';
  let existingUser;
  try {
    existingUser = await User.findById(freelancerId);
  } catch (e: any) {
    const error = new HttpError(e, 500);
    return next(error);
  }
  if (!existingUser) return next(new HttpError('user does not exists', 404));

  const { messages, projects, users } = existingUser;
  const allStatistics = {
    messages: messages.length,
    projects: projects.length,
    clients: users.length,
  };

  // res.send({visits: thisCustomer.visits.map((item)=>item.toObject({getters:true}))})
  res.send(allStatistics);
};

// Generating PDF

export const generatePdfRoute = async (req: Request, res: Response, next: NextFunction) => {
  // Html Which We want use to generate file
  const { htmlToDisplay } = req.body;

  // Our Root Folder which we want use to save files
  const root = 'src/files/';

  // File Name which we will create after converting
  const nameFile = `Generated_PDF_${new Date().toJSON().slice(0, 10)}-${new Date().getHours()}'${
    new Date().getMinutes() < 10 ? `0${new Date().getMinutes()}` : new Date().getMinutes()
  }'${new Date().getSeconds()}.`;
  const typeOfFile = 'pdf';
  const fileWithExtension = nameFile + typeOfFile;

  // Full Name Expected Result Name
  const expectedFileName = root + fileWithExtension;

  // File which we want convert into pdf/png/jpeg
  const fileNameHtml = `${Date.now()}.html`;

  // Creating Safe Paths
  const fileName = path.join(root, fileWithExtension);
  const pathToFileHtml = path.join(root, fileNameHtml);

  // Checking for possible hackers
  if (!fileName.startsWith(root.slice(0, 3)) || !pathToFileHtml.startsWith(root.slice(0, 3))) {
    console.log('trying to sneak out of the web root?');
    return next(new HttpError('something wrong with download', 404));
  }

  try {
    // Saving Html to File
    await fsPromises.writeFile(pathToFileHtml, htmlToDisplay);
    // Generating File Into (PDF, PNG, JPEG)
    await generatePdf(typeOfFile, '', fileNameHtml, expectedFileName);
  } catch (e) {
    const error = new HttpError('Something wrong with generating File', 501);
    return next(error);
  }
  res.json({ path: 'static/' + fileWithExtension, fileName: fileWithExtension });
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

// Chat Messages - SSE EVENTS

let clients: any[] = [];
async function getMessages(id: string) {
  // const userId = '620f7f63b5d3f9af71000654';
  // const freelancerId = '620e8720dd0a2b6f50f526da';
  let allMessages: any;
  try {
    allMessages = await User.findOne({ _id: id }).populate('messages');
  } catch (e: any) {
    console.log(e);
  }
  return allMessages.messages;
}
function stopServerForClient(id: string) {
  const clientsFiltered = clients.filter((item) => item.id === id);
  clientsFiltered.forEach((client) => client.res.write(`data: ${JSON.stringify({ text: 'stopSSEEventsNow' })}\n\n`));
}
function sendMessagesToMatchedUsers(newMessage: any) {
  const clientsFiltered = clients.filter((item) => item.id === newMessage.creator.toString() || item.id === newMessage.receiver.toString());
  console.log({ clientsFiltered });
  clientsFiltered.forEach((client) => client.res.write(`data: ${JSON.stringify(newMessage)}\n\n`));
}
export const stopServer = async (req: userData, res: Response, next: NextFunction) => {
  const { userId } = req.userData;
  stopServerForClient(userId);
  res.send({ message: 'Stopped' });
};
export async function eventsHandler(req: userData, res: Response, next: NextFunction) {
  // console.log('Hello Events Handler1');
  const { userId } = req.userData;
  const headers = {
    'Content-Type': 'text/event-stream',
    Connection: 'keep-alive',
    'Cache-Control': 'no-cache',
  };
  // let clientToRemoveConnection: any;
  // const filteredTheSameUserOnManyBrowsers = clients.filter((item) => item.id === userId);
  // console.log({ filteredTheSameUserOnManyBrowsers: filteredTheSameUserOnManyBrowsers.length });
  // if (filteredTheSameUserOnManyBrowsers.length > 1) {
  //   console.log('Hello');
  //   // console.log(`${userId} Connection closed`);
  //   console.log('clients before filter', clients);
  //   const sortedArray = clients.filter((client) => client.id === userId).sort((a, b) => b.createdAt + a.createdAt);
  //   console.log(sortedArray);
  //   clientToRemoveConnection = sortedArray[0];
  //   // console.log(clientToRemoveConnection);
  //   const newMessage = {
  //     text: 'stopSSEEventsNow',
  //   };
  //   clientToRemoveConnection.res.write(`data: ${JSON.stringify(newMessage)}\n\n`);
  //   // clients = [...clients.slice(0, clientIndex), ...clients.slice(clientIndex + 1)];
  //   clients = clients.filter((item) => item.createdAt !== clientToRemoveConnection.createdAt);
  //   console.log('clients after filter', clients);
  // }

  // Checking if user is close to have 6 connected account (prevent freezing server, when user open 6 tabs in one browser)
  const filteredTheSameUserOnManyBrowsers = clients.filter((item) => item.id === userId);
  if (filteredTheSameUserOnManyBrowsers.length > 4) {
    stopServerForClient(userId);
  }

  res.writeHead(200, headers);
  const messages = await getMessages(userId);

  const data = `data: ${JSON.stringify(messages)}\n\n`;
  setInterval(() => {
    res.write(`:\n\n`);
  }, 3000);
  res.write(data);

  const newClient = {
    id: userId,
    createdAt: Date.now(),
    res,
  };
  console.log('Connection opened ' + userId);
  clients.push(newClient);
  req.on('close', () => {
    console.log(`${userId} Connection closed`);
    // if (clientToRemoveConnection) {
    //   clients = clients.filter((item) => item.createdAt !== clientToRemoveConnection.createdAt);
    // } else {
    //   clients = clients.filter((client) => client.id !== userId);
    // }
    // const filteredTheSameUserOnManyBrowsers = clients.filter((item) => item.id === userId);
    // if (filteredTheSameUserOnManyBrowsers.length > 3) {
    //   stopServerForClient(userId);
    // }
    // console.log(
    //   'clients inside closing',
    //   clients.map((item) => ({ id: item.id, time: item.createdAt })),
    // );
    clients = clients.filter((client) => client.id !== userId);
  });
}
export function status(req: Request, res: Response, next: NextFunction) {
  res.json({ clients: clients.map((item) => item.id), clientsCount: clients.length });
}

// MESSAGE TO ALL
// function sendEventsToAll(newMessage: any) {
//   clients.forEach((client) => client.res.write(`data: ${JSON.stringify(newMessage)}\n\n`));
// }

// AWS S3 Handle CRUD Files

export const uploadFilesToProject = async (req: any, res: Response, next: NextFunction) => {
  // console.log({ req });
  const { files } = req;
  const { projectId } = req.params;
  // const { personId } = req.body;
  const { userId } = req.userData;
  if (!files.length) {
    return next(new HttpError('Something went wrong with uploading file', 500));
  }
  if (req.fileValidationError) {
    return next(new HttpError(req.fileValidationError, 500));
  }

  const arrWithFilesUrl = [];
  const arrWithImagesUrl = [];
  for (const file of files) {
    console.log(file);
    if (file.mimetype.startsWith('image')) {
      arrWithImagesUrl.push({ url: file.location, owner: userId, ext: file.location.split('.').pop(), size: file.size, key: file.key });
    } else {
      arrWithFilesUrl.push({ url: file.location, owner: userId, ext: file.location.split('.').pop(), size: file.size, key: file.key });
    }
  }

  let oneProject;
  try {
    oneProject = await Project.findById(projectId);
  } catch (e: any) {
    const error = new HttpError('Something went wrong, try again later', 500);
    return next(error);
  }

  if (!oneProject) return next(new HttpError('project does not exist', 404));
  // let existingUserWhichNotSentThisFiles;
  // try {
  //   existingUserWhichNotSentThisFiles = await User.findById(personId);
  // } catch (e: any) {
  //   // TODO CHANGE ALL e in httpError to message, because this return objects instead of string and make error on frontend
  //   const error = new HttpError('Something went wrong, try again later 2', 500);
  //   return next(error);
  // }
  // if (!existingUserWhichNotSentThisFiles) return next(new HttpError('user does not exist', 404));

  try {
    oneProject.files.push(...arrWithFilesUrl);
    oneProject.images.push(...arrWithImagesUrl);
    oneProject.save();
  } catch (e: any) {
    const error = new HttpError('Something went wrong, try again later 3', 500);
    return next(error);
  }

  res.status(200).json({ message: 'Uploaded correctly into a project' });
};
export const api_deleteFiles = (req: Request, res: Response) => {
  const { fileKeys } = req.body;
  if (!fileKeys || !Array.isArray(fileKeys) || (fileKeys && fileKeys.length == 0)) {
    res.status(400);
    return res.json({ error: 'Error! File keys not found.' });
  }
  const deleteParam = {
    Bucket: process.env.AWS_BUCKET_NAME!,
    Delete: {
      Objects: fileKeys.map((key: string) => ({ Key: key })),
    },
  };

  S3.deleteObjects(deleteParam, function (err, data) {
    if (err) throw err;

    res.status(200);
    return res.json({ msg: 'Deleted!' });
  });
};
export const api_ListFiles = (req: Request, res: Response) => {
  // const { folderName } = req.query;
  const folderName = 'public_asset';
  if (!folderName) {
    res.status(400);
    return res.json({ error: 'Error! Folder name is missing.' });
  }
  const listParams = {
    Bucket: process.env.AWS_BUCKET_NAME!,
    Prefix: folderName?.toString() || '/',
  };

  S3.listObjectsV2(listParams, function (err, data) {
    if (err) throw err;
    if (data.Contents && data.Contents.length > 0) {
      const fileObjArr: any[] = [];

      // fileObj: S3.ObjectList
      data.Contents.forEach((fileObj: any) => {
        if (fileObj.Size > 0) {
          fileObjArr.push({
            ...fileObj,
            location: `https://${process.env.AWS_BUCKET_NAME}${process.env.AWS_REGION === 'eu-central-1' ? '.' : '-'}s3${
              process.env.AWS_REGION === 'us-east-1' ? '' : '-' + process.env.AWS_REGION
            }.amazonaws.com/${fileObj.Key}`,
          });
        }
      });
      data.Contents = fileObjArr;
    }

    res.status(200);
    return res.json({ data });
  });
};
