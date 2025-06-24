import { Router } from "express";
import { registerUser, loginUser, logoutUser } from "../controllers/user.controller.js";
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

export default router;