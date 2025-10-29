import { createClient as createBrowserClient } from "@/lib/supabase/client"

export type Group = {
  id: string
  name: string
  description: string | null
  color: string
  created_by: string
  created_at: string
  updated_at: string
}

export type GroupMember = {
  id: string
  group_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  created_at: string
}

export type GroupWithMembers = Group & {
  members: Array<{
    id: string
    user_id: string
    group_id: string
    role: 'owner' | 'admin' | 'member'
    created_at: string
    profile: {
      id: string
      display_name: string
      avatar_url: string | null
    }
  }>
  member_count: number
}

export async function getMyGroups(): Promise<GroupWithMembers[]> {
  const supabase = createBrowserClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  console.log("[v0] getMyGroups: Fetching groups for user:", user.id)

  // Get all groups where user is a member
  const { data: userMemberships, error: membershipError } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id)

  console.log("[v0] getMyGroups: User memberships:", userMemberships, "error:", membershipError)

  if (membershipError) {
    console.error("Error fetching user memberships:", {
      message: membershipError.message,
      code: membershipError.code,
      details: membershipError.details,
      hint: membershipError.hint
    })
    return []
  }

  if (!userMemberships || userMemberships.length === 0) return []

  // Get the group IDs
  const groupIds = userMemberships.map((m) => m.group_id)
  console.log("[v0] getMyGroups: Group IDs:", groupIds)

  // Fetch the groups
  const { data: groups, error: groupsError } = await supabase
    .from("groups")
    .select("*")
    .in("id", groupIds)

  console.log("[v0] getMyGroups: Groups fetched:", groups, "error:", groupsError)

  if (groupsError) {
    console.error("Error fetching groups:", {
      message: groupsError.message,
      code: groupsError.code,
      details: groupsError.details,
      hint: groupsError.hint
    })
    return []
  }

  if (!groups || groups.length === 0) return []

  // Fetch members for these groups
  const { data: members, error: membersError } = await supabase
    .from("group_members")
    .select(`
      id,
      user_id,
      group_id,
      role,
      created_at,
      profile:profiles(id, display_name, avatar_url)
    `)
    .in("group_id", groupIds)

  console.log("[v0] getMyGroups: Members fetched:", members, "error:", membersError)

  if (membersError) {
    console.error("Error fetching group members:", {
      message: membersError.message,
      code: membersError.code,
      details: membersError.details,
      hint: membersError.hint
    })
    return groups.map((group) => ({
      ...group,
      members: [],
      member_count: 0,
    }))
  }

  // Combine groups with their members
  const result = groups.map((group) => {
    const groupMembers = members?.filter((m) => m.group_id === group.id) || []
    console.log(`[v0] getMyGroups: Group ${group.name} has ${groupMembers.length} members:`, groupMembers)
    return {
      ...group,
      members: groupMembers,
      member_count: groupMembers.length,
    }
  })

  console.log("[v0] getMyGroups: Final result:", result)
  return result
}

export async function createGroup(name: string, description?: string, color?: string): Promise<Group> {
  const supabase = createBrowserClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  // Create the group
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .insert({
      name,
      description: description || null,
      color: color || "#6366f1",
      created_by: user.id,
    })
    .select()
    .single()

  if (groupError) throw groupError

  // Add creator as member
  const { error: memberError } = await supabase.from("group_members").insert({
    group_id: group.id,
    user_id: user.id,
  })

  if (memberError) throw new Error(memberError.message || "Failed to add group member")

  return group as Group
}

export async function updateGroup(
  groupId: string,
  updates: { name?: string; description?: string; color?: string },
): Promise<Group> {
  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from("groups")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", groupId)
    .select()
    .single()

  if (error) throw error
  return data as Group
}

export async function deleteGroup(groupId: string): Promise<void> {
  const supabase = createBrowserClient()

  const { error } = await supabase.from("groups").delete().eq("id", groupId)

  if (error) throw error
}

export async function addGroupMember(groupId: string, userId: string, role: 'owner' | 'admin' | 'member' = 'member'): Promise<GroupMember> {
  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from("group_members")
    .insert({
      group_id: groupId,
      user_id: userId,
    })
    .select()
    .single()

  if (error) throw new Error(error.message || "Failed to add group member")
  return data as GroupMember
}

export async function updateGroupMemberRole(groupId: string, userId: string, role: 'owner' | 'admin' | 'member'): Promise<void> {
  const supabase = createBrowserClient()

  const { error } = await supabase
    .from("group_members")
    .update({ role })
    .eq("group_id", groupId)
    .eq("user_id", userId)

  if (error) throw new Error(error.message || "Failed to update member role")
}

export async function removeGroupMember(groupId: string, userId: string): Promise<void> {
  const supabase = createBrowserClient()

  const { error } = await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", userId)

  if (error) throw error
}

export async function getGroupMembers(groupId: string) {
  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from("group_members")
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq("group_id", groupId)

  if (error) throw error
  return data || []
}
