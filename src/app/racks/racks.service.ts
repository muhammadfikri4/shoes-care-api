import { MESSAGE_CODE } from "../../utils/ErrorCode";
import { ErrorApp } from "../../utils/HttpError";
import { createRackRepo, getRackByIdRepo, listRacksRepo, removeRackRepo, updateRackRepo } from "./racks.repository";
import { CreateRackDTO, UpdateRackDTO } from "./racks.dto";

export const createRack = async (data: CreateRackDTO) => {
  const existing = await listRacksRepo();
  if (existing.find((r) => r.code === data.code)) {
    return new ErrorApp("Rack code already exists", 400, MESSAGE_CODE.BAD_REQUEST);
  }
  return createRackRepo(data);
};

export const listRacks = async () => listRacksRepo();

export const updateRack = async (id: string, data: UpdateRackDTO) => {
  const rack = await getRackByIdRepo(id);
  if (!rack) return new ErrorApp("Rack not found", 404, MESSAGE_CODE.NOT_FOUND);
  if (data.code) {
    const all = await listRacksRepo();
    const dup = all.find((r) => r.code === data.code && r.id !== id);
    if (dup) return new ErrorApp("Rack code already exists", 400, MESSAGE_CODE.BAD_REQUEST);
  }
  return updateRackRepo(id, data);
};

export const removeRack = async (id: string) => {
  const rack = await getRackByIdRepo(id);
  if (!rack) return new ErrorApp("Rack not found", 404, MESSAGE_CODE.NOT_FOUND);
  return removeRackRepo(id);
};
