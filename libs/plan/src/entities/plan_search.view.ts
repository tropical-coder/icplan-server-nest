import { ViewEntity, ViewColumn, Index } from "typeorm";

@ViewEntity({
  name: "plan_search_view",
  materialized: true,
  expression: `
    SELECT
      p."Id",
      p.title,
      p.description,
      p.objectives,
      p.key_messages,
      setweight(to_tsvector('english', p.title), 'A') ||
      setweight(to_tsvector('english', coalesce(p.description, '')), 'C') ||
      setweight(to_tsvector('english', coalesce(p.objectives, '')), 'C') ||
      setweight(to_tsvector('english', coalesce(p.key_messages, '')), 'C') ||
      setweight(to_tsvector('english', coalesce(sp.sp_txt, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(ba.ba_txt, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(tag.tag_txt, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(owner.own_txt, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(team.tm_txt, '')), 'A') ||
      setweight(
        to_tsvector(
          'english',
          coalesce(pf1."name", '') || ' ' || coalesce(pf2."name", '')
        ),
        'C'
      ) AS vector,
      sp.sp_list       AS sp_names,
      ba.ba_list       AS ba_names,
      tag.tag_list     AS tag_names,
      owner.own_list   AS owner_names,
      team.tm_list     AS team_names,
      pf1."name"       AS pf1_name,
      pf2."name"       AS pf2_name
    FROM PLAN p
    LEFT JOIN parent_folder pf1
      ON pf1."Id" = p.parent_folder_id
      AND pf1."Id" <> 0
    LEFT JOIN parent_folder pf2
      ON pf2."Id" = pf1.parent_folder_id
    LEFT JOIN LATERAL (
      SELECT
        string_agg(DISTINCT sp."name", ' ω ')       AS sp_list,
        coalesce(string_agg(DISTINCT sp."name", ' '), '') AS sp_txt
      FROM plan_strategic_priority psp
      JOIN strategic_priority sp
        ON sp."Id" = psp.strategic_priority_id
      WHERE psp.plan_id = p."Id"
    ) sp ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        string_agg(DISTINCT ba."name", ' ω ')       AS ba_list,
        coalesce(string_agg(DISTINCT ba."name", ' '), '') AS ba_txt
      FROM plan_business_area pba
      JOIN business_area ba
        ON ba."Id" = pba.business_area_id
      WHERE pba.plan_id = p."Id"
    ) ba ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        string_agg(DISTINCT t."name", ' ω ')        AS tag_list,
        coalesce(string_agg(DISTINCT t."name", ' '), '')  AS tag_txt
      FROM plan_tag pt
      JOIN tag t
        ON t."Id" = pt.tag_id
      WHERE pt.plan_id = p."Id"
    ) tag ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        string_agg(DISTINCT u.full_name, ' ω ')     AS own_list,
        coalesce(string_agg(DISTINCT u.full_name, ' '), '') AS own_txt
      FROM plan_owner po
      JOIN "user" u
        ON u."Id" = po.user_id
      WHERE po.plan_id = p."Id"
    ) owner ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        string_agg(DISTINCT u.full_name, ' ω ')     AS tm_list,
        coalesce(string_agg(DISTINCT u.full_name, ' '), '') AS tm_txt
      FROM plan_team ptm
      JOIN "user" u
        ON u."Id" = ptm.user_id
      WHERE ptm.plan_id = p."Id"
    ) team ON TRUE
    WHERE p.is_deleted = 0;
 `
})
export class PlanSearchView {
  @ViewColumn()
  Id: number;

  @ViewColumn()
  title: string;

  @ViewColumn()
  description: string;

  @ViewColumn()
  objectives: string;

  @ViewColumn()
  key_messages: string;

  @ViewColumn()
  vector: string;

  @ViewColumn()
  sp_names: string;

  @ViewColumn()
  ba_names: string;

  @ViewColumn()
  tag_names: string;

  @ViewColumn()
  owner_names: string;
  
  @ViewColumn()
  team_names: string;
  
  @ViewColumn()
  pf1_name: string;

  @ViewColumn()
  pf2_name: string;
}