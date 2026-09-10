import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthSessionService } from './auth-session.service';
import { AuthCookieService } from './auth-cookie.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthenticatedRequest } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly sessions: AuthSessionService,
    private readonly cookies: AuthCookieService,
  ) {}

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.cookies.assertRequest(request);
    response.setHeader('Cache-Control', 'no-store');
    try {
      const { accessToken, expiresIn, refreshToken, session } =
        await this.sessions.refresh(this.cookies.read(request));
      this.cookies.set(response, refreshToken, session);
      return { accessToken, expiresIn };
    } catch (error) {
      if (error instanceof UnauthorizedException) this.cookies.clear(response);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.cookies.assertRequest(request);
    await this.sessions.logout(this.cookies.read(request));
    this.cookies.clear(response);
    return { success: true };
  }

  @Post('logout-all')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async logoutAll(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.cookies.assertRequest(request);
    await this.sessions.revokeAll(request.user.sub);
    this.cookies.clear(response);
    return { success: true };
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  list(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.setHeader('Cache-Control', 'no-store');
    return this.sessions.list(request.user.sub, request.user.sid);
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  async revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.cookies.assertRequest(request);
    await this.sessions.revoke(request.user.sub, id);
    if (id === request.user.sid) this.cookies.clear(response);
    return { success: true };
  }
}
