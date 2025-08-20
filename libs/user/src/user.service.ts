import { Request } from "express";
import * as RequestIp from "request-ip";
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");

import {
  UserModel,
  IRedisUserModel,
  UserRoles,
} from "../../model/user/UserModel";
import { Hashpassword, Comparepassword, DeepClone, SnakeCaseToNormal, CheckSubDomain, GetVerificationCode, CheckDisposableEmail } from "../../helpers/UtilHelper";
import { sign, decode, verify } from "jsonwebtoken";
import * as crypto from "crypto";
import { CompanyUserLicenseModel } from "../../model/company/CompanyUserLicenseModel";
import SendyHelper from "../../helpers/SendyHelper";
import { UserPermission } from "../../model/user/business_area_permission/UserBusinessAreaPermissionModel";
import {
  GetAllUsersRequest,
  RevokeMfa,
} from "../../../admin/controller/user/UserRequest";
import { MfaSecretRepository } from "../../repository/mfa_secret/MfaSecretRepository";
import { MfaSecretModel } from "../../model/mfa_secret/MfaSecretModel";
import * as Sentry from "@sentry/node";
import { UserSettingRepository } from "../../repository/user/UserSettingRepository";
import { UserSettingModel } from "../../model/user/UserSettingModel";
import { CompanyRepository } from "../../repository/company/CompanyRepository";
import { ColorRepository } from "../../repository/color/ColorRepository";
import { NotificationService } from "../notification/NotificationService";
import { NotificationConstants } from "../../constant/NotificationConstants";
import { KeyMessagesRepository } from "../../repository/company/KeyMessagesRepository";
import { BadRequestException, Injectable, NotAcceptableException, UnauthorizedException } from "@nestjs/common";
import { RedisService } from "@app/common/services/redis.service";

@Injectable()
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private redisService: RedisService,
    private userBusinessAreaPermissionRepository: UserBusinessAreaPermissionRepository,
    private companyUserLicenseRepository: CompanyUserLicenseRepository,
    private planPermissionRepository: PlanPermissionRepository,
    private CommunicationPermissionRepository: CommunicationPermissionRepository,
    private locationService: LocationService,
    private businessAreaService: BusinessAreaService,
    private subscriptionService: SubscriptionService,
    private mailService: MailService,
    private mfaSecretRepository: MfaSecretRepository,
    private userSettingRepository: UserSettingRepository,
    private companyRepository: CompanyRepository,
    private savedFilterService: SavedFilterService,
    private colorRepository: ColorRepository,
    private notificationService: NotificationService,
    private keyMessagesRepository: KeyMessagesRepository,
  ) { }

  private async setSession(
    token: string,
    userId: number,
    company_id: number,
    role: UserRoles,
  ): Promise<boolean> {
    await this.redisService.Set(
      token,
      JSON.stringify({ Id: userId, company_id: company_id, role }),
      +appEnv("SESSION_TIMEOUT", 43200)
    );

    let tokens = JSON.parse(await this.redisService.Get(`user-${userId}`));

    if (!tokens) {
      tokens = [];
    }
    let maxLength = appEnv("MAX_LOGIN_TOKENS", 5);
    if (tokens.length >= maxLength) {
      await this.deleteExceedingTokens(tokens, maxLength);
    }

    tokens.push(token);

    await this.redisService.Set(
      `user-${userId}`,
      JSON.stringify(tokens),
      +appEnv("SESSION_TIMEOUT", 43200)
    );
    return true;
  }

  private async deleteExceedingTokens(tokens, maxLength) {
    let deleteToken = tokens[0];
    await this.redisService.Delete(deleteToken);
    tokens.splice(0, 1);

    if (tokens.length >= maxLength) {
      await this.deleteExceedingTokens(tokens, maxLength);
    }
  }

  private generateToken(userId: number, company_id: number): string {
    return sign({ Id: userId, company_id: company_id }, process.env.SECRET);
  }

  private async createUser(data, companyId: number): Promise<UserModel> {
    const keyMessages = await this.keyMessagesRepository.FindOne({
      company_id: companyId,
    });
    let userModel = new UserModel();
    userModel.email = data.email;
    userModel.full_name = data.full_name;
    userModel.company_id = companyId;
    userModel.password = data.password ? await Hashpassword(data.password) : "";
    userModel.role = data.role || UserRoles.User;
    userModel.last_login = null;
    userModel.user_setting = new UserSettingModel();
    userModel.key_messages_read = !keyMessages;

    const newUser = await this.userRepository.Create(userModel);
    await this.savedFilterService.GenerateDefaultFilters(newUser);

    delete newUser["password"];
    return newUser;
  }

  private async DeleteUserTokens(tokenList: any[]): Promise<void> {
    for (let i = 0, l = tokenList.length; i < l; i++) {
      await this.redisService.Delete(tokenList[i]);
    }
    return null;
  }

  private verifyFPToken(token: any, user) {
    let decode: boolean;

    try {
      decode = !!verify(
        token,
        user.password ? user.password : appEnv("SECRET")
      );
    } catch (err) {
      decode = false;
    }

    return decode;
  }

  private hash(pass, salt) {
    if (typeof salt == "undefined" || !salt || salt == "") {
      salt = crypto.randomBytes(128).toString("base64");
    }

    let h = crypto.createHash("sha512");
    h.update(pass);
    h.update(salt);

    let return_data = {
      hash: h.digest("base64"),
      salt: salt,
    };
    return return_data;
  }

  private async UpdateUserPlanPermission(user: UserModel) {
    // Delete existing permissions
    await this.planPermissionRepository.Delete({ user_id: user.Id }, false);

    // Add User Plan permission by Business area with user selected BA's
    await this.planPermissionRepository.AddUserPlanPermission(
      user,
      UserPermission.Read
    );
    await this.planPermissionRepository.AddUserPlanPermission(
      user,
      UserPermission.Edit
    );
  }

  private async UpdateUserCommunicationPermission(user: UserModel) {
    // Delete existing permissions
    await this.CommunicationPermissionRepository.Delete(
      { user_id: user.Id },
      false
    );

    // Add User Plan permission by Business area with user selected BA's
    await this.CommunicationPermissionRepository.AddUserCommunicationPermission(
      user,
      UserPermission.Read
    );
    await this.CommunicationPermissionRepository.AddUserCommunicationPermission(
      user,
      UserPermission.Edit
    );
  }

  private async UpdateUserSetting(
    setting: UserSettingModel,
    data,
    user: IRedisUserModel,
  ) {
    if (!setting) {
      setting = new UserSettingModel();
      setting.user_id = user.Id;
    }

    if (data.receive_email_notification != null) {
      setting.receive_email_notification = data.receive_email_notification;
    }

    if (data.assignment_notification != null) {
      setting.assignment_notification = data.assignment_notification;
    }

    if (data.status_change_notification != null) {
      setting.status_change_notification = data.status_change_notification;
    }

    if (data.start_date_notification != null) {
      setting.start_date_notification = data.start_date_notification;
    }

    if (data.default_tab != null) {
      setting.default_tab = data.default_tab;
    }

    if (data.default_color_id != null) {
      const colorModel = await this.colorRepository.FindOne({
        Id: data.default_color_id,
        company_id: user.company_id,
      });

      if (!colorModel) {
        throw new BadRequestException("Color not found.");
      }
      setting.default_color_id = data.default_color_id;
    }

    if (data.default_sort?.column) {
      setting.default_sort["column"] = data.default_sort.column;
    }

    if (data.default_sort?.direction) {
      setting.default_sort["direction"] = data.default_sort.direction;
    }

    if (data.show_phases != null) {
      setting.show_phases = data.show_phases;
    }

    if (data.advanced_analytics_layout) {
      setting.advanced_analytics_layout = data.advanced_analytics_layout;
    }

    await this.userSettingRepository.Save(setting);

    return setting;
  }

  private async SendNewIpAlert(user: UserModel, req: Request, ip: string) {
    const replacements = {
      Email: user.email,
      Time: new Date().toString(),
      IpAddress: ip,
      LoginLink: `https://${req.get("host")}`,
    };

    const mailOptions = {
      to: user.email,
      subject: "Login Alert",
      from: "no-reply@icplan.com",
    };

    const subdomain = CheckSubDomain(req);

    await this.mailService.SendMail(
      "login-alert.html",
      replacements,
      mailOptions,
      subdomain
    );

    return null;
  }

  public async SendRoleChangedNotification(
    user: UserModel,
    newRole: UserRoles
  ) {
    if (!user.company.notification_enabled) {
      return false;
    }

    const constant = DeepClone(NotificationConstants.UserRoleChanged);
    constant.body = constant.body
      .replace("{{old}}", SnakeCaseToNormal(user.role))
      .replace("{{new}}", SnakeCaseToNormal(newRole));

    await this.notificationService.SendNotification(constant, [user]);

    return true;
  }

  public createFPToken(user) {
    return sign(
      { Id: user.Id },
      user.password ? user.password : appEnv("SECRET"),
      { expiresIn: "72h" }
    );
  }

  public async GetSocketInfo(socketId: string): Promise<IRedisUserModel> {
    let userInfo = await this.redisService.Get(`SOCKET-ID-${socketId}`);

    return JSON.parse(userInfo);
  }

  public async SetSocketInfo(socketId: string, user: IRedisUserModel) {
    await this.redisService.Set(
      `SOCKET-ID-${socketId}`,
      JSON.stringify({
        Id: user.Id,
        role: user.role,
        company_id: user.company_id,
      })
    );

    // save socket against user id and device id
    await this.redisService.Set(`SOCKET-${user.Id}`, socketId);
  }

  public async DeleteSocketInfo(socketId: string) {
    const userInfo = await this.GetSocketInfo(socketId);
    await this.redisService.Delete(`SOCKET-ID-${socketId}`);

    await this.redisService.Delete(`SOCKET-${userInfo?.Id}`);
  }

  public async fetchTeam(
    teamIds: Array<number>,
    companyId: number,
    select?: Array<string>
  ) {
    let teamPromise: Promise<UserModel[]> = new Promise((resolve) => {
      resolve([]);
    });

    if (teamIds.length > 0) {
      teamPromise = this.userRepository.Find(
        {
          Id: In(teamIds),
          company_id: companyId,
          is_deleted: 0,
        },
        null,
        select
      );
    }

    return teamPromise;
  }

  public async AddUser(
    req,
    data: AddUserRequest | Partial<AddUserRequest>,
    user
  ): Promise<UserModel> {
    const userModelPromise = this.userRepository.FindOne({
      email: data.email,
      is_deleted: 0,
    });
    const companyUserLicensePromise = this.companyUserLicenseRepository.FindOne(
      {
        company_id: user.company_id,
      }
    );

    const readOnlyUsersPromise = this.userRepository.Count({
      company_id: user.company_id,
      role: UserRoles.ReadonlyUser,
      is_deleted: 0,
    });

    const userCountPromise = this.userRepository.Count({
      company_id: user.company_id,
      is_deleted: 0,
    });

    const subscriptionPromise =
      this.subscriptionService.GetSubscriptionByCompanyId(user.company_id);

    const keyMessagesPromise = this.keyMessagesRepository.FindOne({
      company_id: user.company_id,
      date: IsNull(),
    });

    const emailCheckPromise = user.Id ? CheckDisposableEmail(data.email, req) : null;

    let [
      userModel,
      companyUserLicense,
      readOnlyUsersCount,
      userCount,
      keyMessages,
      subscriptionModel,
    ] = await Promise.all([
      userModelPromise,
      companyUserLicensePromise,
      readOnlyUsersPromise,
      userCountPromise,
      keyMessagesPromise,
      subscriptionPromise,
      emailCheckPromise
    ]);

    /* Check if user already exists in app */
    if (userModel) {
      throw new ConflictError("Email is already registered.");
    }

    const { readonly_user_limit, normal_user_limit } =
      subscriptionModel.features;
    if (data.role == UserRoles.ReadonlyUser) {
      if (readonly_user_limit && readonly_user_limit <= readOnlyUsersCount) {
        throw new HttpError(
          ResponseCode.BAD_REQUEST,
          "You have reached maximum users limit. Contact support to increase limit."
        );
      }
    } else {
      if (normal_user_limit < userCount - readOnlyUsersCount) {
        throw new HttpError(
          ResponseCode.BAD_REQUEST,
          "The company seats are full. Buy more seats to add more users."
        );
      }
    }

    const primaryBAs = data.business_areas.filter((bap) => bap.is_primary);
    if (primaryBAs.length > 1) {
      throw new BadRequestException(
        "Only one business area can be primary at a time."
      );
    }

    let businessAreaIds = data.business_areas.map(
      (bap) => bap.business_area_id
    );

    let locationPromise = this.locationService.fetchLocations(
      data.locations,
      user.company_id
    );
    let businessAreaPromise = this.businessAreaService.fetchBusinessAreas(
      businessAreaIds,
      user.company_id
    );

    let [locations, businessAreas] = await Promise.all([
      locationPromise,
      businessAreaPromise,
    ]);

    let newUser = new UserModel();
    newUser.company_id = user.company_id;
    newUser.full_name = data.full_name;
    newUser.email = data.email.toLowerCase();
    newUser.role = data.role;
    newUser.locations = locations;
    newUser.activated = false;
    newUser.user_setting = new UserSettingModel();
    newUser.key_messages_read = !keyMessages;

    await this.userRepository.Save(newUser);
    await this.savedFilterService.GenerateDefaultFilters(newUser);

    let businessAreaPermissions = [];
    for (let index = 0, len = businessAreas.length; index < len; index++) {
      let businessAreaPresent = data.business_areas.find((bap) => {
        return bap.business_area_id == businessAreas[index].Id;
      });

      if (businessAreaPresent) {
        businessAreaPermissions.push({
          user_id: newUser.Id,
          business_area_id: businessAreas[index].Id,
          permission: businessAreaPresent.permission,
          is_primary: businessAreaPresent.is_primary,
        });
      }
    }

    await this.userBusinessAreaPermissionRepository.CreateAll(
      businessAreaPermissions
    );

    if (
      !companyUserLicense.settings.emails.includes(
        data.email.substring(data.email.lastIndexOf("@"))
      )
    ) {
      let subDomain = data.email.substring(data.email.lastIndexOf("@"));
      companyUserLicense.settings.emails.push(subDomain);
      await this.companyUserLicenseRepository.Update(
        { Id: companyUserLicense.Id },
        { settings: companyUserLicense.settings }
      );
    }

    newUser = await this.userRepository.FindById(newUser.Id, {
      relations: ["locations", "business_area_permission", "company"],
    });

    const token = this.createFPToken(newUser);

    let host = req.get("host");

    if (!user.Id) {
      const subdomain =
        companyUserLicense.settings.subdomains.find((elem) =>
          !["app", "admin"].includes(elem)
        ) || "app";
      host = `${subdomain}.icplan.com`;
    }

    const replacements = {
      FullName: newUser.full_name,
      SetPasswordLink: `https://${host}/#/auth/set-password/${token}`,
      CompanyName: newUser.company.name,
      Host: host,
    };

    const subdomain = CheckSubDomain(req);

    const mailOptions = {
      to: data.email,
      subject: "Welcome to ICPlan",
      from: "no-reply@icplan.com",
      bcc: appEnv("SMTP_BCC"),
    };
    this.mailService.SendMail(
      "welcome.html",
      replacements,
      mailOptions,
      subdomain
    );

    await Promise.all([
      this.UpdateUserPlanPermission(newUser),
      this.UpdateUserCommunicationPermission(newUser),
    ]);

    return newUser;
  }

  public async SetPassword(
    req: Request,
    data: SetPasswordRequest,
    token
  ): Promise<{ user: UserModel; token: string; first_time_login: Boolean }> {
    let decoded;

    if (!data.t_and_c_accepted) {
      throw new BadRequestException("You must accept terms and condition.");
    }

    try {
      decoded = decode(token);
      if (!decoded) {
        throw new HttpError(
          ResponseCode.BAD_REQUEST,
          "Setting password link is invalid or has expired."
        );
      }
    } catch (e) {
      throw new BadRequestException("Setting password link is invalid or has expired.");
    }

    const user = await this.userRepository.FindById(decoded.Id, {
      select: [
        "Id",
        "email",
        "password",
        "salt",
        "full_name",
        "company_id",
        "activated",
        "role",
        "last_login",
        "image_url",
        "t_and_c_accepted",
        "signup_date",
        "filters",
        "tooltip",
        "user_ip",
        "created_at",
        "mfa_secret_id",
      ],
      relations: ["company", "company.subscription"],
    });

    if (!this.verifyFPToken(token, user)) {
      throw new BadRequestException("Setting password link is invalid or has expired.");
    }

    let first_time_login = false;
    if (!user.last_login) {
      first_time_login = true;
    }

    user.password = await Hashpassword(data.password);
    user.activated = true;
    user.t_and_c_accepted = data.t_and_c_accepted;
    user.last_login = new Date().getTime();
    user.signup_date = new Date().getTime();
    user.user_ip = RequestIp.getClientIp(req);

    const imageUrl = user.image_url;
    delete user.image_url;
    await this.userRepository.Save(user);

    user.image_url = imageUrl;
    delete user["password"];

    SendyHelper.SubscribeUserToSendyList({
      ...data,
      full_name: user.full_name,
      email: user.email,
    });

    const loginToken = this.generateToken(user.Id, user.company_id);
    await this.setSession(loginToken, user.Id, user.company_id, user.role);

    return {
      user: user,
      token: loginToken,
      first_time_login: first_time_login,
    };
  }

  public async SignUp(
    data: AddUserRequest | Partial<AddUserRequest> | RegisterCompanyRequest,
    companyId: number
  ): Promise<UserModel> {
    let userModel: UserModel = await this.userRepository.FindOne({
      email: data.email,
      is_deleted: 0,
    });

    /* Check if user already exists in app */
    if (userModel) {
      throw new ConflictError("Email is already registered.");
    }

    let user = await this.createUser(data as AddUserRequest, companyId);

    return user;
  }

  public async UpdateUser(
    userId: number,
    data: UpdateUserRequest,
    user: IRedisUserModel | any,
    isAdmin = false
  ) {
    if (
      ![UserRoles.Owner, UserRoles.Admin].includes(user.role) &&
      user.Id != userId &&
      !isAdmin
    ) {
      throw new BadRequestException("This user is not authorized to update this information.");
    }

    let userModel: UserModel = await this.userRepository.FindOne(
      {
        Id: userId,
        company_id: user.company_id,
        is_deleted: 0,
      },
      {
        select: [
          "Id",
          "email",
          "password",
          "salt",
          "full_name",
          "company_id",
          "is_deleted",
          "activated",
          "role",
          "last_login",
          "t_and_c_accepted",
          "signup_date",
          "filters",
          "tooltip",
          "user_ip",
          "created_at",
          "mfa_secret_id",
          "image_url",
        ],
        relations: ["company"],
      }
    );

    // Remove signed part of image_url
    if (userModel.image_url) {
      userModel.image_url = userModel.image_url.split("?")[0];
    }

    if (!userModel) {
      throw new BadRequestException("Not Found");
    }

    const primaryBAs = data.business_areas.filter((bap) => bap.is_primary);
    if (primaryBAs.length > 1) {
      throw new BadRequestException(
        "Only one business area can be primary at a time."
      );
    }

    let businessAreaIds = data.business_areas.map(
      (bap) => bap.business_area_id
    );

    let locationPromise = this.locationService.fetchLocations(
      data.locations,
      user.company_id
    );
    let businessAreaPromise = this.businessAreaService.fetchBusinessAreas(
      businessAreaIds,
      user.company_id
    );

    let [locations, businessAreas] = await Promise.all([
      locationPromise,
      businessAreaPromise,
    ]);

    let roleChangedNotificationPromise;
    if (data.role && userModel.role != data.role) {
      roleChangedNotificationPromise = this.SendRoleChangedNotification(
        userModel,
        data.role
      );
    }

    userModel.company_id = user.company_id;
    userModel.full_name = data.full_name;
    userModel.email = data.email;
    userModel.role = data.role;
    userModel.locations = [];

    await Promise.all([
      this.userRepository.Save(userModel),
      this.userBusinessAreaPermissionRepository.Delete(
        { user_id: userId },
        false
      ),
    ]);

    let businessAreaPermissions = [];
    for (let index = 0, len = businessAreas.length; index < len; index++) {
      let businessAreaPresent = data.business_areas.find((bap) => {
        return bap.business_area_id == businessAreas[index].Id;
      });

      if (businessAreaPresent) {
        businessAreaPermissions.push({
          user_id: userId,
          business_area_id: businessAreas[index].Id,
          permission:
            data.role == UserRoles.ReadonlyUser
              ? UserPermission.Read
              : businessAreaPresent.permission,
          is_primary: businessAreaPresent.is_primary,
        });
      }
    }

    userModel.locations = locations;
    await Promise.all([
      this.userRepository.Save(userModel),
      this.userBusinessAreaPermissionRepository.CreateAll(
        businessAreaPermissions
      ),
    ]);

    let updatedUser = await this.userRepository.FindById(userModel.Id, {
      relations: ["locations", "business_area_permission"],
    });

    await Promise.all([
      this.UpdateUserPlanPermission(updatedUser),
      this.UpdateUserCommunicationPermission(updatedUser),
      roleChangedNotificationPromise,
    ]);

    delete updatedUser["salt"];
    delete updatedUser["password"];

    return updatedUser;
  }

  public async UpdateLoggedInUser(
    data: UpdateLoggedInUserRequest,
    user: IRedisUserModel
  ) {
    let userModel: UserModel = await this.userRepository.FindOne(
      {
        Id: user.Id,
        company_id: user.company_id,
        is_deleted: 0,
      },
      {
        select: [
          "Id",
          "email",
          "password",
          "salt",
          "full_name",
          "company_id",
          "is_deleted",
          "activated",
          "role",
          "last_login",
          "t_and_c_accepted",
          "signup_date",
          "filters",
          "tooltip",
          "user_ip",
          "created_at",
        ],
        relations: ["user_setting"],
      }
    );

    if (!userModel) {
      throw new BadRequestException("Not Found");
    }

    userModel.full_name = data.full_name || userModel.full_name;
    userModel.user_setting = await this.UpdateUserSetting(
      userModel.user_setting,
      data,
      user
    );
    await this.userRepository.Save(userModel);

    let updatedUser = await this.userRepository.FindById(userModel.Id, {
      relations: [
        "company",
        "user_setting",
        "business_area_permission",
        "locations",
        "social_integration",
      ],
    });

    delete updatedUser["salt"];
    delete updatedUser["password"];
    delete updatedUser["user_ip"];

    return updatedUser;
  }

  public async UpdateUserFilters(
    data: UpdateUserFiltersRequest,
    user: IRedisUserModel
  ) {
    let userModel: UserModel = await this.userRepository.FindOne(
      {
        Id: user.Id,
        company_id: user.company_id,
        is_deleted: 0,
      },
      {
        select: [
          "Id",
          "email",
          "password",
          "salt",
          "full_name",
          "company_id",
          "is_deleted",
          "activated",
          "role",
          "last_login",
          "image_url",
          "t_and_c_accepted",
          "signup_date",
          "filters",
          "tooltip",
          "user_ip",
          "created_at",
        ],
      }
    );

    if (!userModel) {
      throw new BadRequestException("Not Found");
    }

    let filters = userModel.filters;

    if (data.planAndCommunication) {
      filters.planAndCommunication = data.planAndCommunication;
    }

    if (data.analytics) {
      filters.analytics = data.analytics;
    }

    if (data.calendar) {
      filters.calendar = data.calendar;
    }

    if (data.report) {
      filters.report = data.report;
    }

    if (data.task) {
      filters.task = data.task;
    }

    await this.userRepository.Update(
      { Id: userModel.Id },
      { filters: filters }
    );

    let updatedUser = await this.userRepository.FindById(userModel.Id, {
      relations: ["locations", "business_area_permission"],
    });

    delete updatedUser["salt"];
    delete updatedUser["password"];
    delete updatedUser["user_ip"];

    return updatedUser;
  }

  public async UpdateUserTooltip(
    data: UpdateTooltipRequest,
    user: IRedisUserModel
  ) {
    let userModel: UserModel = await this.userRepository.FindOne(
      {
        Id: user.Id,
        company_id: user.company_id,
        is_deleted: 0,
      },
      {
        select: [
          "Id",
          "email",
          "password",
          "salt",
          "full_name",
          "company_id",
          "is_deleted",
          "activated",
          "role",
          "last_login",
          "image_url",
          "t_and_c_accepted",
          "signup_date",
          "filters",
          "tooltip",
          "user_ip",
          "created_at",
        ],
      }
    );

    if (!userModel) {
      throw new BadRequestException("Not Found");
    }

    let tooltip = userModel.tooltip;

    if (data.planAndCommunication) {
      tooltip.planAndCommunication = data.planAndCommunication;
    }

    if (data.analytics) {
      tooltip.analytics = data.analytics;
    }

    if (data.calendar) {
      tooltip.calendar = data.calendar;
    }

    if (data.report) {
      tooltip.report = data.report;
    }

    await this.userRepository.Update(
      { Id: userModel.Id },
      { tooltip: tooltip }
    );

    return null;
  }

  public async Login(
    req: Request,
    data: LoginRequest
  ): Promise<{
    user: UserModel;
    token: String;
    is_mfa_enabled: Boolean;
    first_time_login: Boolean;
  }> {
    const user = await this.LoginVerification(data, req);
    if (!user.is_mfa_enabled) {
      const { token, first_time_login } = await this.TokenProcessing(user, req);
      delete user.mfa_secret;
      return {
        user,
        token,
        first_time_login,
        is_mfa_enabled: user.is_mfa_enabled,
      };
    } else {
      delete user.mfa_secret;
      let first_time_login = false;
      if (!user.last_login) {
        first_time_login = true;
      }
      return {
        user,
        token: null,
        first_time_login,
        is_mfa_enabled: user.is_mfa_enabled,
      };
    }
  }

  public async GetUserFromToken(token: string) {
    const user = JSON.parse(await this.redisService.Get(token));
    if (!user) {
      throw new UnauthorizedException("Invalid token");
    }
    return {
      Id: user.Id,
      company_id: user.company_id,
      role: user.role,
      token: token,
    }
  }

  public async GetUser(userId: number): Promise<any> {
    let user = await this.userRepository.FindById(userId, {
      relations: [
        "company",
        "user_setting",
        "business_area_permission",
        "locations",
        "social_integration",
        "user_setting.color",
      ],
    });
    delete user["password"];

    return user;
  }

  public async Me(user: IRedisUserModel) {
    const companyPromise = this.companyRepository.FindById(user.company_id, {
      relations: [
        "subscription",
        "subscription.package",
        "subscription.package_price",
      ],
    });

    const [userModel, company] = await Promise.all([
      this.GetUser(user.Id),
      companyPromise,
    ]);

    if (company.is_deleted == 1 || !company.is_active) {
      throw new BadRequestException(
        "Your company is not active. Please contact support."
      );
    }

    userModel.company = company;

    return userModel;
  }

  public async GetUsers(
    data: UserSearchRequest,
    user: IRedisUserModel
  ): Promise<{
    users: number | Array<any>;
    count: number | Array<any>;
    page: number;
    limit: number;
  }> {
    if (data.business_areas) {
      const businessAreas =
        await this.businessAreaService.GetAllBusinessAreaLevels(
          data.business_areas,
          user.company_id
        );
      data.business_areas = businessAreas.map(({ Id }) => Id);
    }
    const [users, count] = await this.userRepository.SearchUsers(data, user);
    return { users: users, count: count, page: data.page, limit: data.limit };
  }

  public async ChangePassword(
    changePasswordReq: ChangePasswordRequest,
    user: any
  ) {
    const userModel: UserModel = await this.userRepository.FindById(user.Id, {
      select: [
        "Id",
        "email",
        "password",
        "salt",
        "full_name",
        "company_id",
        "is_deleted",
        "activated",
        "role",
        "last_login",
        "t_and_c_accepted",
        "signup_date",
        "filters",
        "tooltip",
        "user_ip",
        "created_at",
      ],
    });

    const passwordIsValid = await Comparepassword(
      changePasswordReq.old_password,
      userModel.password
    );
    if (!passwordIsValid) {
      throw new BadRequestException("Current password is incorrect.");
    }

    userModel.password = await Hashpassword(changePasswordReq.new_password);

    await this.userRepository.Save(userModel);

    //Delete sessions of user from Redis
    const tokenList: any = JSON.parse(
      await this.redisService.Get(`user-${userModel.Id}`)
    );
    await this.DeleteUserTokens(tokenList);
    await this.redisService.Delete(`user-${userModel.Id}`);

    return {};
  }

  public async Logout(user: IRedisUserModel) {
    //Delete sessions of user from Redis
    let tokenList: any = JSON.parse(
      await this.redisService.Get(`user-${user.Id}`)
    );

    if (tokenList && tokenList.indexOf(user.token)) {
      tokenList.splice(tokenList.indexOf(user.token), 1);
    }

    await this.redisService.Set(
      `user-${user.Id}`,
      JSON.stringify(tokenList)
    );
    await this.redisService.Delete(user.token);

    return null;
  }

  public async DeleteUser(userId: number, user: IRedisUserModel) {
    if (userId == user.Id) {
      throw new BadRequestException("You can't delete your own account.");
    }

    const userModel = await this.userRepository.FindById(userId);

    if (userModel.role == UserRoles.Owner) {
      throw new BadRequestException("You can't delete owner user.");
    }

    let tokenList: any = JSON.parse(
      await this.redisService.Get(`user-${userId}`)
    );

    if (tokenList?.length) {
      for (let token of tokenList) {
        await this.redisService.Delete(token);
      }
    }

    await this.redisService.Delete(`user-${userId}`);

    await this.userRepository.Delete(
      { Id: userId, company_id: user.company_id },
      true
    );
    return null;
  }

  public async DeleteUsers(data: DeleteUsersRequest, user: IRedisUserModel) {
    let userList = await this.userRepository.Find({
      Id: In(data.ids),
      company_id: user.company_id,
    });

    for (let index = 0, len = userList.length; index < len; index++) {
      let tokenList: any = JSON.parse(
        await this.redisService.Get(`user-${userList[index].Id}`)
      );
      for (let token in tokenList) {
        await this.redisService.Delete(token);
      }

      await this.redisService.Delete(`user-${userList[index].Id}`);
    }

    await this.userRepository.Delete(
      {
        Id: In(data.ids),
        role: In([UserRoles.Admin, UserRoles.Manager, UserRoles.User]),
        company_id: user.company_id,
      },
      true
    );
    return null;
  }

  public async UploadUserImage(user: IRedisUserModel, image) {
    try {
      let userModel = await this.userRepository.FindById(user.Id);
      if (userModel.image_url) {
        const imageUrl = userModel.image_url.split("?")[0];
        DeleteAWSFile(imageUrl.substr(imageUrl.lastIndexOf("/") + 1));
      }
      await this.userRepository.Update(
        { Id: user.Id },
        { image_url: image.location }
      );

      let key = GetFileKey(image.location);
      let imageUrl = await GetAWSSignedUrl(key);
      return { Id: user.Id, image_url: imageUrl };
    } catch (error) {
      throw new InternalServerError(error);
    }
  }

  public async RemoveUserImage(user: IRedisUserModel) {
    let userModel = await this.userRepository.FindById(user.Id);
    if (userModel.image_url) {
      userModel.image_url = "";
      DeleteAWSFile(
        userModel.image_url.substr(userModel.image_url.lastIndexOf("/") + 1)
      );
    }
    await this.userRepository.Update({ Id: user.Id }, { image_url: "" });
    return userModel;
  }

  public async ForgotPassword(
    req: Request,
    data: ForgotPasswordRequest
  ): Promise<any> {
    const user = await this.userRepository.FindOne(
      { email: data.email, is_deleted: 0 },
      {
        select: [
          "Id",
          "email",
          "password",
          "salt",
          "full_name",
          "company_id",
          "is_deleted",
          "activated",
          "role",
          "last_login",
          "image_url",
          "t_and_c_accepted",
          "signup_date",
          "filters",
          "tooltip",
          "user_ip",
          "created_at",
        ],
        relations: ["company"],
      }
    );

    if (!user) {
      return null;
    }

    if (user.company.is_deleted == 1 || !user.company.is_active) {
      throw new BadRequestException(
        "Your company is not active. Please contact support."
      );
    }

    const token = this.createFPToken(user);

    const replacements = {
      FullName: user.full_name,
      ResetPasswordLink: `https://${req.get(
        "host"
      )}/#/auth/reset-password/${token}`,
    };

    const subdomain = CheckSubDomain(req);

    const mailOptions = {
      to: data.email,
      subject: "Reset Password Request",
      from: "no-reply@icplan.com",
    };
    this.mailService.SendMail(
      "reset-password.html",
      replacements,
      mailOptions,
      subdomain
    );

    return null;
  }

  public async ResetPassword(
    data: ResetPasswordRequest,
    token
  ): Promise<{
    user: UserModel;
    token: string;
    first_time_login: Boolean;
    mfa_details?: MfaDetails;
  }> {
    let decoded;
    let mfa_details;

    try {
      decoded = decode(token);
      if (!decoded) {
        throw new HttpError(
          ResponseCode.BAD_REQUEST,
          "Your reset password link is invalid or has expired."
        );
      }
    } catch (e) {
      throw new BadRequestException("Your reset password link is invalid or has expired.");
    }

    const user = await this.userRepository.FindById(decoded.Id, {
      select: [
        "Id",
        "email",
        "password",
        "salt",
        "full_name",
        "company_id",
        "is_deleted",
        "activated",
        "role",
        "last_login",
        "image_url",
        "t_and_c_accepted",
        "signup_date",
        "filters",
        "tooltip",
        "user_ip",
        "created_at",
        "is_mfa_enabled",
      ],
      relations: [
        "company",
        "business_area_permission",
        "locations",
        "mfa_secret",
        "company.subscription"
      ],
    });

    if (!this.verifyFPToken(token, user)) {
      throw new BadRequestException("Your reset password link is invalid or has expired.");
    }

    let first_time_login = false;
    if (!user.last_login) {
      first_time_login = true;
    }

    user.password = await Hashpassword(data.password);
    user.last_login = new Date().getTime();
    user.activated = true;
    await this.userRepository.Update(
      { Id: user.Id },
      {
        password: user.password,
        last_login: user.last_login,
        activated: user.activated,
      }
    );

    delete user["password"];

    const loginToken = this.generateToken(user.Id, user.company_id);
    await this.setSession(loginToken, user.Id, user.company_id, user.role);

    if (user.is_mfa_enabled) {
      if (user.hasOwnProperty("mfa_secret") && user.mfa_secret) {
        const {
          mfa_secret: { secret: current_secret },
        } = user;
        if (current_secret) {
          await this.DeleteMfaSecretForUser(
            user.Id,
            user.company_id,
            current_secret
          );
        }
      }
      const user_info = {
        Id: user.Id,
        company_id: user.company_id,
        token,
        role: user.role,
      };
      mfa_details = await this.ConfigureMfa(
        { is_mfa_enabled: true },
        user_info
      );
    }
    const resp = {
      user,
      token: loginToken,
      first_time_login,
      mfa_details,
    };
    if (!mfa_details) {
      delete resp["mfa_details"];
    }
    return {
      ...resp,
    };
  }

  public async SendVerificationCode(data: ResendVerificationCodeRequest) {
    const user = await this.userRepository.FindOne(
      { email: data.email, is_deleted: 0 },
      {
        select: [
          "Id",
          "email",
          "password",
          "salt",
          "full_name",
          "company_id",
          "activated",
        ],
      }
    );

    if (!user) {
      throw new BadRequestException("User with this email does not exist.");
    }

    if (user.activated) {
      throw new BadRequestException("Email is already verified. Please login.");
    }

    const VerificationCode = GetVerificationCode();
    const replacements = { VerificationCode };

    const mailOptions = {
      to: data.email,
      subject: "[ICPlan] Verify your Email",
      from: "no-reply@icplan.com",
      bcc: appEnv("SMTP_BCC"),
    };

    this.mailService.SendMail(
      "verification-code.html",
      replacements,
      mailOptions,
      "default"
    );

    const key = data.email;
    await this.redisService.Set(key, VerificationCode, 10 * 60); // 10 minutes

    return null;
  }

  public async VerifyVerificationCode(data: VerifyEmailRequest): Promise<{
    user: UserModel;
    token: string;
    is_mfa_enabled: boolean;
    first_time_login: boolean;
  }> {
    const key = data.email;
    const [verificationCode, user] = await Promise.all([
      this.redisService.Get(key),
      this.userRepository.FindOne(
        { email: data.email, is_deleted: 0 },
        {
          relations: [
            "company",
            "company.subscription",
            "company.subscription.package",
          ],
        }
      ),
    ]);

    if (!user) {
      throw new BadRequestException("User with this email does not exist.");
    }

    if (user.activated) {
      throw new BadRequestException("Email is already verified. Please login.");
    }

    if (!verificationCode) {
      throw new BadRequestException("Verification code is expired or invalid.");
    }

    if (verificationCode != data.verification_code) {
      throw new BadRequestException("Verification code is invalid.");
    }

    const token = this.generateToken(user.Id, user.company_id);
    user.activated = true;
    await Promise.all([
      this.userRepository.Update(
        { Id: user.Id },
        { activated: user.activated }
      ),
      this.redisService.Delete(key),
      this.setSession(token, user.Id, user.company_id, user.role),
    ]);

    return {
      user,
      token,
      is_mfa_enabled: user.is_mfa_enabled,
      first_time_login: !user.last_login,
    };
  }

  public async GetUserBusinessAreas(filter, user: IRedisUserModel) {
    const businessAreas = await this.businessAreaService.GetUserBusinessAreas(
      filter,
      user
    );
    return businessAreas;
  }

  public async GetAllUsers(data: GetAllUsersRequest) {
    const { users, count } = await this.userRepository.GetAllUsers(data);
    return { users, count, page: data.page, limit: data.limit };
  }

  public async ConfigureMfa(
    data: ConfigureMfa,
    user: IRedisUserModel,
    userId?: number
  ) {
    let generateSecret;
    let qrCode;

    if (userId) {
      user.Id = userId;
    }
    let userModel: UserModel = await this.userRepository.FindOne(
      {
        Id: user.Id,
        company_id: user.company_id,
        is_deleted: 0,
      },
      {
        select: ["Id", "full_name", "is_mfa_enabled"],
        relations: ["company", "mfa_secret"],
      }
    );

    if (!userModel) {
      throw new BadRequestException("Not Found");
    }

    const {
      company: { is_mfa_enabled: company_mfa, name: company_name },
      full_name,
      is_mfa_enabled,
    } = userModel;

    if (!company_mfa) {
      throw new BadRequestException("Your company MFA is disabled.");
    } else {
      //previous mfa status is enabled and current request is for disabling MFA
      if (is_mfa_enabled && !data.is_mfa_enabled) {
        const {
          mfa_secret: { secret: current_secret },
        } = userModel;
        const delete_secret = await this.DeleteMfaSecretForUser(
          user.Id,
          user.company_id,
          current_secret
        );
        return { message: delete_secret };
      }
      //previous mfa status is disabled and current request is for enabling MFA
      else if (!is_mfa_enabled && data.is_mfa_enabled) {
        if (userModel.hasOwnProperty("mfa_secret") && userModel.mfa_secret) {
          const {
            mfa_secret: { secret: current_secret },
          } = userModel;
          //if currently having any secret against that user then delete it
          if (current_secret) {
            await this.DeleteMfaSecretForUser(
              user.Id,
              user.company_id,
              current_secret
            );
          }
        }
        generateSecret = speakeasy.generateSecret({
          name: `${full_name}-${company_name}`,
        });

        qrCode = await qrcode.toDataURL(generateSecret.otpauth_url);
        if (!qrCode) {
          throw new NotAcceptableError(
            "Couldn't genereate QR code, please try again."
          );
        }

        let mfaSecretModel = new MfaSecretModel();
        mfaSecretModel.secret = generateSecret.base32;
        const { Id: mfa_secret_id } = await this.mfaSecretRepository.Create(
          mfaSecretModel
        );

        await this.userRepository.Update(
          {
            Id: user.Id,
            company_id: user.company_id,
            is_deleted: 0,
          },
          { is_mfa_enabled: false, mfa_secret_id }
        );
        return {
          qr_code: qrCode,
          secret: generateSecret.base32,
        };
      } else {
        //case of already enabled or disabled
        const message_keyword = is_mfa_enabled ? "enabled" : "disabled";
        throw new HttpError(
          ResponseCode.BAD_REQUEST,
          `Your MFA is already ${message_keyword}.`
        );
      }
    }
  }

  public async VerifyMfaConfiguration(user: IRedisUserModel, code: Number) {
    let userModel: UserModel = await this.userRepository.FindOne(
      {
        Id: user.Id,
        company_id: user.company_id,
        is_deleted: 0,
      },
      {
        select: ["Id", "full_name", "is_mfa_enabled"],
        relations: ["company", "mfa_secret"],
      }
    );
    if (!userModel) {
      throw new BadRequestException("User not found");
    }
    if (!code) {
      throw new BadRequestException("Verification code not found");
    }
    let twoFactorAuthentication = speakeasy.totp.verify({
      secret: userModel.mfa_secret.secret,
      encoding: "base32",
      token: code,
    });
    if (!twoFactorAuthentication) {
      throw new BadRequestException("MFA verification code failed.");
    }
    await this.userRepository.Update(
      {
        Id: user.Id,
        company_id: user.company_id,
        is_deleted: 0,
      },
      { is_mfa_enabled: true }
    );
    return "MFA Enabled Successfully";
  }

  public async DeleteMfaSecretForUser(
    userId: number,
    companyId: number,
    current_secret: String
  ) {
    await this.userRepository.Update(
      {
        Id: userId,
        company_id: companyId,
        is_deleted: 0,
      },
      { is_mfa_enabled: false, mfa_secret_id: null }
    );

    await this.mfaSecretRepository.Delete({ secret: current_secret }, false);
    return "MFA Disabled Successfully";
  }

  public async LoginVerification(data: LoginRequest, req: Request) {
    const user: UserModel = await this.userRepository.FindOne(
      { email: data.email, is_deleted: 0 },
      {
        select: [
          "Id",
          "email",
          "password",
          "salt",
          "full_name",
          "company_id",
          "is_deleted",
          "activated",
          "role",
          "last_login",
          "image_url",
          "t_and_c_accepted",
          "signup_date",
          "filters",
          "tooltip",
          "user_ip",
          "created_at",
          "is_mfa_enabled",
        ],
        relations: [
          "business_area_permission",
          "locations",
          "mfa_secret",
        ],
      }
    );

    if (!user) {
      throw new BadRequestException("Username or password is incorrect.");
    }

    const companyPromise = this.companyRepository.FindById(user.company_id, {
      relations: [
        "subscription",
        "subscription.package",
        "subscription.package_price",
      ],
    });

    const companyULMPromise = this.companyUserLicenseRepository.FindOne({
      company_id: user.company_id,
    });

    const [company, companyULM] = await Promise.all([
      companyPromise,
      companyULMPromise,
    ]);

    if (company.is_deleted == 1 || !company.is_active) {
      throw new BadRequestException("You are not authorized to login, please contact your administrator");
    }

    user.company = company;

    let intersectSubdomains =
      companyULM.settings &&
        companyULM.settings.subdomains &&
        companyULM.settings.subdomains.length
        ? req.subdomains.filter((x) =>
          companyULM.settings.subdomains.includes(x)
        )
        : [];

    let intersectEmailDomain =
      companyULM.settings &&
        companyULM.settings.subdomains &&
        companyULM.settings.subdomains.length
        ? companyULM.settings.emails.filter(
          (emailDomain) =>
            data.email.substring(data.email.lastIndexOf("@")) == emailDomain
        )
        : [];

    if (
      !["localhost", "127.0.0.1"].includes(req.hostname) &&
      (!intersectSubdomains.length || !intersectEmailDomain.length)
    ) {
      throw new BadRequestException(
        `The email entered does not match our records for this account.
				Please ensure you are using the correct unique URL for your company’s ICPlan account
				e.g. https://COMPANYNAME.icplan.com. If you need further help, please email support@icplan.com.`
      );
    }

    try {
      const passwordIsValid = await Comparepassword(
        data.password,
        user.password
      );
      if (!passwordIsValid) {
        throw new BadRequestException("Username or password is incorrect.");
      }
    } catch (e) {
      /**
       * Password Authentication for V1 users
       */

      let password_data = this.hash(data.password, user.salt);
      let password = password_data.hash;

      if (password != user.password) {
        throw new BadRequestException("Username or password is incorrect.");
      }
    }

    if (!user.activated) {
      throw new NotAcceptableException("Email address not verified");
    }
    delete user["salt"];
    delete user["password"];
    return user;
  }

  public async MfaLogin(
    req: Request,
    data: MFALoginRequest
  ): Promise<{
    user: UserModel;
    token: String;
    is_mfa_enabled: Boolean;
    first_time_login: Boolean;
  }> {
    const user = await this.LoginVerification(data, req);
    const { token, first_time_login } = await this.TokenProcessing(
      user,
      req,
      data.mfa_code
    );
    delete user.mfa_secret;
    return {
      user: user,
      token: token,
      first_time_login: first_time_login,
      is_mfa_enabled: user.is_mfa_enabled,
    };
  }

  public async TokenProcessing(
    user: UserModel,
    req: Request,
    mfa_code?: Number
  ): Promise<{
    token: String;
    first_time_login: Boolean;
  }> {
    let token;
    let twoFactorAuthentication = true;
    let firstTimeLogin = false;
    if (!user.last_login) {
      firstTimeLogin = true;
    }
    if (mfa_code) {
      if (!user.mfa_secret && !user.mfa_secret.secret) {
        Sentry.captureMessage("MFA verification failed.", {
          user: { id: user.Id.toString() },
          // level: Sentry.Severity.Warning,
        });
        throw new UnauthorizedError("MFA verification code failed.");
      }
      twoFactorAuthentication = speakeasy.totp.verify({
        secret: user.mfa_secret.secret,
        encoding: "base32",
        token: mfa_code,
      });
    }

    if (!twoFactorAuthentication) {
      Sentry.captureMessage("MFA verification failed.", {
        user: { id: user.Id.toString() },
        level: "warning",
      });
      throw new UnauthorizedError("MFA verification code failed.");
    }
    token = this.generateToken(user.Id, user.company_id);
    await this.setSession(token, user.Id, user.company_id, user.role);

    const currentIp = RequestIp.getClientIp(req);
    if (user.user_ip != currentIp && false) {
      // send email alert
      this.SendNewIpAlert(user, req, currentIp);
    }

    user.last_login = new Date().getTime();
    await this.userRepository.Update(
      { Id: user.Id },
      {
        last_login: user.last_login,
        user_ip: currentIp,
      }
    );

    return { token, first_time_login: firstTimeLogin };
  }

  public async RevokeMfa(data: RevokeMfa) {
    const { Id } = data;

    let user = await this.userRepository.FindOne(
      {
        Id,
        is_deleted: 0,
      },
      {
        select: ["Id", "company_id", "is_mfa_enabled"],
        relations: ["mfa_secret"],
      }
    );

    if (!user) {
      throw new BadRequestException("Not Found");
    }
    if (user.is_mfa_enabled && user.mfa_secret.hasOwnProperty("secret")) {
      await this.DeleteMfaSecretForUser(
        user.Id,
        user.company_id,
        user.mfa_secret.secret
      );
    } else {
      throw new BadRequestException("MFA is already disabled");
    }
    return "MFA disabled successfully";
  }

  public async AzureLogin(req) {
    let firstTimeLogin = false;
    let token;
    let user: UserModel;
    const {
      authInfo: { preferred_username: email },
    } = req;
    user = await this.userRepository.FindOne(
      { email, is_deleted: 0 },
      {
        select: [
          "Id",
          "email",
          "full_name",
          "company_id",
          "activated",
          "role",
          "last_login",
        ],
        relations: ["company"],
      }
    );

    if (!user) {
      throw new BadRequestException(
        "Your email doesn't exist in our record, please contact your administrator"
      );
    } else if (user.company.is_deleted == 1 || !user.company.is_active) {
      throw new BadRequestException("You are not authorized to login, please contact your administrator");
    } else if (!user.activated) {
      throw new NotAcceptableException("Email address not verified");
    }

    if (!user.last_login) {
      firstTimeLogin = true;
    }

    token = this.generateToken(user.Id, user.company_id);
    await this.setSession(token, user.Id, user.company_id, user.role);

    user.last_login = new Date().getTime();
    await this.userRepository.Update(
      { Id: user.Id },
      { last_login: user.last_login }
    );
    return { user, token, firstTimeLogin };
  }

  public async CognitoLogin(idToken: string) {
    let firstTimeLogin = false;

    let data = await this.redisService.Get(`SSO-${idToken}`);
    data = JSON.parse(data);

    // TODO: Cognito flow
    // data = await verifier.verify(idToken.toString());

    if (!data || !data.email) {
      throw new BadRequestException("Couldn't login.");
    } else {
      this.redisService.Delete(`SSO-${idToken}`);
    }

    let user: UserModel = await this.userRepository.FindOne(
      { email: data.email, is_deleted: 0 },
      {
        select: [
          "Id",
          "email",
          "password",
          "salt",
          "full_name",
          "company_id",
          "is_deleted",
          "activated",
          "role",
          "last_login",
          "image_url",
          "t_and_c_accepted",
          "signup_date",
          "filters",
          "tooltip",
          "user_ip",
          "created_at",
          "is_mfa_enabled",
        ],
        relations: [
          "company",
          "company.subscription",
          "business_area_permission",
          "locations",
          "mfa_secret",
        ],
      }
    );

    if (!user) {
      throw new BadRequestException(
        "Your email doesn't exist in our record, please contact your administrator"
      );
    } else if (user.company.is_deleted == 1 || !user.company.is_active) {
      throw new BadRequestException("You are not authorized to login, please contact your administrator");
    }

    if (!user.last_login) {
      firstTimeLogin = true;
    }

    const token = this.generateToken(user.Id, user.company_id);
    await this.setSession(token, user.Id, user.company_id, user.role);

    user.last_login = new Date().getTime();
    await this.userRepository.Update(
      { Id: user.Id },
      { last_login: user.last_login }
    );

    return {
      user,
      token,
      first_time_login: firstTimeLogin,
      is_mfa_enabled: user.is_mfa_enabled,
      redirect_url: data.redirect_url,
    };
  }

  public async MarkKeyMessagesAsRead(user: IRedisUserModel) {
    await this.userRepository.Update(
      { Id: user.Id },
      { key_messages_read: true }
    );
    return null;
  }

  public async GetUsersForFilter(
    data: UserSearchRequest,
    user: IRedisUserModel
  ) {
    if (data.business_areas || data.communication_id) {
      const businessAreas = await this.businessAreaService.GetAncestors(data);
      data.business_areas = businessAreas.map(({ Id }) => Id);
    }
    const [users, count] = await this.userRepository.GetUsersForFilter(
      data,
      user
    );
    return { users, count, page: data.page, limit: data.limit };
  }
}
