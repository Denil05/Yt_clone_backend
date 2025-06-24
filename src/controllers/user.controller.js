import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from 'jsonwebtoken';

const  generateAccessAndRefreshTokens = async(userId)=>{
    try{
        const user = await User.findById(userId) 
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()            

        user.refreshToken=refreshToken
        await user.save({validationBeforeSave: false})

        return {accessToken,refreshToken}
    } catch(error) {
        throw new ApiError(500, "Something went Wrong while generating and accessing tokens");
    }
}

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

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.image?.[0]?.path;
   
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
        coverimage: coverImage?.url || "",
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

const loginUser = asyncHandler(async(req,res) => {
    //1. get data from frontend using req->body
    //2. username or email and find user
    //3. check password
    //4. access and refresh token generate  
    //5 send through cookie

    //1. get data from frontend using req->body
    const {email, username , password} = req.body;

    if(!username && !email){
        throw new ApiError(400, "Please enter your username or email")
    }
    
    //2. Check for User or email

    const user = await User.findOne({
        $or : [{username},{email}]
    })
    if(!user){
        throw new ApiError(404,"User does not exist")
    }

    //3. check password

    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401, "Invalid password");
    }

    //4. access and refresh token generate
    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    //now i have to option update the object or do a database query to find this logged in user 
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    //5. send cookie

    const option = {
        httpOnly: true,
        secure: true,
    }
    return res.status(200)
      .cookie("accessToken", accessToken, option)
      .cookie("refreshToken", refreshToken, option)
      .json(
        new ApiResponse(
          200,
          {
            user: loggedInUser,
            accessToken,
            refreshToken,
          },
          "User logged in successfully"
        )
      );
})

const logoutUser = asyncHandler(async (req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },{
            new: true
        }
    )
    const option = {
        httpOnly: true,
        secure: true,
    }
    return res.status(200)
      .clearCookie("accessToken", option)
      .clearCookie("refreshToken", option)
      .json(
        new ApiResponse(
          200,
          {},
          "User logged out successfully"
        )
      );
})

const refreshAccessToken = asyncHandler(async (req,res) => {
    try {
        const incomeRefreshToken = req.body.refreshToken || req.cookies.refreshToken

        if(!incomeRefreshToken){
            throw new ApiError(401, "Unauthorized request for updating access token")
        }

        const decodedToken = jwt.verify(incomeRefreshToken,process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401, "Invalid Refresh Token")
        }
        if(incomeRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh Token is Expired or used")
        }
        const option = {
            httpOnly: true,
            secure: true,
        }
        const {newAccessToken,newRefreshToken} = await generateAccessAndRefreshTokens(user._id)

        return res.status(200)
        .cookie("accessToken", newAccessToken, option)
        .cookie("refreshToken", newRefreshToken, option)
        .json(
            new ApiResponse(
                200,
                {newAccessToken: newAccessToken, refreshToken: newRefreshToken},
                "Access Token updated successfully"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

export {registerUser,loginUser,logoutUser,refreshAccessToken}