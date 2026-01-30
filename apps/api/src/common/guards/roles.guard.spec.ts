import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RoleName } from '@prisma/client';

import { RolesGuard } from './roles.guard';
import { Roles } from '../decorators/roles.decorator';

class TestController {
  @Roles(RoleName.ADMIN)
  handler() {
    return true;
  }
}

describe('RolesGuard', () => {
  it('allows access when role matches', () => {
    const reflector = new Reflector();
    const guard = new RolesGuard(reflector);

    const context = {
      getHandler: () => TestController.prototype.handler,
      getClass: () => TestController,
      switchToHttp: () => ({
        getRequest: () => ({ user: { roles: [RoleName.ADMIN] } }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies access when role does not match', () => {
    const reflector = new Reflector();
    const guard = new RolesGuard(reflector);

    const context = {
      getHandler: () => TestController.prototype.handler,
      getClass: () => TestController,
      switchToHttp: () => ({
        getRequest: () => ({ user: { roles: [RoleName.VIEWER] } }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(false);
  });
});
