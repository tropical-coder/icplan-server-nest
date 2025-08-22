import { ViewEntity, ViewColumn, Index } from "typeorm";

@ViewEntity({
  name: "communication_search_view",
  materialized: true,
  expression: `
    SELECT
      c."Id",
      c.title,
      c.description,
      c.objectives,
      c.key_messages,
      setweight(to_tsvector('english', c.title), 'A') ||
      setweight(to_tsvector('english', coalesce(c.description, '')), 'C') ||
      setweight(to_tsvector('english', coalesce(c.objectives, '')), 'C') ||
      setweight(to_tsvector('english', coalesce(c.key_messages, '')), 'C') ||
      setweight(to_tsvector('english', coalesce(sp.sp_txt, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(ba.ba_txt, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(ch.ch_txt, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(loc.loc_txt, '')), 'C') ||
      setweight(to_tsvector('english', coalesce(ct.ct_txt, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(aud.aud_txt, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(tag.tag_txt, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(owner.full_name, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(tm.team_txt, '')), 'A')
      AS vector,
      sp.sp_list       AS sp_names,
      ba.ba_list       AS ba_names,
      ch.ch_list       AS channel_names,
      loc.loc_list     AS location_names,
      ct.ct_list       AS ct_names,
      aud.aud_list     AS audience_names,
      tag.tag_list     AS tag_names,
      owner.full_name  AS owner_name,
      tm.team_list     AS team_names
    FROM communication c
    LEFT JOIN "user" owner
      ON owner."Id" = c.owner_id
    LEFT JOIN LATERAL (
      SELECT
        string_agg(DISTINCT sp."name", ' ω ')    AS sp_list,
        coalesce(string_agg(DISTINCT sp."name", ' '), '') AS sp_txt
      FROM communication_strategic_priority csp
      JOIN strategic_priority sp
        ON sp."Id" = csp.strategic_priority_id
      WHERE csp.communication_id = c."Id"
    ) sp ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        string_agg(DISTINCT ba."name", ' ω ')    AS ba_list,
        coalesce(string_agg(DISTINCT ba."name", ' '), '') AS ba_txt
      FROM communication_business_area cba
      JOIN business_area ba
        ON ba."Id" = cba.business_area_id
      WHERE cba.communication_id = c."Id"
    ) ba ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        string_agg(DISTINCT channel."name", ' ω ')    AS ch_list,
        coalesce(string_agg(DISTINCT channel."name", ' '), '') AS ch_txt
      FROM communication_channel cc
      JOIN channel
        ON channel."Id" = cc.channel_id
      WHERE cc.communication_id = c."Id"
    ) ch ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        string_agg(DISTINCT l."name", ' ω ')       AS loc_list,
        coalesce(string_agg(DISTINCT l."name", ' '), '') AS loc_txt
      FROM communication_location cl
      JOIN location l
        ON l."Id" = cl.location_id
      WHERE cl.communication_id = c."Id"
    ) loc ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        string_agg(DISTINCT content_type."name", ' ω ')    AS ct_list,
        coalesce(string_agg(DISTINCT content_type."name", ' '), '') AS ct_txt
      FROM communication_content_type cct
      JOIN content_type
        ON content_type."Id" = cct.content_type_id
      WHERE cct.communication_id = c."Id"
    ) ct ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        string_agg(DISTINCT a."name", ' ω ')   AS aud_list,
        coalesce(string_agg(DISTINCT a."name", ' '), '') AS aud_txt
      FROM communication_audience ca
      JOIN audience a
        ON a."Id" = ca.audience_id
      WHERE ca.communication_id = c."Id"
    ) aud ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        string_agg(DISTINCT t."name", ' ω ')   AS tag_list,
        coalesce(string_agg(DISTINCT t."name", ' '), '') AS tag_txt
      FROM communication_tag ctg
      JOIN tag t
        ON t."Id" = ctg.tag_id
      WHERE ctg.communication_id = c."Id"
    ) tag ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        string_agg(DISTINCT usr.full_name, ' ω ')    AS team_list,
        coalesce(string_agg(DISTINCT usr.full_name, ' '), '') AS team_txt
      FROM communication_team ct
      JOIN "user" usr
        ON usr."Id" = ct.user_id
      WHERE ct.communication_id = c."Id"
    ) tm ON TRUE
    WHERE c.is_deleted = 0;`
})
export class CommunicationSearchView {
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
  channel_names: string;

  @ViewColumn()
  location_names: string;

  @ViewColumn()
  ct_names: string;

  @ViewColumn()
  audience_names: string;

  @ViewColumn()
  tag_names: string;

  @ViewColumn()
  owner_name: string;
  
  @ViewColumn()
  team_names: string;
}