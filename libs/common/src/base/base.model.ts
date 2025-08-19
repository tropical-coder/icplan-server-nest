import {
  AfterLoad,
  AfterInsert,
  BaseEntity,
  BeforeInsert,
  BeforeUpdate,
  Column,
  PrimaryGeneratedColumn,
} from "typeorm";

export abstract class BaseModel extends BaseEntity {
  @PrimaryGeneratedColumn({
    name: "Id",
    type: "bigint",
  })
  Id: number;

  @Column({
    name: "created_at",
    type: "bigint",
    nullable: true,
  })
  created_at;

  @Column({
    name: "created_by",
    type: "bigint",
    nullable: true,
  })
  created_by;

  @Column({
    name: "updated_at",
    type: "bigint",
    nullable: true,
  })
  updated_at;

  @Column({
    name: "updated_by",
    type: "bigint",
    nullable: true,
  })
  updated_by;

  @Column({
    name: "is_deleted",
    type: "smallint",
    default: 0,
  })
  is_deleted: number;

  @BeforeInsert()
  createDates() {
    this.created_at = new Date().getTime();
    this.updated_at = new Date().getTime();
    this.is_deleted = 0;
  }

  @BeforeUpdate()
  updateDates() {
    this.updated_at = new Date().getTime();
  }

  @AfterInsert()
  castId() {
    this.Id = +this.Id;
  }

  @AfterLoad()
  convertDates() {
    this.Id = +this.Id;
  }
}
