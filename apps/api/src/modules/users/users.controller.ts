import { RequestHandler } from "express";
import * as usersService from "./users.service";
import { presignPhotoSchema, updateProfileSchema } from "./users.schemas";

export const getMe: RequestHandler = async (req, res) => {
  const user = await usersService.getMePublic(req.userId!);
  res.json({ user });
};

export const updateMe: RequestHandler = async (req, res) => {
  const data = updateProfileSchema.parse(req.body);
  const user = await usersService.updateMe(req.userId!, data);
  res.json({ user });
};

export const presignPhoto: RequestHandler = async (req, res) => {
  const { contentType } = presignPhotoSchema.parse(req.body);
  const result = await usersService.presignProfilePhoto(contentType);
  res.json(result);
};
