import { IRedisUserModel } from "../../../app/model/user/UserModel";

import { UserService } from "../../../app/service/user/UserService";
import { CompanyService } from "../../../app/service/company/CompanyService";
import {
  JsonController,
  Body,
  Post,
  Res,
  Get,
  CurrentUser,
  Param,
  Req,
  UseBefore,
} from "routing-controllers";
import {
  LoginRequest,
  MFALoginRequest,
  RegisterCompanyRequest,
  ResetPasswordRequest,
  ForgotPasswordRequest,
  ResendVerificationCodeRequest,
  CognitoLoginRequest,
  VerifyEmailRequest,
} from "./AuthRequest";
import { Request, Response } from "express";
import { Authorized } from "../../../app/decorator/Authorized";
// import * as passport from "passport";
// import { bearerStrategy } from "../../../app/helpers/SSOCredentialsHelper";
// passport.use(bearerStrategy);

@ApiTags()
@Controller()
export class AuthController {
  constructor(
    private userService: UserService,
    private companyService: CompanyService
   {}

  @Post("/register-company")
  async RegisterCompany(
    @Body() data: RegisterCompanyRequest,
    @Req() req: Request,
    @Res() res: Response
  ) {
    data.email = data.email.toLowerCase();
    const newUserInfo = await this.companyService.RegisterCompany(data, req);
    return newUserInfo;
  }

  @Post("/resend-verification-code")
  async ResendVerificationCode(
    @Body() data: ResendVerificationCodeRequest,
    @Res() res: Response
  ) {
    data.email = data.email.toLowerCase();
    await this.userService.SendVerificationCode(data);
    return {};
  }

  @Post("/verify-verification-code")
  async VerifyVerificationCode(
    @Body() data: VerifyEmailRequest,
    @Res() res: Response
  ) {
    const userData = await this.userService.VerifyVerificationCode(data);
    return userData;
  }

  @Post("/login")
  async Login(
    @Body() data: LoginRequest,
    @Req() req: Request,
    @Res() res: Response
  ) {
    data.email = data.email.toLowerCase();
    const userInfo = await this.userService.Login(req, data);
    return userInfo;
  }

  @Post("/mfa-login")
  async MfaLogin(
    @Body() data: MFALoginRequest,
    @Req() req: Request,
    @Res() res: Response
  ) {
    data.email = data.email.toLowerCase();
    const userInfo = await this.userService.MfaLogin(req, data);
    return userInfo;
  }

  @Authorized()
  @Get("/me")
  async Me(
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const userInfo = await this.userService.Me(user);
    return userInfo;
  }

  @Authorized()
  @Get("/logout")
  async Logout(
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    await this.userService.Logout(user);
    return null;
  }

  @Post("/forgot-password")
  async ForgotPassword(
    @Body() data: ForgotPasswordRequest,
    @Req() req: Request,
    @Res() res: Response
  ) {
    data.email = data.email.toLowerCase();
    await this.userService.ForgotPassword(req, data);
    return null;
  }

  @Post("/reset-password/:token")
  async ResetPassword(
    @Body() data: ResetPasswordRequest,
    @Param("token") token: string,
    @Res() res: Response
  ) {
    const response = await this.userService.ResetPassword(data, token);
    return response;
  }

  /*
  @Get("/azure-login")
  @UseBefore(passport.authenticate("oauth-bearer", { session: false }))
  async AzureAzureLogin(@Req() req: Request, @Res() res: Response) {
    const msal_endpoint = await this.userService.AzureLogin(req);
    return msal_endpoint;
  } */

  @Post("/cognito-login")
  async Cognito(@Body() data: CognitoLoginRequest, @Res() res: Response) {
    const user = await this.userService.CognitoLogin(data.id_token);
    return user;
  }
}
