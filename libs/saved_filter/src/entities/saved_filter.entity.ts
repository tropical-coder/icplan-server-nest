import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { BaseModel } from "../BaseModel";
import { UserModel } from "../user/UserModel";
import { PinnedSavedFilterModel } from "./PinnedSavedFilterModel";

export enum DefaultSavedFilter {
  AllPlans = "All Plans",
}

@Entity("saved_filter")
export class SavedFilterModel extends BaseModel {
  @Column({
    name: "user_id",
    type: "bigint",
    nullable: true,
  })
  user_id: number;

  @Column({
    name: "name",
    type: "varchar",
    length: 255,
  })
  name: string;

  @Column({
    name: "filters",
    type: "jsonb",
  })
  filters: Object;

  @Column({
    name: "company_id",
    type: "bigint",
  })
  company_id: number;

  @ManyToOne((type) => UserModel, (userModel) => userModel.saved_filters, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id", referencedColumnName: "Id" })
  user: UserModel;

  @OneToMany(
    (type) => PinnedSavedFilterModel, 
    (pinnedSavedFilterModel) => pinnedSavedFilterModel.saved_filter
  )
  pinned_saved_filters: PinnedSavedFilterModel[];
}
