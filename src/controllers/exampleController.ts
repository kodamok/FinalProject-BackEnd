import { NextFunction, Request, Response } from 'express';
import HttpError from '../models/httpError';

export const example = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.send('<h1>Hello from the TypeScript world!</h1>');
  } catch (e) {
    const error = new HttpError('Something wrong', 501);
    return next(error);
  }
};

export const example2 = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.send('<h1>Hello from the TypeScript world2!</h1>');
  } catch (e) {
    const error = new HttpError('Something wrong', 501);
    return next(error);
  }
};
