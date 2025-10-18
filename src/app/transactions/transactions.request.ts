import Joi from "joi";

export const createTransactionSchema = Joi.object({
  rackId: Joi.string().uuid().required(),
  price: Joi.number().integer().min(0).required(),
  customerEmail: Joi.string().email().optional(),
  customerName: Joi.string().allow('').optional(),
});

export const scanSchema = Joi.object({
  qr: Joi.string().required(),
});
