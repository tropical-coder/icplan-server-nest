import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  OnModuleInit,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { AdministratorService } from '@app/administrator/administrator.service';
import { UserService } from '@app/user';
import { SubscriptionService } from '@app/subscription';

@Injectable()
export class AuthGuard implements CanActivate, OnModuleInit {
  private adminService: AdministratorService;
  private userService: UserService;
  private subscriptionService: SubscriptionService;
  constructor(
    private moduleRef: ModuleRef,
    private reflector: Reflector,
    @Inject('APP_NAME') private appName: string,
  ) {}

  onModuleInit() {
    this.adminService = this.moduleRef.get(AdministratorService, {
      strict: false,
    });
    this.userService = this.moduleRef.get(UserService, {
      strict: false,
    });
    this.subscriptionService = this.moduleRef.get(SubscriptionService, {
      strict: false,
    });
  }
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    const req = context.switchToHttp().getRequest();

    let token = req.headers['authorization'] || req.headers['Authorization'];

    if (!token) {
      throw new UnauthorizedException('Authorization header missing');
    }

    if (token.startsWith('Bearer')) {
      token = token.split(' ')[1];
    }

    let redisUser: Record<string, any>;
    if (this.appName == 'API') {
      redisUser = await this.userService.GetUserFromToken(token);
      // const isSubscriptionValid = await this.subscriptionService.CheckSubscriptionValidity(
      //   req.path,
      //   redisUser.company_id,
      // );

      //   if (!isSubscriptionValid) {
      //     throw new BadRequestException(
      //       "Your subscription has expired."
      //     );
      //   }

    } else if (this.appName == 'ADMIN') {
      redisUser = await this.adminService.GetAdminFromToken(token);
    } else {
      throw new Error("Unknown application");
    }


    req['user'] = redisUser;

    if (!requiredRoles.length || requiredRoles.includes(redisUser.role)) {
      return true;
    }

    return false;
  }
}
