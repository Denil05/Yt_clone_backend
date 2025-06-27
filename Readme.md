# Backend

A Node.js backend project for user authentication, profile management, and media uploads, using Express, MongoDB, JWT, and Cloudinary.

## Features
- User registration and login
- JWT-based authentication (access & refresh tokens)
- Password change and account update
- Avatar and cover image upload (Cloudinary)
- User channel profile and watch history
- Secure cookie handling

## Tech Stack
- Node.js, Express.js
- MongoDB, Mongoose
- JWT for authentication
- Cloudinary for media storage
- Multer for file uploads

## Getting Started

### Prerequisites
- Node.js & npm
- MongoDB database
- Cloudinary account

### Installation
```bash
npm install
```

### Environment Variables
Create a `.env` file in the root with the following variables:
```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
CORS_ORIGIN=http://localhost:3000
ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=7d
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
NODE_ENV=development
```

## Scripts
- `npm run dev` — Start the server with nodemon

## API Endpoints

All endpoints are prefixed with `/api/v1/users`

### Public
- `POST /register` — Register a new user (multipart/form-data: avatar, image, fullName, email, username, password)
- `POST /login` — Login with email or username and password

### Protected (require Bearer token)
- `POST /logout` — Logout user
- `POST /refresh-token` — Refresh access token
- `GET /current-user` — Get current user info
- `POST /change-password` — Change current password (`{ oldPassword, newPassword }`)
- `PATCH /update-account` — Update fullName and email
- `PATCH /avatar` — Update avatar (multipart/form-data: avatar)
- `PATCH /cover-image` — Update cover image (multipart/form-data: image)
- `GET /channel/:username` — Get user channel profile
- `GET /histroy` — Get watch history

## Models

### User
- userName, email, fullName, avatar, coverimage, watchHistory, password, refreshToken

### Subscription
- subscriber (User), channel (User)

### Video
- vedioFile, thumbnail, owner, title, description, duration, views, isPublished

## Usage Example: Change Password (Postman)
- **Endpoint:** `POST /api/v1/users/change-password`
- **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Body:**
```json
{
  "oldPassword": "yourOldPassword",
  "newPassword": "yourNewPassword"
}
```

## License
ISC
