import dotenv from "dotenv";

dotenv.config();
const env = process.env;

export const config = {
  PORT: Number(env.PORT ?? 3001),
  JWT_SECRET: JSON.stringify(env.JWT_SECRET ?? ""),
  JWT_EXPIRES: env.JWT_EXPIRES,
  CODE: env.CODE,
  SUPERADMIN_EMAIL: env.SUPERADMIN_EMAIL,
  SUPERADMIN_PASSWORD: env.SUPERADMIN_PASSWORD,
  SUPERADMIN_NAME: env.SUPERADMIN_NAME ?? "Super Admin",
  SMTP_USER: env.SMTP_USER,
  ABLY_API_KEY: env.ABLY_API_KEY ?? "",
  CLIENT_URL: env.CLIENT_URL,
  EMAIL: {
    SMTP_PASSWORD: env.SMTP_PASSWORD,
    SMTP_HOST: env.SMTP_HOST,
    SMTP_PORT: env.SMTP_PORT,
    SMTP_LOGIN: env.SMTP_LOGIN,
    EMAIL_SENDER: env.EMAIL_SENDER,
    NAME_SENDER: env.NAME_SENDER || "Defend Shoes & Care",
    API_KEY: env.BREVOSEND_API_KEY,
  },
  FIREBASE: {
    CLIENT_EMAIL: env.FIREBASE_CLIENT_EMAIL ?? "",
    PRIVATE_KEY: env.FIREBASE_PRIVATE_KEY ?? "",
    PROJECT_ID: env.FIREBASE_PROJECT_ID ?? "",
  },
  MIDTRANS: {
    URL: process.env.MIDTRANS_SNAP_URL ?? "",
    SERVER_KEY: process.env.MIDTRANS_SERVER_KEY ?? "",
    CLIENT_KEY: process.env.MIDTRANS_CLIENT_KEY ?? "",
  },
  REDIS: {
    PASSWORD: env.REDIS_PASSWORD,
    HOST: env.REDIS_HOST,
    PORT: env.REDIS_PORT,
  },
  STORAGE: {
    BUCKET: env.AWS_STORAGE_BUCKET ?? "",
    ENDPOINT: env.AWS_STORAGE_ENDPOINT ?? "",
    ENDPOINT_RESPONSE: env.AWS_STORAGE_ENDPOINT
      ? `${env.AWS_STORAGE_ENDPOINT}/object/public`
      : "",
    REGION: env.AWS_STORAGE_REGION ?? "",
    ACCESS_KEY: env.AWS_STORAGE_ACCESS_KEY ?? "",
    SECRET_KEY: env.AWS_STORAGE_SECRET_KEY ?? "",
    BUCKET_FOLDER: env.AWS_STORAGE_BUCKET_FOLDER ?? "",
  },
};
