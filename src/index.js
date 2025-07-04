import dotenv from "dotenv";
import connectDB from "./db/index.js";
import {app} from "./app.js";
dotenv.config();

connectDB()
.then(() => {
    app.listen(process.env.PORT || 3000, () => {
        console.log(`Server is listen at port: ${process.env.PORT || 3000}`);
    })
})
.catch((err) => {
    console.log("Mongo db connection failed", err);
})
/* This first method to connect database*/
// import express from "express";

// const app = express();

// (async()=>{
//     try{
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//         app.on("error",(error)=>{
//             console.log("ERROR: ",error);
//             throw error
//         });

//         app.listen(process.env.PORT, ()=>{
//             console.log(`App is listing on port ${process.env.PORT}`);
//         })
//     } catch(error) {
//         console.error("ERROR: ",error);
//         throw error;
//     }
// })() 