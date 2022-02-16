import express from 'express';
import { example } from '../controllers/exampleController';

export const router = express.Router();

router.get('/', example);
