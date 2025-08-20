import {MigrationInterface, QueryRunner} from "typeorm";

export class LocationTable1547672390585 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(`
      CREATE TABLE public.location
      (
        "Id" SERIAL,
        company_id bigint,
        name character varying(255) COLLATE pg_catalog."default",
        parent_id bigint,
        type integer,
        created_at bigint,
        created_by bigint,
        updated_at bigint,
        updated_by bigint,
        CONSTRAINT location_pkey PRIMARY KEY ("Id")
      )
    `);
	}

	public async down(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(`DROP TABLE public.location;`);
	}
}
