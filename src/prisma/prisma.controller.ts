import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Put,
  Delete,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { UsersService } from './services/user.service';
import { User as UserModel } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { EmailService } from './services/email.service';

@Controller()
export class AppController {
  constructor(
    private readonly userService: UsersService,
    private readonly emailService: EmailService,
  ) {}

  @Post('user')
  async signupUser(
    @Body()
    userData: {
      firstName?: string;
      lastName?: string;
      email: string;
      password: string;
    },
  ): Promise<Omit<UserModel, 'password'>> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const user = await this.userService.createUser({
      email: userData.email,
      password: hashedPassword,
      profile: {
        create: {
          firstName: userData.firstName,
          lastName: userData.lastName,
        },
      },
    });

    const { password, ...result } = user;
    return result;
  }
}
