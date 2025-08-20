import {MigrationInterface, QueryRunner} from "typeorm";

export class StrategicPriorityTable1547672369497 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(`
      CREATE TABLE public.strategic_priority
      (
        "Id" SERIAL,
        company_id bigint,
        name character varying(255) COLLATE pg_catalog."default",
        created_at bigint,
        created_by bigint,
        updated_at bigint,
        updated_by bigint,
        CONSTRAINT strategic_priority_pkey PRIMARY KEY ("Id")
      )
    `);
	}

	public async down(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(`DROP TABLE public.strategic_priority;`);
	}
}
