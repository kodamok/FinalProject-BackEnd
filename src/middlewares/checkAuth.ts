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
  if (req.method === 'OPTIONS') return next();
  const { JWT_KEY } = process.env;
  if (!JWT_KEY) return;
  const path = req.path.split('/');
  try {
    // Checking if token exist
    let token: string;
    if (path.length > 2 && path[2].length > 40) {
      token = path[2];
    } else {
      token = req.headers.authorization.split(' ')[1]; // Authorization: 'Bearer TOKEN'
    }

    // Not necessary ->
    // if (!token) throw new HttpError('Authorization failed! 1', 403);

    // Decoding Token
    const decodedToken = (await jwt.verify(token, JWT_KEY)) as DataStoredInToken;

    // Check if this is asking for verifyEmail
    if (!path.includes('verifyEmail')) {
      // Verifying email
      if (!decodedToken.verifiedEmail) throw new HttpError('Authorization failed! Verify your email', 403);
    }
    req.userData = { userId: decodedToken.userId, role: decodedToken.role, verifiedEmail: decodedToken.verifiedEmail, email: decodedToken.email };

    return next();
  } catch (err) {
    console.log('middleware Auth5');
    const error = new HttpError('Authorization failed! You will be logged out', 403);
    return next(error);
  }
};
