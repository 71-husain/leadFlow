import { z } from 'zod';
import { STAGES } from '../utils/constants.js';
import * as leadService from '../services/leadService.js';
import * as clientService from '../services/clientService.js';


const moveSchema = z.object({
  stage: z.enum(STAGES),
  version: z.number().int().min(0),
});

export const list = async (req, res) => {
  const leads = await leadService.listLeads(req.user.brokerageId, { stage: req.query.stage });
  res.json({ leads });
};

export const getOne = async (req, res) => {
  const lead = await leadService.getLead(req.user.brokerageId, req.params.id);
  res.json({ lead });
};

export const moveStage = async (req, res) => {
  const parsed = moveSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid stage or version' });

  const lead = await leadService.moveLeadStage(req.user.brokerageId, req.params.id, parsed.data , req.user);
  res.json({ lead });
};

export const convert = async (req, res) => {
  const result = await clientService.convertLeadToClient(req.user.brokerageId, req.params.id);
  res.status(201).json(result);
};