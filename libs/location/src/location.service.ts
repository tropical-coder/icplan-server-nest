import { BadRequestException } from "routing-controllers";
import { LocationRepository } from "../../repository/location/LocationRepository";

import { LocationModel } from "../../model/location/LocationModel";
import {
  CreateLocationRequest,
  UpdateLocationRequest,
  LocationSearchRequest,
  UpdateLocationsRequest,
  CreateSubLocationRequest,
  GetLocationRequest,
} from "../../../api/controller/location/LocationRequest";
import { PaginationParam } from "../../controller/base/BaseRequest";
import { In } from "typeorm";
import { IRedisUserModel } from "../../model/user/UserModel";
import { IRedisAdminModel } from "../../model/admin/AdminModel";
import { DomainConstants } from "../../constant/DomainConstants";
import { CompanySettingsService } from "../company/CompanySettingsService";

@Injectable()
export class LocationService {
  constructor(
    private locationRepository: LocationRepository,
    private companySettingsService: CompanySettingsService,
  ) {}

  public async fetchLocations(
    locationIds: Array<number>,
    companyId: number,
    select?: string[]
  ) {
    let locationPromise: Promise<LocationModel[]> = new Promise((resolve) => {
      resolve([]);
    });

    if (locationIds && locationIds.length > 0) {
      locationPromise = this.locationRepository.Find(
        {
          Id: In(locationIds),
          company_id: companyId,
        },
        null,
        select
      );
    }

    return locationPromise;
  }

  public async CreateLocation(
    data: CreateLocationRequest,
    user: IRedisUserModel,
    subdomain: string
  ): Promise<LocationModel> {
    let location = await this.locationRepository.FindOne({
      name: data.name,
      company_id: user.company_id,
    });

    if (location) {
      const message = "This Location name already exists.".replace(
        "Location",
        DomainConstants[subdomain].Location
      );
      throw new BadRequestException(message);
    }

    let parentLocationModel = new LocationModel();
    parentLocationModel.name = data.name;
    parentLocationModel.company_id = user.company_id;
    const parentLocation = await this.locationRepository.Create(
      parentLocationModel
    );

    await this.locationRepository.InsertUserLocation(user.Id, parentLocation.Id);

    this.companySettingsService.CheckCompanySettingsCompleted(user.company_id);

    return parentLocation;
  }

  public async CreateSubLocation(
    data: CreateSubLocationRequest,
    parentLocationId: number,
    user: IRedisUserModel,
    subdomain: string
  ): Promise<LocationModel> {
    let location = await this.locationRepository.FindOne({
      name: data.name,
      company_id: user.company_id,
    });

    if (location) {
      const message = "This Location name already exists.".replace(
        "Location",
        DomainConstants[subdomain].Location
      );
      throw new BadRequestException(message);
    }

    let subLocationModel = new LocationModel();
    subLocationModel.name = data.name;
    subLocationModel.parent_id = parentLocationId;
    subLocationModel.company_id = user.company_id;
    const parentLocation = await this.locationRepository.Create(
      subLocationModel
    );

    return parentLocation;
  }

  public async UpdateLocation(
    locationId: number,
    data: UpdateLocationRequest,
    user: IRedisUserModel,
    subdomain: string
  ) {
    let locations = await this.locationRepository.Find({
      name: data.name,
      company_id: user.company_id,
    });

    if (locations) {
      if (locations.find((loc) => loc.Id != locationId)) {
        const message = "This Location name already exists.".replace(
          "Location",
          DomainConstants[subdomain].Location
        );
        throw new BadRequestException(message);
      }
    }

    let locationModel: LocationModel = await this.locationRepository.FindOne({
      Id: locationId,
    });

    if (!locationModel) {
      throw new BadRequestException("Not Found");
    }

    locationModel.name = data.name || locationModel.name;
    await this.locationRepository.Save(locationModel);

    return { location: locationModel };
  }

  public async UpdateLocations(data: UpdateLocationsRequest) {
    let locations = [];
    for (let index = 0, len = data.locations.length; index < len; index++) {
      let locationModel: LocationModel = await this.locationRepository.FindOne({
        Id: data.locations[index].Id,
      });
      if (!locationModel) {
        continue;
      }
      locationModel.name = data.locations[index].name
        ? data.locations[index].name
        : locationModel.name;
      await this.locationRepository.Save(locationModel);
      locations.push(locationModel);
    }

    return { locations: locations };
  }

  public async DeleteLocation(locationIds: number[], user: IRedisUserModel) {
    await this.locationRepository.DeleteLocation(locationIds, user.company_id);
    return null;
  }

  public async GetLocation(locationId: number): Promise<LocationModel> {
    return await this.locationRepository.FindById(locationId);
  }

  public async GetLocations(
    data: GetLocationRequest,
    user: IRedisUserModel | IRedisAdminModel
  ): Promise<{
    locations: number | any[];
    count: number | any[];
    page: number;
    limit: number;
  }> {
    const [locations, count] = await this.locationRepository.GetLocations(
      data,
      user
    );
    return {
      locations: locations,
      count: count,
      page: data.page,
      limit: data.limit,
    };
  }

  public async SearchLocations(
    data: LocationSearchRequest,
    user: IRedisUserModel
  ): Promise<{ locations: Array<LocationModel>; page: number; limit: number }> {
    const locations = await this.locationRepository.SearchLocation(data, user);
    return { locations: locations, page: data.page, limit: data.limit };
  }

  public async SearchFlatLocations(
    data: LocationSearchRequest,
    user: IRedisUserModel
  ): Promise<{ locations: Array<LocationModel>; page: number; limit: number }> {
    const locations = await this.locationRepository.SearchFlatLocation(
      data,
      user.company_id
    );
    return { locations: locations, page: data.page, limit: data.limit };
  }

  public async GetAllLocationsLevels(locations, companyId: number) {
    const locationsIds = await this.locationRepository.GetAllLocationsLevels(
      locations,
      companyId
    );
    return locationsIds;
  }

  public async GetLocationByCommunicationId(communicationId: number, select?: Array<string>) {
    return await this.locationRepository.GetLocationByCommunicationId(
      communicationId,
      select
    );
  }
}
