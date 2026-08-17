import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcryptjs';
import { timingSafeEqual } from 'crypto';
import { Repository } from 'typeorm';
import { CreateUserDto, LoginDto } from './user.dto';
import { User } from './user.entity';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000;

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async login({ account, password, rememberMe }: LoginDto) {
    const normalizedAccount = account.trim().toLowerCase();
    const user = await this.userRepository.findOne({
      where: [{ username: normalizedAccount }, { email: normalizedAccount }],
      select: {
        id: true,
        username: true,
        email: true,
        passwordHash: true,
        status: true,
        failedLoginCount: true,
        lockedUntil: true,
        lastLoginAt: true,
        passwordChangedAt: true,
        emailVerifiedAt: true,
      },
    });

    const now = new Date();
    if (!user) {
      throw new UnauthorizedException('账号或密码错误');
    }
    if (
      user.status !== 'active' ||
      (user.lockedUntil && user.lockedUntil > now)
    ) {
      throw new UnauthorizedException('账号或密码错误');
    }

    if (user.lockedUntil) {
      user.lockedUntil = null;
      user.failedLoginCount = 0;
    }

    const isBcryptHash = /^\$2[aby]\$/.test(user.passwordHash);
    const passwordMatches = isBcryptHash
      ? await compare(password, user.passwordHash)
      : this.matchesLegacyPassword(password, user.passwordHash);

    if (!passwordMatches) {
      user.failedLoginCount += 1;
      if (user.failedLoginCount >= MAX_LOGIN_ATTEMPTS) {
        user.lockedUntil = new Date(now.getTime() + LOCK_TIME_MS);
      }
      await this.userRepository.save(user);
      throw new UnauthorizedException('账号或密码错误');
    }

    if (!isBcryptHash) {
      user.passwordHash = await hash(password, 12);
      user.passwordChangedAt = now;
    }
    user.failedLoginCount = 0;
    user.lockedUntil = null;
    user.lastLoginAt = now;
    await this.userRepository.save(user);

    return {
      accessToken: await this.jwtService.signAsync(
        { sub: user.id, username: user.username },
        { expiresIn: rememberMe ? 604800 : 7200 },
      ),
      expiresIn: rememberMe ? 604800 : 7200,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        lastLoginAt: user.lastLoginAt,
      },
    };
  }

  private matchesLegacyPassword(password: string, storedPassword: string) {
    const supplied = Buffer.from(password);
    const stored = Buffer.from(storedPassword);
    return (
      supplied.length === stored.length && timingSafeEqual(supplied, stored)
    );
  }

  getAllUsers() {
    return this.userRepository.find();
  }

  async getUserById(id: number) {
    const user = await this.userRepository.findOneBy({ id });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return user;
  }

  async getUserLogs(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { logs: true },
    });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return user.logs;
  }

  async createUser(user: CreateUserDto) {
    const username = user.username.trim().toLowerCase();
    const email = user.email?.trim().toLowerCase() ?? null;
    const existing = await this.userRepository.findOne({
      where: email
        ? [{ username }, { email: username }, { username: email }, { email }]
        : [{ username }, { email: username }],
    });
    if (existing) {
      throw new ConflictException('用户名或邮箱已存在');
    }

    const created = await this.userRepository.save(
      this.userRepository.create({
        username,
        email,
        passwordHash: await hash(user.password, 12),
        passwordChangedAt: new Date(),
      }),
    );
    return { id: created.id, username: created.username, email: created.email };
  }

  async updateUser(id: number, user: Partial<CreateUserDto>) {
    const changes: Partial<User> = {
      username: user.username?.trim().toLowerCase(),
      email: user.email?.trim().toLowerCase(),
    };
    if (user.password) {
      changes.passwordHash = await hash(user.password, 12);
      changes.passwordChangedAt = new Date();
    }
    const existingUser = await this.userRepository.preload({ id, ...changes });

    if (!existingUser) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return this.userRepository.save(existingUser);
  }

  async deleteUser(id: number) {
    const result = await this.userRepository.delete(id);

    if (!result.affected) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return { message: 'User deleted successfully' };
  }

  findProfile(id: number) {
    return this.userRepository.find({
      where: {
        id,
      },
      relations: { profile: true },
    });
  }
}
