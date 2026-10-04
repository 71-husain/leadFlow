import mongoose from 'mongoose';
import { z } from 'zod';
import Document, { DOC_TYPES } from '../models/Document.js';
import HttpError from '../utils/HttpError.js';
import * as documentService from '../services/documentService.js';
import { getLead } from '../services/leadService.js';
import { openDownload } from '../services/storage.js';

export const leadDocuments = async (req, res) => {
  const lead = await getLead(req.user.brokerageId, req.params.id); // enforces tenant + 404
  const documents = await documentService.listLeadDocuments(req.user.brokerageId, lead._id);
  res.json({ documents });
};

export const myCase = async (req, res) => {
  res.json(await documentService.getClientCase(req.user));
};

export const upload = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'A file is required' });
  const parsed = z.enum(DOC_TYPES).safeParse(req.body.type);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid document type' });

  const document = await documentService.uploadDocument(req.user, { file: req.file, type: parsed.data });
  res.status(201).json({ document });
};

export const downloadFile = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Document not found');

  const filter = { _id: req.params.id, brokerageId: req.user.brokerageId };
  if (req.user.role === 'client') filter.clientUserId = req.user.id; // clients only get their own files

  const doc = await Document.findOne(filter);
  if (!doc) throw new HttpError(404, 'Document not found');

  res.set({
    'Content-Type': doc.mimeType,
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(doc.originalName)}`,
    'X-Content-Type-Options': 'nosniff',
  });
  openDownload(doc.fileId).on('error', () => res.destroy()).pipe(res);
};