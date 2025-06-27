import {v2 as cloudinary} from 'cloudinary';
import { ApiError } from './apiError.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const deleteFromCloudinary = async (imageUrl) => {
    try {
        if (!imageUrl) {
            throw new ApiError(400, "imageUrl is required");
        }

        const publicIdRegex = /\/v\d+\/([^\.]+)/;
        const match = imageUrl.match(publicIdRegex);

        if (!match || !match[1]) {
            throw new ApiError(500, "could not extract public id from url:",imageUrl)
        }
        
        const publicId = match[1];

        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: "image"
        });
        
        return result;

    } catch (error) {
        throw new ApiError(500, "Error deleting image from cloudinary")
    }
};

export { deleteFromCloudinary }; 