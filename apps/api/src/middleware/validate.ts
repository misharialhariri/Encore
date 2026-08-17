import { NextFunction, Request, Response } from "express";
import { AnyZodObject } from "zod";

type ValidationTarget = "body" | "query" | "params";

export function validate(schema: AnyZodObject, target: ValidationTarget = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.parse(req[target]);
    (req as unknown as Record<ValidationTarget, unknown>)[target] = parsed;
    next();
  };
}
