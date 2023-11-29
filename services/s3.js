const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const mime = require('mime-types');
const logger = require('./logger');
const sharp = require('sharp'); 

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

    // Compress the image using sharp
    let compressedBuff;

    if (fileExtension === 'jpeg' || fileExtension === 'jpg') {
      // For JPEG images, adjust quality
      compressedBuff = await sharp(buff)
        .jpeg({ quality: 60 }) // Adjust quality as needed
        .toBuffer();
    } else if (fileExtension === 'png') {
      // For PNG images, adjust compression level
      compressedBuff = await sharp(buff)
        .resize({ width: 600 })
        // .png({ resize, adaptiveFiltering: true, force: true }) // Adjust compression level as needed
        .toBuffer();
    } else {
      // For other formats, no specific compression
      compressedBuff = buff;
    }

    const response = await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        ACL: 'public-read',
        Key: path,
        Body: compressedBuff,
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

const uploadFiles = async (files, projectId) => {
  return await Promise.all(files.map(async (file) => {
    const { isUploaded, url } = await uploadFile(
      file.dataUrl, 
      projectId, 
      file.name
    );

    if (isUploaded) {
      return {
        url,
        name: file.name,
        width: file.width,
        height: file.height
      }
    }
  }));
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
exports.uploadFiles = uploadFiles;
exports.deleteFile = deleteFile;
