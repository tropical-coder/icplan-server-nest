import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { BaseRepository } from "@app/common/base/base.repository";
import { IRedisAdminModel } from "@app/administrator/entities/administrator.entity";
import { GetPaginationOptions } from "@app/common/helpers/misc.helper";
import { IRedisUserModel, UserRoles } from "@app/user/entities/user.entity";
import { LocationSearchRequest } from "@app/location/dtos/location.dto";
import { LocationModel } from "@app/location/entities/location.entity";


@Injectable()
export class LocationRepository extends BaseRepository<LocationModel> {
  constructor(
    @InjectRepository(LocationModel)
    private locationModelRepository: Repository<LocationModel>,
  ) {
    super(locationModelRepository);
  }

  public async GetLocations(data, user: IRedisUserModel | IRedisAdminModel) {
    const paginationParam = GetPaginationOptions(data);
    let locationQB = this.Repository.createQueryBuilder("location")
      .leftJoinAndSelect("location.sub_location", "sub_location")
      .leftJoinAndSelect("sub_location.sub_location", "sub_sub_location")
      .leftJoinAndSelect(
        "sub_sub_location.sub_location",
        "sub_sub_sub_location"
      )
      .where(
        `
        (location.company_id = ${user["company_id"]})
      `
      );

    if (user["role"] != UserRoles.Owner && !user["isAdmin"]) {
      locationQB.andWhere(
        `(
					location."Id" IN (
						SELECT location_id
						FROM user_location
						WHERE user_id = ${user.Id}
					)
				)`
      );
    } else {
      locationQB.andWhere(`location.parent_id IS NULL`);
    }

    if (data.name) {
      locationQB.andWhere(`location.name ILIKE :name`, { name: `%${data.name}%` })
    }

    const [location, count] = await locationQB
      .orderBy("location.name")
      .addOrderBy("sub_location.name")
      .addOrderBy("sub_sub_location.name")
      .addOrderBy("sub_sub_sub_location.name")
      .skip(paginationParam.offset)
      .take(paginationParam.limit)
      .getManyAndCount();

    return [location, count];
  }

  public async SearchLocation(
    data: LocationSearchRequest,
    user: IRedisUserModel
  ) {
    const paginationParam = GetPaginationOptions(data);
    let locationQB = this.Repository.createQueryBuilder("location")
      .leftJoinAndSelect("location.sub_location", "sub_location")
      .leftJoinAndSelect("sub_location.sub_location", "sub_sub_location")
      .leftJoinAndSelect(
        "sub_sub_location.sub_location",
        "sub_sub_sub_location"
      )
      .where(
        `(
          (LOWER(location.name) LIKE :name
            AND location.company_id = ${user.company_id})
          OR (LOWER(sub_location.name) LIKE :name
            AND sub_location.company_id = ${user.company_id})
          OR (LOWER(sub_sub_location.name) LIKE :name
            AND sub_sub_location.company_id = ${user.company_id})
          OR (LOWER(sub_sub_sub_location.name) LIKE :name
            AND sub_sub_sub_location.company_id = ${user.company_id})
        )
      `,
        { name: data.location ? `%${data.location.toLowerCase()}%` : "%%" }
      );

    if (user.role != UserRoles.Owner) {
      locationQB.andWhere(
        `(
					location."Id" IN (
						SELECT location_id
						FROM user_location
						WHERE user_id = ${user.Id}
					)
				)`
      );
    } else {
      locationQB.andWhere(`location.parent_id IS NULL`);
    }

    const location = await locationQB
      .offset(paginationParam.offset)
      .limit(paginationParam.limit)
      .orderBy("location.name")
      .addOrderBy("sub_location.name")
      .addOrderBy("sub_sub_location.name")
      .addOrderBy("sub_sub_sub_location.name")
      .getMany();

    return location;
  }

  public async SearchFlatLocation(data: LocationSearchRequest, company_id) {
    const paginationParam = GetPaginationOptions(data);
    const locations = await this.Repository.query(`
      SELECT
        DISTINCT loc."Id", loc.name, loc.parent_id
      FROM
        location loc
      WHERE
        LOWER(loc.name) LIKE LOWER('%${data.location}%')
        AND loc.company_id = ${company_id}
      ORDER BY loc.name ASC, loc.parent_id ASC
      OFFSET ${paginationParam.offset}
      LIMIT ${paginationParam.limit};
    `);

    return locations;
  }

  public async DeleteLocation(
    locationIds: number[], 
    companyId: number
  ) {
    await this.Repository.query(`
			WITH RECURSIVE
				starting ("Id", "name", parent_id) AS
				(
					SELECT t."Id", t.name, t.parent_id
					FROM "location" AS t
					WHERE t."Id" IN ($1)
				),
				descendants ("Id", "name", parent_id) AS
				(
					SELECT t."Id", t.name, t.parent_id
					FROM starting  AS t
					UNION ALL
					SELECT t."Id", t.name, t.parent_id
					FROM "location" AS t JOIN descendants AS d ON t.parent_id = d."Id"
				)
			DELETE FROM "location"
			WHERE "Id" IN (SELECT "Id" FROM descendants) AND company_id = $2;
		  `,
      [locationIds.join(","), companyId]
    );

    return;
  }

  public async GetAllLocationsLevels(locations, companyId) {
    let allLocations = [];
    if (locations) {
      allLocations = await this.Repository.query(`
				WITH RECURSIVE
					starting ("Id", "name", parent_id) AS
					(
						SELECT t."Id", t.name, t.parent_id
						FROM "location" AS t
						WHERE t."Id" IN (${locations.join(",")})
					),
					descendants ("Id", "name", parent_id) AS
					(
						SELECT t."Id", t.name, t.parent_id
						FROM starting  AS t
						UNION ALL
						SELECT t."Id", t.name, t.parent_id
						FROM "location" AS t JOIN descendants AS d ON t.parent_id = d."Id"
					),
					ancestors ("Id", name, parent_id) AS
					(
						SELECT t."Id", t.name, t.parent_id
						FROM "location" AS t
						WHERE t."Id" IN (SELECT parent_id FROM starting)
						UNION ALL
						SELECT t."Id", t.name, t.parent_id
						FROM "location" AS t JOIN ancestors AS a ON t."Id" = a.parent_id
					)
				SELECT "Id" from "location"
				WHERE "Id" IN (
					SELECT "Id" FROM descendants
					UNION ALL
					SELECT "Id" FROM ancestors
				) AND company_id = ${companyId};
			`);
    }

    return allLocations;
  }

  public async InsertUserLocation(user_id: number, location_id: number) {
    const insertQB = this.Repository.createQueryBuilder()
      .insert()
      .into("user_location")
      .values([{ user_id, location_id }]);

    await insertQB.execute();

    return true;
  }

  public async GetLocationByCommunicationId(communicationId: number, select = []) {
    select.push("location.Id");
    return await this.Repository.createQueryBuilder("location")
      .select(select)
      .innerJoin(
        "communication_location",
        "cl",
        "cl.location_id = location.Id AND cl.communication_id = :communicationId",
        { communicationId },
      )
      .getMany();
  }
}
