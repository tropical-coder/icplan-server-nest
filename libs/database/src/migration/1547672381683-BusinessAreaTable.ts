import {MigrationInterface, QueryRunner} from "typeorm";

export class BusinessAreaTable1547672381683 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(`
      CREATE TABLE public.business_area
      (
        "Id" SERIAL,
        company_id bigint,
        name character varying(255) COLLATE pg_catalog."default",
        parent_id bigint,
        created_at bigint,
        created_by bigint,
        updated_at bigint,
        updated_by bigint,
        CONSTRAINT business_area_pkey PRIMARY KEY ("Id")
      )
    `);
	}

	public async down(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(`DROP TABLE public.business_area;`);
	}
}
