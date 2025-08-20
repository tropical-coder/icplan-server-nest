import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AdministratorRepository } from './repository/administrator.repository';
import { RedisService } from '@app/common/services/redis.service';
import { InternalServerException } from '@aws-sdk/client-bedrock-runtime';
import { AdminModel, AdminRole, IRedisAdminModel } from './entities/administrator.entity';
import { AddAdminRequest, GetAdminRequest, LoginAdminRequest, UpdateAdminRequest, ValidatePhoneNumberRequest } from './dtos/administrator.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Comparepassword, GetPaginationOptions, GetVerificationCode, Hashpassword } from '@app/common/helpers/misc.helper';

@Injectable()
export class AdministratorService {
  constructor(
    private adminRepository: AdministratorRepository,
    private redisService: RedisService,
    private jwtService: JwtService,
    private configService: ConfigService,
    //private mailService: MailService
  ) {}

  private generateToken(redisAdmin: IRedisAdminModel): string {
    return this.jwtService.sign(JSON.stringify(redisAdmin));
  } 

  private async setSession(
    key: string,
    redisAdmin: IRedisAdminModel,
  ): Promise<boolean> {

    return true;
  }

  private async SendVerificationCode(email, phoneNumber) {
    try {
      let verificationCode =
        this.configService.get('ENVIRONMENT') === 'staging'
          ? 1234
          : GetVerificationCode();

      const replacements = {
        VerificationCode: verificationCode,
      };

      const mailOptions = {
        to: email,
        subject: 'ICPlan Admin OTP',
        from: 'no-reply@icplan.com',
      };

      // await this.mailService.SendMail(
      //   "verification-code.html",
      //   replacements,
      //   mailOptions,
      //   "default"
      // );

      const key = `${email}-${phoneNumber}`;
      await this.redisService.Set(key, verificationCode, 60 * 60); // 1h
    } catch (err) {
      console.error(err);
      throw new Error(
        'Something went wrong, please try agian later.',
      );
    }
  }

  public async ValidatePhoneNumber(
    data: ValidatePhoneNumberRequest,
  ): Promise<{ full_name: string }> {
    const admin = await this.adminRepository.FindOne(
      { email: data.email },
      {
        select: [
          'Id',
          'full_name',
          'country_code',
          'phone_number',
          'email',
          'password',
          'is_active',
        ],
      },
    );

    if (!admin) {
      throw new BadRequestException('Email or password is incorrect.');
    } else if (!admin.is_active) {
      throw new BadRequestException('Your account is suspended.');
    }

    const passwordIsValid = await Comparepassword(
      data.password,
      admin.password,
    );
    if (!passwordIsValid) {
      throw new BadRequestException('Password is incorrect.');
    }

    let phoneNumber = admin.country_code.concat(admin.phone_number);
    await this.SendVerificationCode(admin.email, phoneNumber);

    return { full_name: admin.full_name };
  }

  public async LoginAdmin(data: LoginAdminRequest) {
    const admin = await this.adminRepository.FindOne(
      { email: data.email },
      {
        select: [
          'Id',
          'full_name',
          'country_code',
          'phone_number',
          'email',
          'password',
          'is_active',
          'role',
        ],
      },
    );

    if (!admin) {
      throw new BadRequestException('Email or password is incorrect.');
    } else if (!admin.is_active) {
      throw new BadRequestException('Your account is suspended.');
    }

    const passwordIsValid = await Comparepassword(
      data.password,
      admin.password,
    );
    if (!passwordIsValid) {
      throw new BadRequestException('Password is incorrect.');
    }

    const phoneNumber = admin.country_code.concat(admin.phone_number);

    const validationCode = await this.redisService.Get(
      `${data.email}-${phoneNumber}`,
    );

    if (validationCode != data.verification_code) {
      throw new BadRequestException('Verification Code invalid');
    }

    delete admin['password'];
    const redisAdmin: IRedisAdminModel = {
      Id: admin.Id,
      role: admin.role,
    };

    const token = this.generateToken(redisAdmin);
    const expiry = +this.configService.get(
      'ADMIN_SESSION_TIMEOUT',
      60 * 60 * 2,
    ); // 2h

    await this.redisService.Set(
      `admin:${admin.Id}:${token}`,
      JSON.stringify(redisAdmin),
      expiry,
    );


    return { admin: admin, token: token };
  }

  public async LogOutAdmin(admin: IRedisAdminModel): Promise<void> {
    //Delete sessions of admin from Redis
    const tokenList: any = await this.redisService.GetKeys(`admin:${admin.Id}:*`);
    await this.redisService.Delete(tokenList);
  }

  public async GetAdminFromToken(token: string): Promise<IRedisAdminModel> {
    const redisAdmin = this.jwtService.decode<IRedisAdminModel>(token);

    const rawData = await this.redisService.Get(
      `admin:${redisAdmin.Id}:${token}`,
    );
    if (!rawData) throw new UnauthorizedException("Invalid token");
    return JSON.parse(rawData);
  }

  public async GetAdmins(params: GetAdminRequest) {
    const admins = await this.adminRepository.GetAdmins(
      params,
      GetPaginationOptions(params),
    );
    return admins;
  }

  public async GetAdminById(adminId: number) {
    const admin = await this.adminRepository.FindOne({ Id: adminId });
    return admin;
  }

  public async UpdateAdmin(adminId: number, data: UpdateAdminRequest) {
    let adminModel = await this.adminRepository.FindOne({ Id: adminId });

    if (!adminModel) {
      throw new BadRequestException('Invalid admin id.');
    }

    adminModel.is_active = data.is_active;
    adminModel.full_name = data.full_name;
    adminModel.country_code = data.country_code;
    adminModel.phone_number = data.phone_number.replace(/^0+/, '');

    if (data.password) {
      adminModel.password = await Hashpassword(data.password);
    }

    adminModel = await this.adminRepository.Create(adminModel);
    return adminModel;
  }

  public async AddAdmin(data: AddAdminRequest) {
    const admin = await this.adminRepository.FindOne({
      email: data.email,
      is_deleted: 0,
    });

    if (admin) {
      throw new BadRequestException(
        'Admin with provided email already exists.',
      );
    }

    let adminModel = new AdminModel();
    adminModel.is_active = data.is_active;
    adminModel.full_name = data.full_name;
    adminModel.country_code = data.country_code;
    adminModel.phone_number = data.phone_number.replace(/^0+/, '');
    adminModel.email = data.email;
    adminModel.password = await Hashpassword(data.password);

    adminModel = await this.adminRepository.Create(adminModel);

    delete adminModel['password'];
    return adminModel;
  }

  public async DeleteAdminById(adminId: number) {
    let adminModel = await this.adminRepository.FindOne({ Id: adminId });

    if (!adminModel || adminModel.role == AdminRole.SuperAdmin) {
      throw new BadRequestException('Invalid admin id.');
    }

    await this.adminRepository.DeleteById(adminId);

    return null;
  }
}
