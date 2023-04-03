const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const uuid = require('uuid/v1');
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

const uploadFile = async (dataBase64, projectId) => {
  try {
    const buff = new Buffer.from(dataBase64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
    const generatedName = uuid();
    const filename = `${generatedName}.jpg`;
    const path = `images/${projectId}/${filename}`;

    logger.info('uploadFile func is going well. next step is client.send request, 25 line');
    const response = await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        ACL: 'public-read',
        Key: path,
        Body: buff,
        ContentType: 'image/jpg',
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
    console.log(e);
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
