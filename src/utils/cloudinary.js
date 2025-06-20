import {v2 as cloudinary} from "cloudinary"
import fs from "fs";


cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key:process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET  // Click 'View API Keys' above to copy your API secret
});

const uploadOnCloudinary = async(localFilePath) => {
    try{
        if(!localFilePath) {
            throw new Error("No file path provided");
        }
        const response = await cloudinary.uploader.upload(localFilePath,{resource_type: "auto"})
        //console.log("file uploaded successfully on cloudinary", response.url);
        // await fs.promises.unlink(localFilePath);
        fs.unlinkSync(localFilePath);
        return response;
    } catch(error) {
        // await fs.promises.unlink(localFilePath);
        fs.unlinkSync(localFilePath);
        console.error("Error in file Uploadding:",error.message);
    }
 
}

export { uploadOnCloudinary }