import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUserTable1539580320153 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
      CREATE TABLE public.user
      (
        "Id" SERIAL,
        company_id bigint,
        full_name character varying(255) COLLATE pg_catalog."default",
        email character varying(255) COLLATE pg_catalog."default",
        password text COLLATE pg_catalog."default",
        image_url character varying(500) COLLATE pg_catalog."default",
        activated integer,
        last_login bigint,
        created_at bigint,
        created_by bigint,
        updated_at bigint,
        updated_by bigint,
        is_deleted integer,
        CONSTRAINT users_pkey PRIMARY KEY ("Id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `DROP TABLE public.user;`
    );
  }
}
