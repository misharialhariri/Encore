import { RequestHandler } from "express";
import * as authService from "./auth.service";
import {
  appleLoginSchema,
  googleLoginSchema,
  refreshTokenSchema,
  requestOtpSchema,
  verifyOtpSchema,
} from "./auth.schemas";

export const requestOtp: RequestHandler = async (req, res) => {
  const { phoneNumber } = requestOtpSchema.parse(req.body);
  const result = await authService.requestOtp(phoneNumber);
  res.json(result);
};

export const verifyOtp: RequestHandler = async (req, res) => {
  const { phoneNumber, code } = verifyOtpSchema.parse(req.body);
  const result = await authService.verifyOtp(phoneNumber, code);
  res.json(result);
};

export const refresh: RequestHandler = async (req, res) => {
  const { refreshToken } = refreshTokenSchema.parse(req.body);
  const result = await authService.refreshSession(refreshToken);
  res.json(result);
};

export const googleLogin: RequestHandler = async (req, res) => {
  const { idToken } = googleLoginSchema.parse(req.body);
  const result = await authService.loginWithGoogle(idToken);
  res.json(result);
};

export const appleLogin: RequestHandler = async (req, res) => {
  const { idToken, displayName } = appleLoginSchema.parse(req.body);
  const result = await authService.loginWithApple(idToken, displayName);
  res.json(result);
};
