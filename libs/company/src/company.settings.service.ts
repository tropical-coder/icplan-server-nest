import { UserRepository } from "@app/user/user.repository";
import { Injectable } from "@nestjs/common";
import { CompanyRepository, CompanyRepository } from "./company.repository";
import { UserRoles } from "@app/user/entities/user.entity";

/**
 * Created separate service, because of circular dependency issue
 */
@Injectable()
export class CompanySettingsService {
  constructor(
    private userRepository: UserRepository,
    private companyRepository: CompanyRepository,
    private activeCampaignService: ActiveCampaignService,
  ) {}

  public async CheckCompanySettingsCompleted(companyId: number) {
    const [owner, company] = await Promise.all([
      this.userRepository.FindOne(
        {
          role: UserRoles.Owner,
          company_id: companyId,
          ac_contact_id: Not(IsNull()),
        },
        { select: ["Id", "ac_contact_id"] }
      ),
      this.companyRepository.GetCompanyWithCounts(companyId),
    ]);

    if (
      company.business_area_count &&
      company.location_count &&
      company.audience_count &&
      company.channel_count &&
      company.strategic_priority_count &&
      owner && owner.ac_contact_id
    ) {
      await this.activeCampaignService.RemoveTagFromContact(
        owner.ac_contact_id,
        appEnv("AC_TAG_COMPANY_SETTINGS_NOT_COMPLETED")
      );
      return true;
    }
  }
}
