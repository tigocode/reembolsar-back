import { v2 as cloudinary } from 'cloudinary';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import * as dotenv from 'dotenv';
dotenv.config();
// Cloudinary Config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
// Google Vision Config
const visionClient = new ImageAnnotatorClient({
    credentials: JSON.parse(process.env.GOOGLE_VISION_CREDENTIALS || '{}'),
});
export { cloudinary, visionClient };
