import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateUserDto, LoginDto, RegisterDto } from './user.dto';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  private readonly logger = new Logger(UserController.name);
  constructor(private readonly userService: UserService) {
    this.logger.log('UserController constructor');
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.userService.login(loginDto);
  }

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.userService.createUser(registerDto);
  }
  /**
   * 获取所有用户信息
   * @returns 返回所有用户的数据
   */
  @Get()
  getUser() {
    return this.userService.getAllUsers();
  }

  @Get(':id')
  getUserById(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getUserById(id);
  }

  @Get(':id/logs')
  getUserLogs(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getUserLogs(id);
  }

  @Post()
  createUser(@Body() user: CreateUserDto) {
    return this.userService.createUser(user);
  }

  @Patch(':id')
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() user: Partial<CreateUserDto>,
  ) {
    return this.userService.updateUser(id, user);
  }

  @Delete(':id')
  deleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.userService.deleteUser(id);
  }

  @Get('profile/:id')
  async findProfile(@Param('id', ParseIntPipe) id: number) {
    // if (id !== 2) {
    //   throw new HttpException('id is 2', HttpStatus.NOT_FOUND);
    // }
    const profile = await this.userService.findProfile(id);
    this.logger.warn(profile);
    return profile;
  }
}
