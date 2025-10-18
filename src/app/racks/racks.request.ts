import Joi from "joi";

export const createRackSchema = Joi.object({
  code: Joi.string().alphanum().min(1).max(20).required(),
  name: Joi.string().allow('').optional(),
  location: Joi.string().allow('').optional(),
  status: Joi.string().valid('AVAILABLE','OCCUPIED','MAINTENANCE').optional(),
});

export const updateRackSchema = Joi.object({
  code: Joi.string().alphanum().min(1).max(20).optional(),
  name: Joi.string().allow('').optional(),
  location: Joi.string().allow('').optional(),
  status: Joi.string().valid('AVAILABLE','OCCUPIED','MAINTENANCE').optional(),
});

