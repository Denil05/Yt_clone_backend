import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from 'jsonwebtoken';
import { deleteFromCloudinary } from "../utils/deleteCoverImage.js";
import mongoose from "mongoose";

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
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
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
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax"
        }
        const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

        console.log(
          new ApiResponse(
            200,
            {accessToken, refreshToken},
            "Access Token updated successfully"
          )
        );
        return res.status(200)
          .cookie("accessToken", accessToken, option)
          .cookie("refreshToken", refreshToken, option)
          .json(
            new ApiResponse(
              200,
              {accessToken, refreshToken},
              "Access Token updated successfully"
            )
          );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async(req,res) => {
    const {oldPassword, newPassword} = req.body
    const user = await User.findById(req.user._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old Password")
    }
    user.password = newPassword
    user.save({validationBeforeSave: false})
    return res.status(200)
    .json(new ApiResponse(200, {}, "Password updated successfully"))
})

const getCurrentUser = asyncHandler(async(req,res) => {
    return res.status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"))
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullName, email} = req.body

    if(!fullName || !email){
        throw new ApiError(400, "All fields are Required")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName: fullName,
                email: email
            }
        },
        {new: true}
      ).select("-password")

      return res.status(200)
      .json(new ApiResponse(200, user, "Account details updated successfully"))
    })



const updateUserAvatar = asyncHandler(async(req,res) => {
    const avatarLocalPath = req.file?.path
    const oldAvatarUrl = req.user?.avatar

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(400, " Error while uploading on avatar")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },{new: true}
    ).select("-password")

    if (!oldAvatarUrl) {
        throw new ApiError(500, "Old avatar url is not found")
    }
    await deleteFromCloudinary(oldAvatarUrl);

    return res.status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"))
})

const updateUserCoverImage = asyncHandler(async(req,res) => {
    const coverImageLocalPath = req.file?.path
    const oldCoverImageUrl = req.user?.coverimage

    if(!coverImageLocalPath){
        throw new ApiError(400, "Image file is missing")
    }

    const image = await uploadOnCloudinary(coverImageLocalPath)
    if(!image.url){
        throw new ApiError(400, " Error while uploading on image")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,{
            $set: {
                coverimage : image.url
            }
        },{new: true}
    ).select("-password")

    if (!oldCoverImageUrl) {
        throw new ApiError(500, "Old image path is not found")
    }   
    await deleteFromCloudinary(oldCoverImageUrl);

    return res.status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"))
})


const getUserChannelProfile = asyncHandler(async(req,res) => {
    const {username} = req.params

    if(!username?.trim()){
        throw new ApiError(400, "Username is missing")
    }
    
    const channel = await User.aggregate([
        {
            $match:{
                username: username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscriber"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size: "$subscriber"
                },
                channelsSubscribedToCount:{
                    $size: "$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project:{
                fullName: 1,
                username: 1,
                subscribersCount:  1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])
    if(!channel?.length){
        throw new ApiError(404, "channel does not exists")
    }
    return res.status(200)
    .json(200, channel[0],"User Channel fetched Successfully")
})

const getWatchHistory = asyncHandler(async(req,res) => {
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id)  
            },
            $lookup:{
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as : "watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName: 1,
                                        username: 1,
                                        avatar:1
                                    }
                                },
                                {
                                    $addFields:{
                                        owner:{
                                            $first: "$owner"
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        }
    ])
    return res.status(200)
    .json(new ApiResponse(200,user[0].watchHistory,"Watched Histroy Fetched Succesfully"))
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getChannelVideos,
    getChannelVideoHistory,
}