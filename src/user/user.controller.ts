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
  Req,
  Res,
} from '@nestjs/common';
import { CreateUserDto, LoginDto, RegisterDto } from './user.dto';
import { UserService } from './user.service';
import type { Request, Response } from 'express';
import { AuthCookieService } from '../auth/auth-cookie.service';
import { GrowthService } from '../growth/growth.service';

@Controller('user')
export class UserController {
  private readonly logger = new Logger(UserController.name);
  constructor(
    private readonly userService: UserService,
    private readonly cookies: AuthCookieService,
    private readonly growthService: GrowthService,
  ) {
    this.logger.log('UserController constructor');
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.cookies.assertRequest(request);
    const { refreshToken, session, ...result } = await this.userService.login(
      loginDto,
      request.get('user-agent') ?? '',
    );
    this.cookies.set(response, refreshToken, session);
    return result;
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
