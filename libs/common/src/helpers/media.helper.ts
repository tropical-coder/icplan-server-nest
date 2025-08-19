import * as multer from "multer";
import * as multerS3 from "multer-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";
import { DeleteObjectCommand, GetObjectCommand, GetObjectCommandInput, S3Client } from "@aws-sdk/client-s3";
import { Request } from "express";
import { BadRequestException } from "@nestjs/common";
import { AllowedMimesTypes } from "../constants/allowed-mimes-types.constant";
import { appEnv } from "./env.helper";

const s3 = new S3Client({
  region: appEnv("AWS_REGION", "eu-west-1"),
  credentials: {
    secretAccessKey: appEnv("AWS_SECRET_ACCESS_KEY"),
    accessKeyId: appEnv("AWS_ACCESS_KEY_ID"),
  },
});

export function GetMulterObj(mimeTypes: string[] = AllowedMimesTypes) {
  return {
    storage: multerS3({
      s3: s3,
      bucket: appEnv("AWS_S3_BUCKET"),
      // acl: 'public-read',
      key: function (request, file, cb) {
        let fileName = file.originalname.replace(/[^A-Z0-9/.]/gi, "_");
        cb(null, `${Date.now().toString()}_${fileName}`);
      },
    }),
    fileFilter: (
      req: Request,
      file: Express.Multer.File,
      cb: multer.FileFilterCallback
    ) => {
      if (!mimeTypes.includes(file.mimetype)) {
        return cb(new BadRequestException(`File type should be in ${mimeTypes.join(", ")}`));
      }
      cb(null, true);
    },
    limits: {
      fieldNameSize: 255,
      fileSize: 1024 * 1024 * 2,
    }
  }
};

export function DeleteAWSFile(fileName) {
  let command = new DeleteObjectCommand({ 
    Bucket: appEnv("AWS_S3_BUCKET"), 
    Key: fileName 
  });

  return s3.send(command); 
}

export async function UploadFileToS3(stream, key) {
  return new Upload({
      client: s3,
      params: {
        Bucket: appEnv("AWS_S3_BUCKET"),
        // ACL: 'public-read',
        Body: stream,
        Key: key,
      },
    })
    .done();
}

export function GetAWSSignedUrl(key, expires = null) {
  let param: GetObjectCommandInput = {
    Bucket: appEnv("AWS_S3_BUCKET"),
    Key: key.replace(/^\/+/g, ""),
  };

  const expiresIn = expires || +appEnv("AWS_S3_SIGNED_URL_EXPIRATION");
  return getSignedUrl(s3, new GetObjectCommand(param), { expiresIn });
}

export function GetFileKey(path) {
  let key = path.substring(path.lastIndexOf("/") + 1);
  return key;
}
