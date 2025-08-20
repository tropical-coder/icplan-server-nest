import { MigrationInterface, QueryRunner } from 'typeorm';

export class AccountTypeTable1547671826892 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(`
      CREATE TABLE public.account_type
      (
        "Id" SERIAL,
        type integer,
        allowed_users integer,
        description character varying(500) COLLATE pg_catalog."default",
        CONSTRAINT account_type_pkey PRIMARY KEY ("Id")
      )
    `);
	}

	public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `DROP TABLE public.account_type;`
    );
  }
}
