import { Controller, Get } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}
  /**
   * 获取所有用户信息
   * @returns 返回所有用户的数据
   */
  @Get()
  getUser() {
    return this.userService.getAllUsers();
  }
}
