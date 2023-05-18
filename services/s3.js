const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const mime = require('mime-types');
const logger = require('./logger');

require('dotenv').config();

const bucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const host = process.env.AWS_HOST;

const client = new S3Client({ region, credentials:{
  accessKeyId,
  secretAccessKey,
}});

const uploadFile = async (dataBase64, projectId, filename) => {
  try {
    const fileExtension = filename.split('.').pop().toLowerCase();
    const contentType = mime.lookup(fileExtension);

    if (!contentType) {
      throw new Error(`Unknown file type for extension: ${fileExtension}`);
    }

    const buff = Buffer.from(dataBase64.replace(/^data:[^;]+;base64,/, ""), 'base64');
    const path = `files/${projectId}/${filename}`;

    logger.info('uploadFile func is going well. next step is client.send request, 25 line');
    const response = await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        ACL: 'public-read',
        Key: path,
        Body: buff,
        ContentType: contentType,
        ContentEncoding: 'base64'
      })
    );
  
    const isUploaded = response['$metadata'].httpStatusCode === 200;
    logger.info(`uploadFile, 38 line, isUploaded value: ${isUploaded}`)
    const url =  isUploaded ? `${host}/${path}` : null;
    
    logger.info(`uploadFile, 41 line, url value: ${url}`)
    return {
      isUploaded,
      url
    }
  } catch (e) {
    logger.info(`"PATCH" request failed, message: ${e.message}. something wrong with the request to s3`)
  }
}

const deleteFile = async (url) => {
  const key = url.replace(`${host}/`, '');
  await client.send(
    new DeleteObjectCommand({ 
      Bucket: bucketName, 
      Key: key, 
    })
  );
}

exports.uploadFile = uploadFile;
exports.deleteFile = deleteFile;
