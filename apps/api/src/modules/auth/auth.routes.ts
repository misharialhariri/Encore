import { Router } from "express";
import * as authController from "./auth.controller";
import { otpRateLimiter } from "../../middleware/rateLimiter";

export const authRouter = Router();

authRouter.post("/otp/request", otpRateLimiter, authController.requestOtp);
authRouter.post("/otp/verify", otpRateLimiter, authController.verifyOtp);
authRouter.post("/refresh", authController.refresh);
authRouter.post("/social/google", authController.googleLogin);
authRouter.post("/social/apple", authController.appleLogin);
