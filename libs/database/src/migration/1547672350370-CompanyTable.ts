import {MigrationInterface, QueryRunner} from "typeorm";

export class CompanyTable1547672350370 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(`
      CREATE TABLE public.company
      (
        "Id" SERIAL,
        name character varying(255) COLLATE pg_catalog."default",
        account_type_id integer,
        image_url character varying(255) COLLATE pg_catalog."default",
        owner_id integer,
        created_at bigint,
        created_by bigint,
        updated_at bigint,
        updated_by bigint,
        CONSTRAINT company_pkey PRIMARY KEY ("Id")
      )
    `);
	}

	public async down(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(`DROP TABLE public.company;`);
	}
}
