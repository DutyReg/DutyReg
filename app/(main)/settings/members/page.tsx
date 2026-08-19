import { redirect } from "next/navigation";

import { addMember, removeMember, updateMemberRole } from "@/app/actions/members";
import { ActionForm } from "@/components/action-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import { Card, Chip, EmptyState, Field, Input, SectionTitle, Select } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ROLES, ROLE_LABELS } from "@/lib/constants";
import type { Member } from "@/lib/types";

const rolesForSelect = ROLES.map((role) => ({
  value: role,
  label: ROLE_LABELS[role],
}));

export const metadata = { title: "Team" };

export default async function MembersPage() {
  const ctx = await requireContext();
  if (!ctx.company) redirect("/onboarding");

  const supabase = await createClient();
  const { data: members } = await supabase
    .from("company_members")
    .select("id, company_id, user_id, role, created_at")
    .eq("company_id", ctx.company.id)
    .order("created_at")
    .returns<Member[]>();

  const memberList = members ?? [];
  const memberIds = memberList.map((m) => m.user_id);

  let profiles: Record<string, { email: string | null; full_name: string | null }> = {};
  if (memberIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", memberIds);
    profiles = Object.fromEntries(
      (profileRows ?? []).map((p) => [p.id, { email: p.email, full_name: p.full_name }]),
    );
  }

  return (
    <div className="grid gap-5">
      <RealtimeRefresher tables={[{ table: "company_members", companyId: ctx.company.id }]} />
      <Card className="grid gap-4 px-5 py-6">
        <div className="grid gap-1">
          <SectionTitle>Add a team member</SectionTitle>
          <p className="text-sm text-muted">
            The person must sign up on DutyReg first. You can add them by email afterwards.
          </p>
        </div>
        <ActionForm action={addMember}>
          <Field label="Email">
            <Input name="email" type="email" inputMode="email" required />
          </Field>
          <Field label="Role" hint="Supervisors mark attendance. Viewers only see reports.">
            <Select name="role" defaultValue="supervisor">
              {rolesForSelect.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </Select>
          </Field>
        </ActionForm>
      </Card>

      {memberList.length === 0 ? (
        <EmptyState title="No team members yet" body="You are the only member so far." />
      ) : (
        <div className="grid gap-3">
          {memberList.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              isSelf={member.user_id === ctx.user.id}
              profile={profiles[member.user_id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MemberCard({
  member,
  isSelf,
  profile,
}: {
  member: Member;
  isSelf: boolean;
  profile: { email: string | null; full_name: string | null } | undefined;
}) {
  const email = profile?.email ?? "";
  const name = profile?.full_name ?? email;

  if (isSelf) {
    return (
      <Card className="flex items-center justify-between gap-3 px-5 py-4">
        <div className="grid min-w-0 gap-0.5">
          <p className="truncate text-[15px] font-semibold text-ink">
            {name} <span className="text-xs font-normal text-muted">(you)</span>
          </p>
          <p className="truncate text-xs text-muted">{email}</p>
        </div>
        <Chip tone="neutral">{member.role}</Chip>
      </Card>
    );
  }

  return (
    <Card className="grid gap-3 px-5 py-4">
      <div className="grid min-w-0 gap-0.5">
        <p className="truncate text-[15px] font-semibold text-ink">{name}</p>
        <p className="truncate text-xs text-muted">{email}</p>
      </div>

      <ActionForm
        action={updateMemberRole}
        resetKey={`${member.user_id}-${member.role}`}
        submitLabel="Change role"
        className="gap-2"
      >
        <input type="hidden" name="userId" value={member.user_id} />
        <Field label="Role">
          <Select name="role" defaultValue={member.role}>
            {rolesForSelect.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </Select>
        </Field>
      </ActionForm>

      {member.role === "owner" ? (
        <p className="-mt-2 text-xs text-muted">
          This member owns the company and cannot be removed here.
        </p>
      ) : (
        <div className="pt-1">
          <ConfirmDialog
            label="Remove from company"
            title="Remove this member?"
            message="This member immediately loses access to the company and its attendance data."
            action={removeMember}
            hiddenFields={{ userId: member.user_id }}
            confirmLabel="Remove"
            successMessage="Member removed."
          />
        </div>
      )}
    </Card>
  );
}