import { MESSAGE_CODE } from "../../utils/error-code";
import { ErrorApp } from "../../utils/http-error";
import { getUserProfile } from "./users.mapper";
import * as userRepository from "./users.repository";


export const userService = {
  getProfile: async(id: string) => {
    const user = await userRepository.getUserById(id)
    if (!user) {
      return new ErrorApp("User not found", 404, MESSAGE_CODE.NOT_FOUND);
    }
    return getUserProfile(user);
  },
  updateProfile: async(id: string, name: string) =>
  {
    const user = await userRepository.getUserById(id)
    if (!user) {
      return new ErrorApp("User not found", 404, MESSAGE_CODE.NOT_FOUND);
    }
    await userRepository.updateUser(id, { name })
  },
};