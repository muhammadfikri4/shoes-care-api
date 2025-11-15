import Joi from "joi";

export const createRackSchema = Joi.object({
  code: Joi.string().min(1).max(20).required(),
  name: Joi.string().allow('').optional(),
  description: Joi.string().allow('').optional(),
});

export const updateRackSchema = Joi.object({
  code: Joi.string().min(1).max(20).optional(),
  name: Joi.string().allow('').optional(),
  description: Joi.string().allow('').optional(),
});

