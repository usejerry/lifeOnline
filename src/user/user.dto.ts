import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class LoginDto {
  @IsString()
  @Length(1, 254)
  account!: string;

  @IsString()
  @Length(6, 72)
  password!: string;

  @IsBoolean()
  @IsOptional()
  rememberMe = false;
}

export class CreateUserDto {
  @IsString()
  @Length(3, 50)
  username!: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @Length(6, 72)
  password!: string;
}

export class RegisterDto {
  @IsString()
  @Length(3, 50)
  username!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 72)
  password!: string;
}
