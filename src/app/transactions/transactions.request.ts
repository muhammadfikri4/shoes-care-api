import Joi from "joi";

export const createTransactionSchema = Joi.object({
  price: Joi.number().integer().min(0).optional(),
  customerEmail: Joi.string().email().optional(),
  customerName: Joi.string().allow("").optional(),
  customerPhone: Joi.string().allow("").optional(),
  paymentMethod: Joi.string().valid("QRIS", "CASH", "TRANSFER").optional(),
  cashPaid: Joi.number().optional(),
  usePromo: Joi.boolean().optional(),
  promoCode: Joi.string().allow("").optional(),
  items: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        price: Joi.number().integer().min(0).required(),
        quantity: Joi.number().integer().min(1).optional(),
        estimateDay: Joi.number().integer().min(0).optional(),
        file: Joi.any().required(),
        note: Joi.any().optional(),
        rackId: Joi.string().uuid().required(),
      })
    )
    .optional(),
}).or("price", "items");

export const scanSchema = Joi.object({
  qr: Joi.string().required(),
});

export const verifyPromoSchema = Joi.object({
  email: Joi.string().email().required(),
  code: Joi.string().required(),
});

export const readyToPickupSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

export const completeSchema = Joi.object({
  id: Joi.string().uuid().required(),
});
