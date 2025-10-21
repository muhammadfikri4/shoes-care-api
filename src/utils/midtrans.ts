import axios, { AxiosResponse } from "axios";
import {
  MidtransCreationDTO,
  MidtransResponse,
} from "../app/transactions/transactions.dto";
import { config } from "../libs";
import { MESSAGE_CODE } from "./error-code";
import { ErrorApp } from "./http-error";

export interface MidtransCustomer {
  first_name?: string;
  email?: string;
  phone?: string;
}

export const createMidtransTransaction = async (data: MidtransCreationDTO) => {
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
    return res as AxiosResponse<MidtransResponse>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error(
      "Error in create transaction:",
      error.response ? error.response.data : error?.message
    );
    return new ErrorApp(
      `Failed to process create transaction: ${error.response ? JSON.stringify(error.response.data, null, 2) : error?.message}`,
      500,
      MESSAGE_CODE.INTERNAL_SERVER_ERROR
    );
  }
};
