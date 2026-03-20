import { v2 as cloudinary } from 'cloudinary';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import * as dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Google Vision Config
let visionCredentials: any;
const visionSaValue = process.env.GOOGLE_VISION_CREDENTIALS;

try {
  if (visionSaValue && fs.existsSync(visionSaValue)) {
    visionCredentials = JSON.parse(fs.readFileSync(visionSaValue, 'utf8'));
  } else if (visionSaValue) {
    visionCredentials = JSON.parse(visionSaValue);
  }
} catch (e) {
  visionCredentials = {};
}

const visionClient = new ImageAnnotatorClient({
  credentials: visionCredentials,
});

export { cloudinary, visionClient };
