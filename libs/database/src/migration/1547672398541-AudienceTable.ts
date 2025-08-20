import {MigrationInterface, QueryRunner} from "typeorm";

export class AudienceTable1547672398541 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(`
      CREATE TABLE public.audience
      (
        "Id" SERIAL,
        company_id bigint,
        name character varying(255) COLLATE pg_catalog."default",
        created_at bigint,
        created_by bigint,
        updated_at bigint,
        updated_by bigint,
        CONSTRAINT audience_pkey PRIMARY KEY ("Id")
      )
    `);
	}

	public async down(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(`DROP TABLE public.audience;`);
	}
}
