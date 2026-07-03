-- Server actions use the Supabase service role from trusted server-only code.
-- RLS remains enabled on core tables; this grant gives service_role the table
-- privileges needed before its BYPASSRLS role can perform verified mutations.

grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant all privileges on all functions in schema public to service_role;

alter default privileges in schema public
  grant all privileges on tables to service_role;

alter default privileges in schema public
  grant all privileges on sequences to service_role;

alter default privileges in schema public
  grant all privileges on functions to service_role;
