import express, { Express, NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import dotenv from 'dotenv';
import HttpError from './src/models/httpError';
import { router as routes } from './src/routes/routes';
import mongoose from 'mongoose';

dotenv.config();

const PORT = process.env.PORT || 3000;
const app: Express = express();

app.use(helmet());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Role');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
  next();
});

app.use('/', routes);

app.use((req: Request, res: Response) => {
  throw new HttpError('Could not find this route.', 404);
});

app.use((error: HttpError, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) return next(error);
  const status = error.status || 500;
  const message = error.message || 'Something went wrong';
  res.status(status).send({ status, message });
});

// Connect to Database and run Server
// const { DB_USER, DB_PASSWORD, DB_NAME } = process.env;
// mongoose
//   .connect(`mongodb+srv://${DB_USER}:${DB_PASSWORD}@cluster0.ptw5x.mongodb.net/${DB_NAME}?retryWrites=true&w=majority`)
//   .then(() => {
//     app.listen(PORT, () => console.log(`Running on ${PORT} ⚡`));
//   })
//   .catch((err: any) => {
//     console.log(err);
//   });

// Run Server
app.listen(PORT, () => console.log(`Running on ${PORT} ⚡`));
