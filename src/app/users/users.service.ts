import { MESSAGE_CODE } from "../../utils/error-code";
import { ErrorApp } from "../../utils/http-error";
import { getCustomerDTOMapper, getUserProfile } from "./users.mapper";
import * as userRepository from "./users.repository";
import { GetCustomersQueryDTO } from "./users.dto";
import { Meta } from "../../utils/Meta";

export const userService = {
  getProfile: async (id: string) => {
    const user = await userRepository.getUserById(id);
    if (!user) {
      return new ErrorApp("User not found", 404, MESSAGE_CODE.NOT_FOUND);
    }
    return getUserProfile(user);
  },
  updateProfile: async (id: string, name: string) => {
    const user = await userRepository.getUserById(id);
    if (!user) {
      return new ErrorApp("User not found", 404, MESSAGE_CODE.NOT_FOUND);
    }
    await userRepository.updateUser(id, { name });
  },
  getCustomers: async (query: GetCustomersQueryDTO) => {
    const { page = "1", perPage = "10" } = query;
    const [customers, total] = await Promise.all([
      userRepository.getCustomersRepo(query),
      userRepository.getCustomersCountRepo(query),
    ]);

    const data = customers.map(getCustomerDTOMapper);
    const meta = Meta(Number(page), Number(perPage), total);

    return { data, meta };
  },
};
