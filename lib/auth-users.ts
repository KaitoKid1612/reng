import type { GoTrueAdminApi, User } from "@supabase/supabase-js";

const PAGE_SIZE = 1000;

/**
 * Every Auth user, page by page. The admin API returns at most 1000 users a page, and a local
 * stack filled by E2E runs (or a production that grows) has more, so one page silently missed
 * accounts: on 11/11/2026 the E2E setup no longer found its own teacher and tried to create it again.
 */
export async function listAllAuthUsers(admin: GoTrueAdminApi): Promise<User[]> {
  const users: User[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) {
      throw error;
    }
    users.push(...data.users);
    if (data.users.length < PAGE_SIZE) {
      return users;
    }
  }
}

export async function findAuthUserByEmail(admin: GoTrueAdminApi, email: string) {
  const users = await listAllAuthUsers(admin);
  return users.find((user) => user.email === email);
}
