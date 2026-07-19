import { redirect } from 'next/navigation'

export default function LegacyMembersPage() {
  redirect('/settings/members')
}
