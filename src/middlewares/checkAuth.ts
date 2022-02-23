import * as jwt from 'jsonwebtoken';
import { NextFunction, Request, Response } from 'express';
import HttpError from '../models/httpError';

interface userData extends Request {
  userData: string;
}

export default async (req: userData, res: Response, next: NextFunction): Promise<unknown> => {
  if (req.method === 'OPTIONS') return next();
  const { JWT_KEY } = process.env;
  if (!JWT_KEY) return;

  try {
    if (req.headers.authorization) {
      const token = req.headers.authorization.split(' ')[1]; // Authorization: 'Bearer TOKEN'
      if (!token) throw new HttpError('Authorization failed!', 403);
      const decodedToken = await jwt.verify(token, JWT_KEY);
      console.log(decodedToken);
      // const { userId, verifiedEmail } = decodedToken;
      // if (!userId) return;
      // Verified Email?
      // if (decodedToken?.verifiedEmail === false) throw new HttpError('Authorization failed! 2', 403);
      // req.userData = { userId: decodedToken.userId };
      req.userData = 'Tak';
      console.log(req.userData);
    }

    return next();
  } catch (err) {
    const error = new HttpError('Authorization failed! 3', 403);
    return next(error);
  }
};
