import {MigrationInterface, QueryRunner} from "typeorm";

export class PlanTable1547672390585 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(`
      CREATE TABLE public.plan
      (
        "Id" BIGSERIAL,
        company_id bigint NOT NULL,
        title character varying(255) COLLATE pg_catalog."default" NOT NULL,
        description character varying(255) COLLATE pg_catalog."default",
        start_date date,
        end_date date,
        budget_planned integer,
        budget_actual integer,
        ongoing boolean NOT NULL,
        color character varying(255) COLLATE pg_catalog."default",
        status plan_status_enum NOT NULL DEFAULT 'future'::plan_status_enum,
        created_at bigint,
        created_by bigint,
        updated_at bigint,
        updated_by bigint,
        is_deleted smallint NOT NULL DEFAULT 0,
        CONSTRAINT plan_pkey PRIMARY KEY ("Id")
      )
    `);
	}

	public async down(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(`DROP TABLE public.plan;`);
	}
}
