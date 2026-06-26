-- A structure node may be created before its leader is appointed, but when a
-- leader is assigned their role must match the ministry layer and campus.
create or replace function public.validate_ministry_unit_leader()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare leader_row public.users;
begin
  if new.leader_id is null then return new; end if;
  select * into leader_row from public.users where id = new.leader_id;
  if not found then raise exception 'Assigned structure leader does not exist'; end if;
  if leader_row.campus_id is distinct from new.campus_id then
    raise exception 'A structure leader must belong to the same campus';
  end if;
  if (new.unit_type = 'direction' and leader_row.role <> 'Directional Leader')
    or (new.unit_type = 'team_district' and leader_row.role not in ('District Pastor / Pastoral Leader', 'District Pastor', 'Pastoral Leader'))
    or (new.unit_type = 'subteam_community' and leader_row.role not in ('Sub-Team Head', 'Community Leader'))
    or (new.unit_type = 'department_zone' and leader_row.role not in ('Zonal Leader / HOD', 'Zonal Leader', 'HOD'))
    or (new.unit_type = 'unit_area' and leader_row.role not in ('Cell Leader / Assistant HOD', 'Assistant HOD', 'Area Leader'))
    or (new.unit_type = 'cell' and leader_row.role not in ('Cell Leader / Assistant HOD', 'Cell Leader')) then
    raise exception 'The assigned leader role is not valid for this structure layer';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_ministry_unit_leader_before_write on public.ministry_units;
create trigger validate_ministry_unit_leader_before_write
  before insert or update of leader_id, unit_type, campus_id
  on public.ministry_units
  for each row execute function public.validate_ministry_unit_leader();
