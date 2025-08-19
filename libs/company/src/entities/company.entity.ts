import { Entity } from "typeorm";

export enum SecondaryCalendarView {
  GanttChart = "gantt_chart",
  SwimLane = "swimlane",
}

export enum DefaultCalendarView {
  GanttChart = "gantt_chart",
  SwimLane = "swimlane",
  Calendar = "calendar",
}

export enum DateFormat {
  DMY = "DMY",
  MDY = "MDY",
  YMD = "YMD",
}

export enum CalendarFormat {
  TwelveMonth = 1,
  ThirteenMonth = 2,
}
@Entity("company")
export class CompanyModel {

}