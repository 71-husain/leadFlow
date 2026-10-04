import mongoose from 'mongoose';

const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'documents' });

export const saveFile = (buffer, filename, metadata = {}) =>
  new Promise((resolve, reject) => {
    const stream = bucket().openUploadStream(filename, { metadata });
    stream.on('error', reject);
    stream.on('finish', () => resolve(stream.id));
    stream.end(buffer);
  });

export const openDownload = (fileId) => bucket().openDownloadStream(fileId);