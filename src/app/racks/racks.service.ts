import { Query } from "../../interface/Query";
import { MESSAGE_CODE } from "../../utils/error-code";
import { ErrorApp } from "../../utils/http-error";
import { Meta } from "../../utils/Meta";
import { CreateRackDTO, UpdateRackDTO } from "./racks.dto";
import {
  createRackRepo,
  getRackByCode,
  getRackByIdRepo,
  getRacks,
  getRacksCount,
  removeRackRepo,
  updateRackRepo,
} from "./racks.repository";

export const createRack = async (data: CreateRackDTO) => {
  const existing = await getRackByCode(data.code);
  if (existing) {
    return new ErrorApp(
      `Rak dengan kode ${data.code} sudah ada`,
      400,
      MESSAGE_CODE.BAD_REQUEST
    );
  }
  return createRackRepo(data);
};

export const listRacks = async (query: Query) => {
  const { page = "1", perPage = "10" } = query;
  const racks = await Promise.all([getRacks(query), getRacksCount(query)]);
  const meta = Meta(Number(page), Number(perPage), racks[1]);
  return { data: racks, meta };
};

export const updateRack = async (id: string, data: UpdateRackDTO) => {
  const rack = await getRackByIdRepo(id);
  if (!rack) return new ErrorApp("Rack not found", 404, MESSAGE_CODE.NOT_FOUND);
  if (data.code && rack.id !== id) {
    return new ErrorApp(
      "Rack code already exists",
      400,
      MESSAGE_CODE.BAD_REQUEST
    );
  }
  return updateRackRepo(id, data);
};

export const removeRack = async (id: string) => {
  const rack = await getRackByIdRepo(id);
  if (!rack)
    return new ErrorApp("Rak tidak ditemukan", 404, MESSAGE_CODE.NOT_FOUND);
  if (rack.TransactionItem.length) {
    return new ErrorApp(
      "Rak sudah digunakan dan tidak dapat dihapus",
      400,
      MESSAGE_CODE.BAD_REQUEST
    );
  }
  return removeRackRepo(id);
};
