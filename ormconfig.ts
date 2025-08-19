// This file will be used in Typeorm CLI as datasource
import { DataSource, DataSourceOptions } from "typeorm";
import { config } from "@app/database/database.config";
export default new DataSource(config as DataSourceOptions);