import AWS from 'aws-sdk';
import multer, { FileFilterCallback } from 'multer';
import multerS3 from 'multer-s3';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { userData } from './checkAuth';

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  signatureVersion: 'v4',
});

export const S3 = new AWS.S3();
const isAllowedMimetype = (mime: string) =>
  [
    'image/png',
    'image/jpg',
    'image/jpeg',
    'image/gif',
    'image/x-ms-bmp',
    'image/webp',
    'image/bmp',
    'image/svg+xml',
    'image/gif',
    'text/plain',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
  ].includes(mime.toString());
const fileFilter = (req: any, file: Express.Multer.File, callback: FileFilterCallback) => {
  const fileMime = file.mimetype;
  if (isAllowedMimetype(fileMime)) {
    callback(null, true);
  } else {
    const error = `Error: This extension ${file.originalname.split('.').pop()} is not allowed`;
    req.fileValidationError = error;
    console.log(error);
    callback(null, false);
  }
};
const getUniqFileName = (originalname: string, mimetype: string) => {
  const name = uuidv4();
  const ext = originalname.split('.').pop();
  return `${name}.${ext === 'blob' ? mimetype.split('/').pop() : ext}`;
};

export const handleUploadMiddleware = multer({
  fileFilter,
  storage: multerS3({
    s3: S3,
    bucket: process.env.AWS_BUCKET_NAME!,
    acl: 'public-read',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req: userData, file: any, cb) {
      const { userId } = req.userData;
      const fileName = getUniqFileName(file.originalname, file.mimetype);
      const s3_inner_directory = 'public_asset';
      const finalPath = `${s3_inner_directory}/${userId}uuid-${fileName}`;
      file.userData = userId;
      file.newName = `${userId}uuid-${fileName}`;

      cb(null, finalPath);
    },
  }),
});
