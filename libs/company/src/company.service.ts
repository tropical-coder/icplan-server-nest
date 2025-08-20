import { CompanyUserLicenseRepository } from "../../repository/company/CompanyUserLicenseRepository";
import { InternalServerError, BadRequestException } from "routing-controllers";
import { CompanyRepository } from "../../repository/company/CompanyRepository";
import { UserService } from "../user/UserService";
import { UserRepository } from "../../repository/user/UserRepository";

import {
  CalendarFormat,
  CompanyModel,
  DateFormat,
  DefaultCalendarView,
  SecondaryCalendarView,
} from "../../model/company/CompanyModel";
import { MfaEnabledCompaniesModel } from "../../model/company/MfaEnabledCompaniesModel";
import { SsoEnabledCompaniesModel } from "../../model/company/SsoEnabledCompaniesModel";
import {
  AddBasicConfigurationRequest,
  UpdateCompanyRequest,
} from "../../../api/controller/company/CompanyRequest";
import { PaginationParam } from "../../controller/base/BaseRequest";
import { CheckDisposableEmail, GetPaginationOptions, Hashpassword, MergeCells } from "../../helpers/UtilHelper";
import { RegisterCompanyRequest } from "../../../api/controller/auth/AuthRequest";
import {
  UserModel,
  UserRoles,
  IRedisUserModel,
} from "../../model/user/UserModel";
import { ConflictError } from "../../helpers/ServerResponse";
import {
  DeleteAWSFile,
  GetAWSSignedUrl,
  GetFileKey,
} from "../aws/MediaService";
import { CompanyUserLicenseModel } from "../../model/company/CompanyUserLicenseModel";
import { MailService } from "../mail/MailService";
import { appEnv } from "../../helpers/EnvHelper";
import SendyHelper from "../../helpers/SendyHelper";
import {
  CreateCompanyByAdminRequest,
  CreateSubdomainRequest,
  GetCompaniesRequest,
  SsoCredentialsRequest,
  UpdateCompanyInfoRequest,
  UpdatePOPSubtitlesRequest,
} from "../../../admin/controller/company/CompanyRequest";
import { QuickBookService } from "../quick_book/QuickBookService";
import { MfaSecretRepository } from "../../repository/mfa_secret/MfaSecretRepository";
import { In, IsNull, LessThanOrEqual, Not } from "typeorm";
import { MfaEnabledCompaniesRepository } from "../../repository/mfa_enabled_companies/MfaEnabledCompaniesRepository";
import { SsoEnabledCompaniesRepository } from "../../repository/sso_enabled_companies/SsoEnabledCompaniesRepository";
import { KeyMessagesModel } from "../../model/company/KeyMessagesModel";
import { ColorService } from "../color/ColorService";
import * as jwt from "jsonwebtoken";
import { CreateSubdomain, DeleteSubdomain } from "../aws/Route53Service";
import * as Excel from "exceljs";
import { SubdomainMap } from "../../constant/SubdomainConstant";
import { DomainConstants } from "../../constant/DomainConstants";
import { SubscriptionService } from "../subscription/SubscriptionService";
import { PackagePriceRepository } from "../../repository/package/PackagePriceRepository";
import { PackageType } from "../../model/package/PackageModel";
import { PackageRepository } from "../../repository/package/PackageRepository";
import { PackageService } from "../package/PackageService";
import { ActiveCampaignService } from "../active_campaign/ActiveCampaignService";
import axios from "axios";
import { Request } from "express";
import * as moment from "moment";

@Injectable()
export class CompanyService {
  constructor(
    private companyRepository: CompanyRepository,
    private userRepository: UserRepository,
    private userService: UserService,
    private companyUserLicenseRepository: CompanyUserLicenseRepository,
    private mailService: MailService,
    private colorService: ColorService,
    private quickBookService: QuickBookService,
    private mfaSecretRepository: MfaSecretRepository,
    private mfaEnabledCompaniesRepository: MfaEnabledCompaniesRepository,
    private ssoEnabledCompaniesRepository: SsoEnabledCompaniesRepository,
    private packageService: PackageService,
    private packageRepository: PackageRepository,
    private packagePriceRepository: PackagePriceRepository,
    private subscriptionService: SubscriptionService,
    private activeCampaignService: ActiveCampaignService,
  ) {}

  private async CreateCompany(data) {
    /**
     * Create company
     */
    let companyModel = new CompanyModel();
    companyModel.name = data.company_name;
    companyModel.image_url = data.image_url;
    companyModel.is_mfa_enabled = data.is_mfa_enabled;
    companyModel.secondary_calendar_view =
      data.secondary_calendar_view || SecondaryCalendarView.GanttChart;
    companyModel.default_calendar_view =
      data.default_calendar_view || DefaultCalendarView.Calendar;
    companyModel.show_key_messages = data.show_key_messages || false;
    companyModel.show_content_type = data.show_content_type || false;
    companyModel.notification_enabled = data.notification_enabled || false;
    companyModel.notification_before_days = data.notification_before_days || 1;
    companyModel.date_format = data.date_format || DateFormat.DMY;
    companyModel.calendar_format =
      data.calendar_format || CalendarFormat.TwelveMonth;
    companyModel.high_color = data.high_color || "#ff0000"; // Red as default
    companyModel.grid_enabled = data.grid_enabled ?? false;
    companyModel.dashboard_enabled = data.dashboard_enabled ?? false;
    companyModel.first_day = data.first_day;
    companyModel.force_week_date = data.force_week_date;
    companyModel.first_date = data.force_week_date ? data.first_date : null;
    companyModel.first_week = !data.force_week_date ? data.first_week : 0;
    companyModel.first_month = data.first_month;
    companyModel.country_code = data.country_code;

    const company = await this.companyRepository.Create(companyModel);

    /**
     * Set Default color
     */
    this.colorService.CreateDefaultColor(company.Id);

    return company;
  }

  private async SetCompanyUserLicense(company: CompanyModel, data) {
    let companyUserLicenseModel = new CompanyUserLicenseModel();
    companyUserLicenseModel.company_id = company.Id;
    companyUserLicenseModel.settings = {
      subdomains: [],
      emails: ["@mailinator.com", "@icplan.com"],
    };

    const companySubdomain = appEnv("COMPANY_SUBDOMAIN");
    if (companySubdomain) {
      companyUserLicenseModel.settings.subdomains.push(companySubdomain);
    }

    if (
      !companyUserLicenseModel.settings.emails.includes(
        data.email.substring(data.email.lastIndexOf("@"))
      )
    ) {
      let subDomain = data.email.substring(data.email.lastIndexOf("@"));
      companyUserLicenseModel.settings.emails.push(subDomain);
    }

    companyUserLicenseModel.pop_subtitles = {
      purpose: "What are your business problems and business goals?",
      audience: "Who are your target audiences and what are their comms requirements?",
      objectives: "What are your communications objectives? (SMART)",
      barriers: "Are there any barriers to change? Which of those can you influence?",
      messaging: "What are your key messages?",
      how: "What tactics are you using to deliver the communications? Any phases?",
      stakeholders: "Who are your key stakeholders? How can you help them/how can they help you?",
      impact: "What impact do your comms need to have? What outcomes show success?",
      reaction: "How will you measure that your campaign has been received well?"
    };

    const companyUserLicense = await this.companyUserLicenseRepository.Create(
      companyUserLicenseModel
    );
  }

  private async SendWelcomeEmail(user, company) {
    const token = this.userService.createFPToken(user);

    const replacements = {
      FullName: user.full_name,
      SetPasswordLink: `${appEnv(
        "CLIENT_BASE_URL",
        "app.icplan.com"
      )}#/auth/set-password/${token}`,
      CompanyName: company.name,
      Host: appEnv("CLIENT_BASE_URL", "app.icplan.com"),
    };

    const mailOptions = {
      to: user.email,
      subject: "Welcome to ICPlan",
      from: "no-reply@icplan.com",
      bcc: appEnv("SMTP_BCC"),
    };
    this.mailService.SendMail(
      "welcome.html",
      replacements,
      mailOptions,
      "default"
    );
  }

  private SubscribeUserToSendy(data) {
    /**
     * Subscribe to sendy list
     */
    SendyHelper.SubscribeUser({
      name: data.full_name,
      email: data.email,
      list_id: appEnv("SENDY_OWNER_USER_LIST"),
    });

    SendyHelper.SubscribeUserToSendyList(data);
  }

  public async RegisterCompany(
    data: RegisterCompanyRequest,
    req: Request,
  ): Promise<UserModel> {
    let [user, packagePriceModel, promoCode] = await Promise.all([
      this.userRepository.FindOne(
        { email: data.email, is_deleted: 0 },
        { relations: ["company"] }
      ),
      this.packagePriceRepository.FindOne(
        { Id: data.price_id, active: true, package: { active: true } },
        { relations: ["package", "package.package_detail"] }
      ),
      data.promo_code
        ? this.packageService.ValidatePromotionCode(data.promo_code)
        : null,
      CheckDisposableEmail(data.email, req),
    ]);

    if (!packagePriceModel) {
      throw new BadRequestException("The requested plan is unavailable.");
    }

    if (packagePriceModel.value * data.seats > 999999.99) {
      const allowedSeats = Math.floor(999999.99 / packagePriceModel.value);
      throw new BadRequestException(
        `Total amount cannot exceed 999999.99 ${packagePriceModel.currency.toUpperCase()}.  ` +
        `You can buy maximum ${allowedSeats} seats of this plan.`
      );
    }

    if (user) {
      if (user.activated || user.Id != user.company.owner_id) {
        throw new ConflictError(
          "User with this email already registered. Please login."
        );
      }

      if (user.Id == user.company.owner_id) {
        // set new company name and user password
        await Promise.all([
          this.companyRepository.Update(
            { Id: user.company_id },
            { name: data.company_name, country_code: data.country_code },
          ),
          this.userRepository.Update(
            { Id: user.Id },
            { password: await Hashpassword(data.password) },
          ),
        ]);
      }
    } else {
      /** Create Company */
      const company = await this.CreateCompany(data);

      /** Subscribe to free trial */
      const subscriptionPromise = this.subscriptionService.CreateTrialSubscription(
        data.email,
        company,
        packagePriceModel.package,
        packagePriceModel,
        data.seats,
        promoCode?.id,
      );

      const culPromise = this.SetCompanyUserLicense(company, data);

      /**
        * Create user of a company registered
        */
      user = await this.userService.SignUp(
        {
          email: data.email,
          password: data.password,
          role: UserRoles.Owner,
        },
        company.Id
      );

      const verificationCodePromise =
        this.userService.SendVerificationCode(data);
      //this.SubscribeUserToSendy(data);

      const companyUpdatePromise = this.companyRepository.Update(
        { Id: company.Id },
        { owner_id: user.Id }
      );

      await Promise.all([
        verificationCodePromise,
        companyUpdatePromise,
        culPromise,
        subscriptionPromise,
      ]);
    }

    user = await this.userRepository.FindOne(
      { Id: user.Id },
      {
        relations: [
          "company",
          "company.company_user_license",
          "company.subscription",
        ],
      }
    );

    return user;
  }

  public async AddBasicConfiguration(
    data: AddBasicConfigurationRequest,
    user: IRedisUserModel,
  ) {
    const companyPromise = this.companyRepository.FindCompanyById(user.company_id);
    const userPromise = this.userRepository.FindById(user.Id);

    const [companyModel, userModel] = await Promise.all([companyPromise, userPromise]);

    const ACContact = await this.activeCampaignService.CreateContact(
      userModel.email,
      data.full_name,
      data.company_name
    );

    if (!ACContact && appEnv("AC_ENABLED")) {
      throw new Error("Failed to create ActiveCampaign contact.");
    }

    companyModel.name = data.company_name;
    userModel.full_name = data.full_name;

    await Promise.all([
      this.companyRepository.Update(
        { Id: user.company_id },
        { name: companyModel.name }
      ),
      this.userRepository.Update(
        { Id: user.Id },
        { 
          full_name: userModel.full_name,
          ac_contact_id: ACContact?.id,
        }
      ),
      this.activeCampaignService.AddContactToList(
        ACContact?.id,
        appEnv("AC_LIST_FREE_TRIAL"),
      ),
      this.activeCampaignService.AddTagToContact(
        ACContact?.id,
        appEnv("AC_TAG_NO_PLAN_ADDED"),
      ),
      this.activeCampaignService.AddTagToContact(
        ACContact?.id,
        appEnv("AC_TAG_COMPANY_SETTINGS_NOT_COMPLETED"),
      )
    ]);

    userModel.company = companyModel;

    return userModel;
  }

  public async CreateCompanyByAdmin(data: CreateCompanyByAdminRequest) {
    const existingUserPromise = this.userRepository.FindOne({ email: data.email });

    let packagePricePromise, packagePromise;
    if (data.price_id) {
      packagePricePromise = this.packagePriceRepository.FindOne(
        { Id: data.price_id, active: true, package: { active: true } },
        { relations: ["package", "package.package_detail"] }
      );
    } else {
      packagePromise = this.packageRepository.FindOne(
        { package_type: PackageType.Enterprise },
        { relations: ["package_detail"] }
      );
    }

    let [existingUser, packagePriceModel, packageModel] = await Promise.all([
      existingUserPromise,
      packagePricePromise,
      packagePromise,
    ]);

    if (existingUser) {
      throw new ConflictError("User with this email already registered.");
    }

    if (data.price_id && !packagePriceModel) {
      throw new BadRequestException("The requested plan is unavailable.");
    }

    packageModel ??= packagePriceModel.package;
    data.is_mfa_enabled ??= false;
    /** Create Company */
    const company = await this.CreateCompany(data);

    const subscriptionPromise = this.subscriptionService.CreateTrialSubscription(
      data.email,
      company,
      packageModel,
      packagePriceModel,
    );

    /**Enable MFA */
    let mfaEnabledCompanyPromise: Promise<any>;
    if (data.mfa_allowed) {
      mfaEnabledCompanyPromise = this.AllowMfaToCompany(company.Id);
    }

    /** Set allowed users */
    const culPromise = this.SetCompanyUserLicense(company, data);

    /**
     * Create user of a company registered
     */
    let user = await this.userService.SignUp(
      {
        email: data.email,
        full_name: data.full_name,
        role: UserRoles.Owner,
      },
      company.Id
    );

    let verificationCodePromise: Promise<any>;
    if (data.send_verification_email) {
      verificationCodePromise = this.SendWelcomeEmail(user, company);
    }

    //this.SubscribeUserToSendy(data);

    company.quickbook_id = data.quickbook_id;
    company.owner_id = user.Id;
    const companyUpdatePromise = this.companyRepository.Update(
      { Id: company.Id },
      { owner_id: user.Id }
    );

    await Promise.all([
      mfaEnabledCompanyPromise,
      verificationCodePromise,
      companyUpdatePromise,
      culPromise,
      subscriptionPromise,
    ]);

    user = await this.userRepository.FindOne(
      { Id: user.Id },
      {
        relations: [
          "company",
          "company.company_user_license",
          "company.subscription",
        ],
      }
    );

    return user;
  }

  public async UpdateCompanyInfo(
    companyId: number,
    data: UpdateCompanyInfoRequest
  ) {
    const companyPromise = this.companyRepository.FindOne(
      { Id: companyId },
      { relations: ["sso_company"] }
    );

    const companyULPromise = this.companyUserLicenseRepository.FindOne({
      company_id: companyId,
    });

    let [company, companyUserLicense] = await Promise.all([
      companyPromise,
      companyULPromise,
    ]);

    if (!company) {
      throw new BadRequestException("Company Id is invalid");
    }
    if (data.mfa_allowed !== undefined && !data.mfa_allowed) {
      data.is_mfa_enabled = false;
      const checkMfa =
        await this.mfaEnabledCompaniesRepository.GetOneMfaAllowedCompany(
          companyId
        );
      if (checkMfa.length) {
        await this.DeleteAllowedMfaCompany(companyId);
      }
    } else {
      await this.AllowMfaToCompany(companyId);
    }
    if (data.is_mfa_enabled != undefined && !data.is_mfa_enabled) {
      const updateMfa = await this.UpdateMfaStatus(
        companyId,
        data.is_mfa_enabled
      );
    }

    if (data.sso_allowed && !company.sso_company) {
      throw new BadRequestException("Please add SSO credentials first");
    }

    company.name = data.company_name ?? company.name;
    company.quickbook_id = data.quickbook_id;
    company.is_mfa_enabled = data.is_mfa_enabled ?? company.is_mfa_enabled;
    company.secondary_calendar_view =
      data.secondary_calendar_view ?? company.secondary_calendar_view;
    company.default_calendar_view =
      data.default_calendar_view ?? company.default_calendar_view;
    company.show_key_messages = data.show_key_messages ?? company.show_key_messages;
    company.show_content_type = data.show_content_type ?? company.show_content_type;
    company.notification_enabled =
      data.notification_enabled != null
        ? data.notification_enabled
        : company.notification_enabled;
    company.notification_before_days =
      data.notification_before_days ?? company.notification_before_days;
    company.sso_allowed =
      data.sso_allowed != null ? data.sso_allowed : company.sso_allowed;
    company.date_format = data.date_format ?? company.date_format;
    company.calendar_format = data.calendar_format ?? company.calendar_format;
    company.grid_enabled = data.grid_enabled ?? company.grid_enabled;
    company.dashboard_enabled =
      data.dashboard_enabled ?? company.dashboard_enabled;
    company.first_day = data.first_day ?? company.first_day;
    company.force_week_date = data.force_week_date ?? company.force_week_date;
    company.first_date = data.force_week_date ? data.first_date : null;
    company.first_week = !data.force_week_date ? data.first_week : 0;
    company.first_month = data.first_month ?? company.first_month;
    company.country_code = data.country_code ?? company.country_code;
    
    // deactivate
    if (data.is_active !== undefined && !data.is_active && company.is_active) {
      await this.subscriptionService.PauseCollection(company.Id);
    // activate
    } else if (data.is_active !== undefined && data.is_active && !company.is_active) {
      await this.subscriptionService.ResumeCollection(company.Id);
    }

    company.is_active = data.is_active ?? company.is_active;

    await Promise.all([
      this.companyRepository.Save(company),
      this.companyUserLicenseRepository.Save(companyUserLicense),
    ]);

    company.company_user_license = companyUserLicense;

    return company;
  }

  public async UpdateCompanyQuickBookId(companyId, quickbookId) {
    let companyModel: CompanyModel = await this.companyRepository.FindOne({
      Id: companyId,
    });

    if (!companyModel) {
      throw new BadRequestException("Not Found");
    }

    companyModel.quickbook_id = quickbookId;
    await this.companyRepository.Save(companyModel);

    return companyModel;
  }

  public async getSubDomain(subdomains, redirect_url?: string) {
    for (let subdomain of subdomains) {
      if (!subdomains.length || SubdomainMap[subdomain] == "default") {
        return {
          login_url: null,
          result: false,
        };
      }
    }

    const companySsoData =
      await this.companyUserLicenseRepository.GetSubDomainQuery(subdomains);

    if (companySsoData) {
      // companySsoData.certificate_url = await GetAWSSignedUrl(
      //   GetFileKey(companySsoData.certificate_url)
      // );

      companySsoData["redirect_url"] = redirect_url || "/";
      const authorization = jwt.sign(companySsoData, appEnv("SECRET"));

      return {
        login_url: `sso/login`,
        result: true,
        authorization,
      };
    }

    return {
      login_url: null,
      result: false,
    };
  }

  public async UpdateCompany(companyId, data: UpdateCompanyRequest) {
    let companyModel: CompanyModel = await this.companyRepository.FindOne(
      {
        Id: companyId,
      },
      { relations: ["mfa_company"] }
    );

    if (!companyModel) {
      throw new BadRequestException("Not Found");
    }

    if (!data.is_mfa_enabled) {
      const updateMfa = await this.UpdateMfaStatus(
        companyId,
        data.is_mfa_enabled
      );
    }

    companyModel.low_color = data.low_color || companyModel.low_color;
    companyModel.high_color = data.high_color || companyModel.high_color;
    companyModel.high_frequency =
      data.high_frequency != null
        ? data.high_frequency
        : companyModel.high_frequency;
    companyModel.is_mfa_enabled = data.is_mfa_enabled;
    companyModel.notification_before_days =
      data.notification_before_days || companyModel.notification_before_days;
    companyModel.notification_enabled =
      data.notification_enabled != null
        ? data.notification_enabled
        : companyModel.notification_enabled;
    companyModel.country_code = data.country_code ?? companyModel.country_code;
    await this.companyRepository.Save(companyModel);

    companyModel["allowed_mfa"] = companyModel.mfa_company ? true : false;
    delete companyModel["mfa_company"];

    return companyModel;
  }

  public async GetCompany(companyId: number): Promise<CompanyModel> {
    const result = await this.companyRepository.FindCompanyById(companyId);
    result["allowed_mfa"] = result.mfa_company ? true : false;
    delete result["mfa_company"];
    return result;
  }

  public async GetCompanyWithCounts(companyId: number): Promise<CompanyModel> {
    return await this.companyRepository.GetCompanyWithCounts(companyId);
  }

  public async GetCompanys(data: PaginationParam): Promise<{
    companies: Array<CompanyModel>;
    count: number;
    page: number;
    limit: number;
  }> {
    const [companys, count] = await this.companyRepository.FindAndCount(
      {},
      GetPaginationOptions(data)
    );
    return {
      companies: companys,
      count: count,
      page: data.page,
      limit: data.limit,
    };
  }

  public async UploadCompanyImage(user: IRedisUserModel, image) {
    try {
      let companyModel = await this.companyRepository.FindById(user.company_id);
      if (companyModel.image_url) {
        const imageUrl = companyModel.image_url.split("?")[0];
        DeleteAWSFile(imageUrl.substr(imageUrl.lastIndexOf("/") + 1));
      }
      await this.companyRepository.Update(
        { Id: user.company_id },
        { image_url: image.location }
      );
      return { Id: companyModel.Id, image_url: image.location };
    } catch (error) {
      throw new InternalServerError(error);
    }
  }

  public async GetAllCompanies(data: GetCompaniesRequest) {
    const { companies, count } = await this.companyRepository.GetAllCompanies(
      data
    );
    return {
      companies: companies,
      count: count,
      page: data.page,
      limit: data.limit,
    };
  }

  public async GetCompanyDetails(companyId: number) {
    let company: CompanyModel = await this.companyRepository.FindCompanyById(companyId);

    if (!company) {
      throw new BadRequestException("Company not found");
    }

    const [owner, sso_enabled_companies] = await Promise.all([
      this.userRepository.FindById(company.owner_id),
      this.ssoEnabledCompaniesRepository.FindOne({ company_id: companyId }),
    ]);

    company["quickbookCustomer"] = [];
    company.sso_company = sso_enabled_companies;

    if (company.quickbook_id && company.quickbook_id !== "0") {
      const quickbookCustomer = await this.quickBookService.GetCustomers({
        customer_Id: +company.quickbook_id,
      });
      company["quickbookCustomer"] =
        quickbookCustomer["QueryResponse"].Customer || [];
    }

    company["owner"] = owner;

    return company;
  }

  public async SoftDeleteCompany(companyId) {
    const company = await this.companyRepository.FindOne({ Id: companyId });

    if (!company) {
      throw new BadRequestException("Company Id is invalid");
    }

    const delete_sso = this.ssoEnabledCompaniesRepository.Delete(
      { company_id: companyId },
      false
    );
    const delete_company = this.companyRepository.Update(
      { Id: companyId },
      { is_deleted: 1, deleted_at: new Date() }
    );
    const pauseCollectionPromise = this.subscriptionService.PauseCollection(company.Id);

    await Promise.all([delete_sso, delete_company, pauseCollectionPromise]);

    return {};
  }

  public async ReActivateCompany(companyId) {
    const company = await this.companyRepository.FindOne({ Id: companyId });

    if (!company) {
      throw new BadRequestException("Company Id is invalid");
    }

    await this.companyRepository.Update(
      { Id: companyId },
      { is_deleted: 0, deleted_at: null }
    );

    return company;
  }

  public async UpdateMfaStatus(companyId, is_mfa_enabled: Boolean) {
    let userList = await this.userRepository.getMfaSecretAgainstCompany(
      companyId
    );
    await this.userRepository.Update(
      { company_id: companyId },
      { is_mfa_enabled, mfa_secret_id: null }
    );
    const secrets = userList.map((u) => u.mfa_secret).map((s) => s.secret);

    await this.mfaSecretRepository.Delete(
      {
        secret: In(secrets),
      },
      false
    );
    return null;
  }

  public async AllowMfaToCompany(companyId) {
    const company = await this.companyRepository.FindOne({ Id: companyId });

    if (!company) {
      throw new BadRequestException("Company Id is invalid");
    }
    const mfaEnabledcompaniesModel = new MfaEnabledCompaniesModel();
    mfaEnabledcompaniesModel.company_id = companyId;
    await this.mfaEnabledCompaniesRepository.Create(mfaEnabledcompaniesModel);

    return { message: "MFA enabled for the requested company" };
  }

  public async GetAllowedMfaCompany(companyId) {
    let company =
      await this.mfaEnabledCompaniesRepository.GetOneMfaAllowedCompany(
        companyId
      );
    if (!company.length) {
      throw new BadRequestException("MFA permission not found");
    }
    return company;
  }

  public async GetAllowedMfaCompanies() {
    let company =
      await this.mfaEnabledCompaniesRepository.GetAllMfaAllowedCompanies();
    if (!company) {
      throw new BadRequestException("None of the company is allowed to enable MFA");
    }
    return company;
  }

  public async DeleteAllowedMfaCompany(companyId) {
    const company = await this.GetAllowedMfaCompany(companyId);
    await this.mfaEnabledCompaniesRepository.Delete(
      { company_id: companyId },
      false
    );
    return { message: "MFA disabled for the requested company." };
  }

  public async SetSsoCredentials(
    companyId: number,
    data: SsoCredentialsRequest,
    certificate?: any,
  ) {
    const company = await this.companyRepository.FindOne(
      { Id: companyId },
      { relations: ["sso_company"] }
    );

    if (!company) {
      throw new BadRequestException("Company not found");
    }

    let ssoEnabledCompany = company.sso_company;
    if (!ssoEnabledCompany) {
      if (!data.tenant_id || !data.azure_issuer || !certificate) {
        throw new BadRequestException("tenant_id, azure_issuer, or certificate not given.");
      }
      ssoEnabledCompany = new SsoEnabledCompaniesModel();
      ssoEnabledCompany.company_id = companyId;
    }

    if (data.tenant_id) {
      ssoEnabledCompany.tenant_id = data.tenant_id;
    }

    if (data.azure_issuer) {
      ssoEnabledCompany.azure_issuer = data.azure_issuer;
    }

    if (certificate) {
      if (ssoEnabledCompany.certificate_url) {
        DeleteAWSFile(
          ssoEnabledCompany.certificate_url.substr(
            ssoEnabledCompany.certificate_url.lastIndexOf("/") + 1
          )
        );
      }
      ssoEnabledCompany.certificate_url = certificate.location;
    }

    company.sso_company = await this.ssoEnabledCompaniesRepository.Save(
      ssoEnabledCompany
    );

    if (data.sso_allowed != null) {
      await this.companyRepository.Update(
        { Id: companyId },
        { sso_allowed: data.sso_allowed }
      );
    }

    const key = GetFileKey(ssoEnabledCompany.certificate_url);
    company.sso_company.certificate_url = await GetAWSSignedUrl(key);

    return company;
  }

  /* Deprecated */
  public async UploadSsoCertificate(companyId: number, certificate?: any) {
    const company = await this.companyRepository.FindOne(
      { Id: companyId },
      { relations: ["sso_company"] }
    );

    if (!company) {
      throw new BadRequestException("Company not found");
    }

    let ssoEnabledCompany = company.sso_company;
    if (!ssoEnabledCompany) {
      if (!certificate) {
        throw new BadRequestException("certificate not given.");
      }
    }

    if (ssoEnabledCompany.certificate_url) {
      DeleteAWSFile(
        ssoEnabledCompany.certificate_url.substr(
          ssoEnabledCompany.certificate_url.lastIndexOf("/") + 1
        )
      );
    }
    ssoEnabledCompany.certificate_url = certificate.location;

    await this.ssoEnabledCompaniesRepository.Update(
      { company_id: companyId },
      { certificate_url: certificate.location }
    );

    const key = GetFileKey(company.sso_company.certificate_url);
    company.sso_company.certificate_url = await GetAWSSignedUrl(key);

    return company;
  }

  public async CreateSubdomain(
    company_id: number,
    data: CreateSubdomainRequest
  ) {
    if (!appEnv("ROUTE53_ENABLED", false)) {
      throw new BadRequestException("Route53 is not enabled");
    }

    const companyPromise = this.companyRepository.FindOne(
      { Id: company_id },
      { relations: ["company_user_license"] }
    );

    const culPromise = this.companyUserLicenseRepository.GetCompaniesBySubDomain(data.subdomain);

    const [company, cul] = await Promise.all([companyPromise, culPromise]);

    if (!company) {
      throw new BadRequestException("Company not found");
    }

    const { settings } = company.company_user_license[0];

    if (settings.subdomains.includes(data.subdomain)) {
      throw new BadRequestException("Subdomain already exists");
    }

    if (!cul.length) {
      await CreateSubdomain(data.subdomain);
    }

    settings.subdomains.push(data.subdomain);

    await this.companyUserLicenseRepository.Update({ company_id }, { settings });

    return settings.subdomains;
  }

  public async DeleteSubdomain(
    company_id: number,
    data: CreateSubdomainRequest
  ) {
    if (!appEnv("ROUTE53_ENABLED", false)) {
      throw new BadRequestException("Route53 is not enabled");
    }

    const company = await this.companyRepository.FindOne(
      { Id: company_id },
      { relations: ["company_user_license"] }
    );

    if (!company) {
      throw new BadRequestException("Company not found");
    }

    const { settings } = company.company_user_license[0];
    if (!settings.subdomains.includes(data.subdomain)) {
      throw new BadRequestException("Subdomain not found");
    }

    settings.subdomains = settings.subdomains.filter(
      (subdomain) => subdomain != data.subdomain
    );

    await Promise.all([
      this.companyUserLicenseRepository.Update({ company_id }, { settings }),
      // DeleteSubdomain(data.subdomain),
    ]);

    return settings.subdomains;
  }

  public async GetCompanyWithSelect(companyId: number, select: string[]) {
    select = ["Id", ...select];
    return this.companyRepository.FindOne({ Id: companyId }, { select });
  }

  public async ExportCompanyData(companyId: number) {
    const company = await this.companyRepository.FindById(companyId, {
      relations: ["company_user_license"],
    });

    if (!company) {
      throw new BadRequestException("Company not found");
    }

    const subdomain = company.company_user_license[0].settings.subdomains.find(
      (sd) => sd != "app"
    );

    const workbook = new Excel.Workbook();
    workbook.creator = "System";
    workbook.lastModifiedBy = "System";
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.lastPrinted = new Date();

    const subdomainGroup = SubdomainMap[subdomain] || "default";

    await Promise.all([
      this.AddUserBASheet(workbook, company, subdomainGroup),
      this.AddBusinessAreaSheet(workbook, company, subdomainGroup),
      this.AddLocationSheet(workbook, company, subdomainGroup),
      this.AddAudienceSheet(workbook, company, subdomainGroup),
      this.AddChannelSheet(workbook, company, subdomainGroup),
      this.AddFolderSheet(workbook, company),
    ]);

    workbook.eachSheet((sheet) => {
      sheet.views = [ { state: "frozen", xSplit: 0, ySplit: 1 } ]; // freeze first row (title row)
      sheet.getRow(1).font = { bold: true }; // title rows to bold
      sheet.eachRow((row) => {
        row.eachCell((cell) => {
          if (!cell.font?.size) {
            cell.font = Object.assign(cell.font || {}, { size: 10 });
          }
          if (!cell.font?.name) {
            cell.font = Object.assign(cell.font || {}, { name: "Arial" });
          }
        });
      });
    });

    return await workbook.xlsx.writeBuffer();
  }

  private async AddUserBASheet(
    workbook: Excel.Workbook,
    company: CompanyModel,
    subdomain: string
  ) {
    const businessAreaTranslation = DomainConstants[subdomain].BusinessArea;

    const worksheet = workbook.addWorksheet(`User ${businessAreaTranslation}s`);

    const userData = await this.companyRepository.GetUsersForExport(company.Id);

    worksheet.columns = [
      { header: "User Id", key: "User Id", width: 15 },
      { header: "Name", key: "Name", width: 20 },
      { header: "Email", key: "Email", width: 25 },
      { header: "Role", key: "Role", width: 15 },
      { header: businessAreaTranslation, key: "Business Area", width: 40 },
      { header: "Permission", key: "Permission", width: 15 },
      { header: "Last Login", key: "Last Login", width: 20 },
      { header: "Invited On", key: "Invited On", width: 20 },
      { header: "Plan Created", key: "Plan Created", width: 20 },
      { header: "Plan Owner", key: "Plan Owner", width: 20 },
      { header: "Plan Team", key: "Plan Team", width: 20 },
      { header: "Comms Created", key: "Comms Created", width: 20 },
      { header: "Comms Owner", key: "Comms Owner", width: 20 },
      { header: "Comms Team", key: "Comms Team", width: 20 },
      { header: "Task Assigned To", key: "Task Assigned To", width: 20 },
    ];

    let currentRow = 2;
    userData.forEach((user) => {
      worksheet.addRow(user);

      let i = 0,
        baCount = user["Business Area"].length;
      for (; i < baCount; i++) {
        worksheet.getCell(currentRow + i, 5).value =
          user["Business Area"][i] ?? "";
        worksheet.getCell(currentRow + i, 6).value =
          user["Permission"][i] ?? "";
      }

      // merge cells except BA and Permission
      worksheet.columns.forEach((col) => {
        if (["Business Area", "Permission"].includes(col.key)) return;
        const range = `${col.letter}${currentRow}:${col.letter}${
          currentRow + i - 1
        }`;
        worksheet.mergeCells(range);
      });

      currentRow += i;
    });

    return;
  }

  private async AddBusinessAreaSheet(
    workbook: Excel.Workbook,
    company: CompanyModel,
    subdomain: string
  ) {
    const businessAreaTranslation = DomainConstants[subdomain].BusinessArea;

    const worksheet = workbook.addWorksheet(businessAreaTranslation + "s");

    const businessAreaData =
      await this.companyRepository.GetBusinessAreasForExport(company.Id);

    worksheet.columns = [
      {
        header: `Primary ${businessAreaTranslation}s`,
        key: "Primary Business Areas",
        width: 50,
      },
      {
        header: `Secondary ${businessAreaTranslation}s`,
        key: "Secondary Business Areas",
        width: 50,
      },
      {
        header: `Tertiary ${businessAreaTranslation}s`,
        key: "Tertiary Business Areas",
        width: 50,
      },
    ];

    // insert temprorary data to fix cell merging
    businessAreaData.push({
      "Primary Business Areas": "TEMP",
      "Secondary Business Areas": "TEMP",
    });

    worksheet.addRows(businessAreaData);

    MergeCells(worksheet, businessAreaData, worksheet.columns[0], "ba1_id");
    MergeCells(worksheet, businessAreaData, worksheet.columns[1], "ba2_id");

    // remove the last row (temporary data)
    worksheet.spliceRows(businessAreaData.length + 1, 1);

    return;
  }

  private async AddLocationSheet(
    workbook: Excel.Workbook,
    company: CompanyModel,
    subdomain: string
  ) {
    const locationTranslation = DomainConstants[subdomain].Location;

    const worksheet = workbook.addWorksheet(locationTranslation + "s");

    const locationData = await this.companyRepository.GetLocationsForExport(
      company.Id
    );

    worksheet.columns = [
      {
        header: `Primary ${locationTranslation}`,
        key: "Primary Location",
        width: 50,
      },
      {
        header: `Secondary ${locationTranslation}`,
        key: "Secondary Location",
        width: 50,
      },
      {
        header: `Tertiary ${locationTranslation}`,
        key: "Tertiary Location",
        width: 50,
      },
    ];

    // insert temprorary data to fix cell merging
    locationData.push({
      "Primary Location": "TEMP",
      "Secondary Location": "TEMP",
    });

    worksheet.addRows(locationData);

    MergeCells(worksheet, locationData, worksheet.columns[0], "loc1_id");
    MergeCells(worksheet, locationData, worksheet.columns[1], "loc2_id");

    // remove the last row (temporary data)
    worksheet.spliceRows(locationData.length + 1, 1);

    return;
  }

  public async AddAudienceSheet(
    workbook: Excel.Workbook,
    company: CompanyModel,
    subdomain: string
  ) {
    const businessAreaTranslation = DomainConstants[subdomain].BusinessArea;

    const worksheet = workbook.addWorksheet("Audiences");

    const audienceData = await this.companyRepository.GetAudiencesForExport(
      company.Id
    );

    worksheet.columns = [
      { header: "Audience", key: "Audience", width: 50 },
      { header: businessAreaTranslation, key: "Business Area", width: 50 },
    ];

    // insert temprorary data to fix cell merging
    audienceData.push({
      Audience: "TEMP",
    });

    worksheet.addRows(audienceData);

    MergeCells(worksheet, audienceData, worksheet.columns[0], "Id");

    // remove the last row (temporary data)
    worksheet.spliceRows(audienceData.length + 1, 1);

    return;
  }

  public async AddChannelSheet(
    workbook: Excel.Workbook,
    company: CompanyModel,
    subdomain: string
  ) {
    const businessAreaTranslation = DomainConstants[subdomain].BusinessArea;

    const worksheet = workbook.addWorksheet("Channels");

    const channelData = await this.companyRepository.GetChannelsForExport(
      company.Id
    );

    worksheet.columns = [
      { header: "Channel", key: "Channel", width: 50 },
      { header: "Description", key: "Description", width: 50 },
      { header: "Archive", key: "Archive", width: 20 },
      { header: businessAreaTranslation, key: "Business Area", width: 50 },
    ];

    // insert temprorary data to fix cell merging
    channelData.push({
      Channel: "TEMP",
      Description: "TEMP",
      Archive: "TEMP",
    });

    worksheet.addRows(channelData);

    MergeCells(worksheet, channelData, worksheet.columns[0], "Id");
    MergeCells(worksheet, channelData, worksheet.columns[2], "Id");

    // remove the last row (temporary data)
    worksheet.spliceRows(channelData.length + 1, 1);

    return;
  }

  public async AddFolderSheet(workbook: Excel.Workbook, company: CompanyModel) {
    // Todo
  }

  public async UpdatePOPSubtitles(data: UpdatePOPSubtitlesRequest, companyId: number) {
    const cul = await this.companyUserLicenseRepository.FindOne({
      company_id: companyId,
    });

    if (!cul) {
      throw new BadRequestException("Company not found");
    }

    cul.pop_subtitles = data;
    await this.companyUserLicenseRepository.Update(
      { company_id: cul.company_id },
      {
        pop_subtitles: cul.pop_subtitles
      }
    );

    return cul;
  }

  public async ScheduledCompanyDeletion() {
    const companies = await this.companyRepository.Find({
      is_deleted: 1,
      deleted_at: LessThanOrEqual(
        moment().subtract(+appEnv("COMPANY_RETENTION_DAYS", 60), "days").toDate()
      ),
    });

    if (!companies.length) {
      return;
    }

    // Cancels subscription of non-enterprise companies at Stripe
    await Promise.all(
      companies.map(async (company) => {
        await this.subscriptionService.CancelImmediately(company.Id);
      })
    );

    // Delete ActiveCampaign contacts of owner
    await Promise.all(
      companies.map(async (company) => {
        const owner = await this.userRepository.FindOne({
          role: UserRoles.Owner,
          ac_contact_id: Not(IsNull()),
          company_id: company.Id,
        });

        if (owner) {
          await this.activeCampaignService.DeleteContact(owner.ac_contact_id);
        }
      })
    );

    await this.companyRepository.DeleteCompany(companies);

    return true;
  }
}
