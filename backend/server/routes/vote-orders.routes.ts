import { Router } from 'express';
import { VoteChannel } from '@prisma/client';
import { createVoteOrder } from '../services/vote-order.service.js';

export const voteOrdersRouter = Router();

voteOrdersRouter.post('/', async (req, res, next) => {
  try {
    const order = await createVoteOrder(req.body, VoteChannel.WEB);
    res.status(201).json({ success: true, data: order, message: 'Vote order created.' });
  } catch (error) {
    next(error);
  }
});
