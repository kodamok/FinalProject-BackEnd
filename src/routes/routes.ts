import express from 'express';
import { example, example2 } from '../controllers/exampleController';

export const router = express.Router();

router.get('/', example);
router.get('/get', example2);
