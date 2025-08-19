import { applyDecorators, SetMetadata, UseGuards } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { AdminRole } from "@app/administrator/entities/administrator.entity";
import { AuthGuard } from "../guards/auth.guard";
import { UserRoles } from "@app/user/entities/user.entity";

export function Authorized(...roles: any[]) {
  return applyDecorators(
    SetMetadata("roles", roles),
    UseGuards(AuthGuard),
    ApiBearerAuth(),
  );
}
