import { MESSAGE_CODE } from "../../utils/ErrorCode";
import { ErrorApp } from "../../utils/HttpError";
import { racksRepository } from "./racks.repository";
import { CreateRackDTO, UpdateRackDTO } from "./racks.dto";

export const racksService = {
  create: async (data: CreateRackDTO) => {
    const existing = await racksRepository.list();
    if (existing.find((r) => r.code === data.code)) {
      return new ErrorApp("Rack code already exists", 400, MESSAGE_CODE.BAD_REQUEST);
    }
    return racksRepository.create(data);
  },
  list: async () => racksRepository.list(),
  update: async (id: string, data: UpdateRackDTO) => {
    const rack = await racksRepository.getById(id);
    if (!rack) return new ErrorApp("Rack not found", 404, MESSAGE_CODE.NOT_FOUND);
    if (data.code) {
      const all = await racksRepository.list();
      const dup = all.find((r) => r.code === data.code && r.id !== id);
      if (dup) return new ErrorApp("Rack code already exists", 400, MESSAGE_CODE.BAD_REQUEST);
    }
    return racksRepository.update(id, data);
  },
  remove: async (id: string) => {
    const rack = await racksRepository.getById(id);
    if (!rack) return new ErrorApp("Rack not found", 404, MESSAGE_CODE.NOT_FOUND);
    return racksRepository.remove(id);
  },
};

