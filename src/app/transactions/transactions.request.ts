import Joi from "joi";

export const createTransactionSchema = Joi.object({
  rackId: Joi.string().uuid().required(),
  price: Joi.number().integer().min(0).optional(),
  customerEmail: Joi.string().email().optional(),
  customerName: Joi.string().allow('').optional(),
  customerPhone: Joi.string().allow('').optional(),
  paymentMethod: Joi.string().valid('QRIS','CASH','TRANSFER').optional(),
  usePromo: Joi.boolean().optional(),
  promoCode: Joi.string().allow('').optional(),
  items: Joi.array().items(Joi.object({
    shoeName: Joi.string().required(),
    price: Joi.number().integer().min(0).required(),
    qty: Joi.number().integer().min(1).optional(),
    days: Joi.number().integer().min(0).optional(),
    photoUrl: Joi.string().uri().optional(),
    note: Joi.string().allow('').optional(),
  })).optional(),
}).or('price','items');

export const scanSchema = Joi.object({
  qr: Joi.string().required(),
});

export const verifyPromoSchema = Joi.object({
  email: Joi.string().email().required(),
  code: Joi.string().required(),
});
