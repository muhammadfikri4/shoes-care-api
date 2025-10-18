import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const uploadBuffer = async (buffer: Buffer, filename?: string) =>
  new Promise<{ url: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: 'transactions', public_id: filename?.split('.')[0] }, (err, result) => {
      if (err || !result) return reject(err);
      resolve({ url: result.secure_url });
    });
    stream.end(buffer);
  });

export { cloudinary };

