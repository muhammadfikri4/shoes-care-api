export interface CreateRackDTO {
  code: string;
  name?: string;
  description?: string;
}

export interface UpdateRackDTO {
  code?: string;
  name?: string;
  description?: string;
}

