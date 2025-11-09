import { RackStatus } from "@prisma/client";
import { config } from "../../libs";
import { MESSAGE_CODE } from "../../utils/error-code";
import { ErrorApp } from "../../utils/http-error";
import {
  RemoveFileFromStorage,
  UploadFileToStorage,
} from "../../utils/upload-file-to-storage";
import { getPromoByCodeRepo } from "../promos/promos.repository";
import { verifyPromoService } from "../promos/promos.service";
import * as userRepository from "../users/users.repository";
import {
  CreateTransactionDTO,
  MidtransCreationDTO,
  MidtransResponse,
  MidtransTransactionDTO,
  ProductItem,
} from "./transactions.dto";
import {
  countTransactionByUserRepo,
  getRackByIdRepo,
} from "./transactions.repository";
import axios, { AxiosResponse, AxiosError } from "axios";
import { ResponseInterface } from "../../interface";
import { generateHmac } from "../../utils/crypto";

export const validateRack = async (rackId: string) => {
  const rack = await getRackByIdRepo(rackId);
  if (!rack) return new ErrorApp("Rack not found", 404, MESSAGE_CODE.NOT_FOUND);
  if (rack.status !== RackStatus.AVAILABLE)
    return new ErrorApp("Rack not available", 400, MESSAGE_CODE.BAD_REQUEST);
  return rack;
};

export const ensureCustomer = async (data: CreateTransactionDTO) => {
  if (!data.customerEmail)
    return {
      userId: undefined as string | undefined,
      snapName: undefined as string | undefined,
      snapEmail: undefined as string | undefined,
    };
  const user = await userRepository.upsertCustomerByEmail(
    data.customerEmail,
    data.customerName
  );
  const userId = user.id;
  const snapName = user.name ?? data.customerName ?? undefined;
  const snapEmail = user.email;
  return { userId, snapName, snapEmail };
};

export const computePricing = async (
  data: CreateTransactionDTO,
  userId?: string | null
) => {
  const rawItems = Array.isArray(data.items) ? data.items : [];
  if (rawItems.length > 3)
    return new ErrorApp(
      "Maksimal 3 item sepatu per transaksi",
      400,
      MESSAGE_CODE.BAD_REQUEST
    );
  const baseFromItems = rawItems.reduce((acc, it) => acc + (it.price || 0), 0);
  const count = userId ? await countTransactionByUserRepo(userId) : 0;
  const promoByCount = userId ? (count + 1) % 10 === 0 : false;
  let promoApplied = promoByCount;
  let promoIdToUse: string | undefined;
  if (data.usePromo && data.promoCode && data.customerEmail) {
    const validate = await verifyPromoService(
      data.customerEmail,
      data.promoCode
    );
    if (validate instanceof ErrorApp) return validate;
    const promo = await getPromoByCodeRepo(data.promoCode);
    promoIdToUse = promo?.id;
    promoApplied = true;
  } else if (data.usePromo) {
    return new ErrorApp(
      "Promo code dan email diperlukan",
      400,
      MESSAGE_CODE.BAD_REQUEST
    );
  }
  const finalPrice = promoApplied ? 0 : baseFromItems;
  return { basePrice: baseFromItems, finalPrice, promoApplied, promoIdToUse };
};

export const uploadItemFiles = async (
  userId: string | undefined | null,
  items: ProductItem[],
  fileNamePrefix?: string
) => {
  const uploadedKeys: string[] = [];
  const itemsData = items.map((it) => ({ ...it }));
  const safeUserId = userId ?? "guest";
  for (let i = 0; i < itemsData.length; i++) {
    const file = itemsData[i].file as Express.Multer.File | undefined;
    if (!file?.buffer) continue;
    const ext = (file.mimetype && file.mimetype.split("/")?.[1]) || "webp";
    const timestamp = Date.now();
    const prefix = fileNamePrefix ? `${fileNamePrefix}-` : "";
    const filename = `${prefix}${timestamp}-${i}.${ext}`;
    const relative = `transactions/shoes/${safeUserId}/${filename}`;
    const Key = `${config.STORAGE.BUCKET_FOLDER}/${relative}`;
    try {
      await UploadFileToStorage({
        Bucket: config.STORAGE.BUCKET,
        Key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: "public-read",
      });
      uploadedKeys.push(Key);
      itemsData[i].file = filename; // store only filename
    } catch (e) {
      // rollback uploaded
      for (const k of uploadedKeys) {
        try {
          await RemoveFileFromStorage(k);
        } catch (e) {
          console.log({ error: e });
        }
      }
      return new ErrorApp(
        "Gagal mengupload foto, transaksi dibatalkan.",
        500,
        MESSAGE_CODE.INTERNAL_SERVER_ERROR
      );
    }
  }
  return { itemsData, uploadedKeys };
};

export const generateSignatureKey = (data?: MidtransTransactionDTO) => {
  const serverKey = config.MIDTRANS.SERVER_KEY;
  const grossAmount = parseFloat(
    data?.gross_amount as unknown as string
  ).toFixed(2);
  const key = `${data?.order_id}${data?.status_code}${grossAmount}${serverKey}`;
  const generateKey = generateHmac(serverKey, key);
  return generateKey;
};

export const validateSignatureKey = async (data?: MidtransTransactionDTO) => {
  const key = generateSignatureKey(data);
  if (!key) {
    console.warn(`Invalid signature key for transaction ${data?.order_id}`);
    // return new AppError(ERROR_CODE.BAD_REQUEST.code, 'Invalid signature key')
    return false;
  }
  return true;
};
export const createMidtransTransaction = async (
  data: MidtransCreationDTO
): Promise<AxiosResponse<MidtransResponse>> => {
  try {
    const authString = Buffer.from(config.MIDTRANS.SERVER_KEY + ":").toString(
      "base64"
    );
    console.log("auth string: ", authString);
    const url = `${config.MIDTRANS.URL}/snap/v1/transactions`;
    const res = await axios.post(url, data, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Basic ${authString}`,
      },
    });
    return res;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ErrorApp(
        `Failed to process create transaction: ${error.response ? JSON.stringify(error.response.data, null, 2) : error?.message}`,
        400,
        MESSAGE_CODE.INTERNAL_SERVER_ERROR
      );
    }
    const err = error as ResponseInterface;
    throw new ErrorApp(
      `Failed to process midtrans create transaction: ${err.message}`,
      400,
      MESSAGE_CODE.INTERNAL_SERVER_ERROR
    );
  }
};
