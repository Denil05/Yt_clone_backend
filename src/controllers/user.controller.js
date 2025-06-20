import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";

const registerUser = asyncHandler(async (req,res) => {

    // 1. get data from frontend
    // 2. validate data
    // 3. check if user is alreday exist:email,username
    // 4. check images,check avater
    // 5 .upload them into cloudinary
    // 6. create user object and creat entry in db
    // 7. return object to the frontend without password and refresh token
    // 8. check for user creation 
    // 9. return response
    
    
    //1. get data from frontend
    // req may come from differnt ways like form,url,direct json object .. 
    // if the data come from form and url we use req.body
    
    const {fullName, email, username, password} = req.body
    console.log("email: ", email);

    // 2. validation of data

    if([fullName,email,username,password].some((field) => field?.trim() === "")){
        throw new ApiError(400, "All field are required")
    }
    if(!email.includes('@')){
        throw new ApiError(400, "Please write correct email address")
    }

    // 3. check if user is alreday exist:email,username

    // const existedUser = User.findOne(
    //     $or: [{ username },{ email }]
    // )

    // if(existedUser){
    //     throw new ApiError(409, "User with email or User name already exist")
    // }

    const existedUsername = await User.findOne({username});
    if(existedUsername){
        throw new ApiError(409, "User with username already exist")
    }
    const existedEmail = await User.findOne({email});
    if(existedEmail){
        throw new ApiError(409, "User with email already exist")
    }

    //4. check images and check avatar

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.image[0]?.path;
   
    // 5 .upload them into cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400, "Avatar upload failed")
    }
    
    //6. create user and save it into database
    const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverimage: coverImage.url || "",
        email,
        password,
        userName: username.toLowerCase()
    })

    // 7. return object to the frontend without password and refresh token
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    //8.check for user creation 
    if(!createdUser){
        throw new ApiError(500, "Something went wrong in registring the user")
    }       
   return res.status(201).json(
        new ApiResponse(200, createdUser ,"User registered Successfully")
   );
} )

export {registerUser}