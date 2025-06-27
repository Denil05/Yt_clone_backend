import { Router } from "express";
import { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistor} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middlewars.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js"
const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "image",
            maxCount: 1
        }
    ]),  
    registerUser
)

router.route("/login").post(loginUser)

//secure routes

router.route("/logout").post(verifyJWT, logoutUser)

router.route("/refresh-token").post(refreshAccessToken)

// Get current user
router.route("/current-user").get(verifyJWT, getCurrentUser)

// Change current password
router.route("/change-password").post(verifyJWT, changeCurrentPassword)

// Update account details (fullName, email)
router.route("/update-account").patch(verifyJWT, updateAccountDetails)

// Update user avatar
router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)

// Update user cover image
router.route("/cover-image").patch(verifyJWT, upload.single("image"), updateUserCoverImage)

router.route("/channel/:username").get(verifyJWT,getUserChannelProfile)

router.route("/histroy").get(verifyJWT, getWatchHistory)


export default router;