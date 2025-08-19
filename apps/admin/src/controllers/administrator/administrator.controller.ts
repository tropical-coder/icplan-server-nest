import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { AdministratorService } from '@app/administrator/administrator.service';
import { AdminRole, type IRedisAdminModel } from '@app/administrator/entities/administrator.entity';
import { ValidatePhoneNumberRequest, LoginAdminRequest, GetAdminRequest, AddAdminRequest, UpdateAdminRequest } from '@app/administrator/dtos/administrator.dto';
import { ApiTags } from '@nestjs/swagger';
import { Authorized } from '@app/common/decorators/authorized.decorator';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';

@ApiTags("Admin")
@Controller()
export class AdministratorController {
  constructor(private adminService: AdministratorService) {}
  
  @Post("/validate-phone")
  async ValidatePhoneNumber(
    @Body() data: ValidatePhoneNumberRequest,
  )  {
    const admin = await this.adminService.ValidatePhoneNumber(data);
    return admin;
  }

  @Post("/login")
  async LogIn(
    @Body() data: LoginAdminRequest,
  ) {
    const admin = await this.adminService.LoginAdmin(data);
    return admin;
  }

  @Authorized()
  @Get("/logout")
  async Logout(
    @CurrentUser() admin: IRedisAdminModel,
  ) {
    await this.adminService.LogOutAdmin(admin);
    return null;
  }

  @Authorized(AdminRole.SuperAdmin)
  @Get("/admin")
  async GetAdmins(
    @Query() filters: GetAdminRequest,
  ) {
    const adminUsers = await this.adminService.GetAdmins(filters);
    return adminUsers;
  }

  @Get("/admin/:adminId")
  async GetAdminById(
    @Param("adminId") adminId: number,
  ) {
    const admin = await this.adminService.GetAdminById(adminId);
    return admin;
  }

  @Authorized(AdminRole.SuperAdmin)
  @Post("/admin")
  async AddAdmin(
    @Body() data: AddAdminRequest,
  ) {
    const admin = await this.adminService.AddAdmin(data);
    return admin;
  }

  @Authorized(AdminRole.SuperAdmin)
  @Put("/admin/:adminId/update")
  async UpdateAdminById(
    @Param("adminId") adminId: number,
    @Body() data: UpdateAdminRequest,
  ) {
    const admin = await this.adminService.UpdateAdmin(adminId, data);
    return admin;
  }

  @Authorized(AdminRole.SuperAdmin)
  @Delete("/admin/:adminId")
  async DeleteAdminById(
    @Param("adminId") adminId: number,
  ) {
    await this.adminService.DeleteAdminById(adminId);
    return {};
  }
}
