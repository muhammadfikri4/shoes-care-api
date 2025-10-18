import { RackStatus } from "@prisma/client";

export interface CreateRackDTO {
  code: string;
  name?: string;
  location?: string;
  status?: RackStatus;
}

export interface UpdateRackDTO {
  code?: string;
  name?: string;
  location?: string;
  status?: RackStatus;
}

