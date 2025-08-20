import { MigrationInterface, QueryRunner } from 'typeorm';

export class MediaTable1547672332234 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(`
      CREATE TABLE public.media
      (
        "Id" SERIAL,
        url character varying(255) COLLATE pg_catalog."default",
        thumb_url character varying(255) COLLATE pg_catalog."default",
        type integer,
        created_at bigint,
        created_by bigint,
        updated_at bigint,
        updated_by bigint,
        CONSTRAINT media_pkey PRIMARY KEY ("Id")
      )
    `);
	}

	public async down(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(`DROP TABLE public.media;`);
	}
}
