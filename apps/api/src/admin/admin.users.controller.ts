import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminUsersService } from './admin.users.service';
import type { CreateUserDto, UpdateUserDto } from './admin.users.dto';
import { createUserSchema, updateUserSchema } from './admin.users.dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN)
export class AdminUsersController {
  constructor(private readonly service: AdminUsersService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() body: CreateUserDto) {
    const parsed = createUserSchema.parse(body);
    return this.service.create(parsed);
  }

  @Patch(':userId')
  update(@Param('userId') userId: string, @Body() body: UpdateUserDto) {
    const parsed = updateUserSchema.parse(body);
    return this.service.update(userId, parsed);
  }

  @Delete(':userId')
  deactivate(@Param('userId') userId: string) {
    return this.service.deactivate(userId);
  }
}
