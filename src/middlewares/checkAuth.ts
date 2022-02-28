import * as jwt from 'jsonwebtoken';
import { NextFunction, Request, Response } from 'express';
import HttpError from '../models/httpError';

export interface DataStoredInToken {
  userId: string;
  email: string;
  role: string;
  verifiedEmail: boolean;
}

export interface userData extends Request {
  userData: DataStoredInToken;
  headers: {
    authorization: string;
  };
}

export default async (req: userData, res: Response, next: NextFunction) => {
  console.log('middleware Auth');
  console.log('reg method?', req.method === 'OPTIONS');
  if (req.method === 'OPTIONS') return next();
  const { JWT_KEY } = process.env;
  if (!JWT_KEY) return;
  console.log('middleware Auth2');
  const path = req.path.split('/');
  try {
    console.log('middleware Auth3');
    // Checking if token exist
    const token = req.headers.authorization.split(' ')[1]; // Authorization: 'Bearer TOKEN'
    // Not necessary ->
    // if (!token) throw new HttpError('Authorization failed! 1', 403);

    // Decoding Token
    const decodedToken = (await jwt.verify(token, JWT_KEY)) as DataStoredInToken;
    console.log({ decodedToken });

    // Check if this is asking for verifyEmail
    if (!path.includes('verifyEmail')) {
      // Verifying email
      if (!decodedToken.verifiedEmail) throw new HttpError('Authorization failed! 2', 403);
    }
    req.userData = { userId: decodedToken.userId, role: decodedToken.role, verifiedEmail: decodedToken.verifiedEmail, email: decodedToken.email };
    console.log({ user: req.userData });

    console.log('middleware Auth4 - Success');
    return next();
  } catch (err) {
    console.log('middleware Auth5');
    const error = new HttpError('Authorization failed! 3', 403);
    return next(error);
  }
};
