import assert from "node:assert/strict";
import { test } from "node:test";

import { findAuthUserByEmail, listAllAuthUsers } from "../lib/auth-users";

import type { GoTrueAdminApi } from "@supabase/supabase-js";

// A stand-in for Auth's admin API that hands out `total` users in pages, as the real one does.
function fakeAdmin(total: number) {
  const pages: number[] = [];
  const admin = {
    async listUsers({ page = 1, perPage = 50 }: { page?: number; perPage?: number }) {
      pages.push(page);
      const start = (page - 1) * perPage;
      const users = Array.from(
        { length: Math.max(0, Math.min(perPage, total - start)) },
        (_, i) => ({
          id: `id-${start + i}`,
          email: `user-${start + i}@reng.local`,
        }),
      );
      return { data: { users }, error: null };
    },
  };
  return { admin: admin as unknown as GoTrueAdminApi, pages };
}

test("users past the first 1000 are found by reading every page", async () => {
  const { admin, pages } = fakeAdmin(2345);
  assert.equal((await listAllAuthUsers(admin)).length, 2345);
  assert.deepEqual(pages, [1, 2, 3]);
  assert.equal((await findAuthUserByEmail(admin, "user-2001@reng.local"))?.id, "id-2001");
  assert.equal(await findAuthUserByEmail(admin, "missing@reng.local"), undefined);
});

test("an exact page of users reads one empty page to know it ended", async () => {
  const { admin, pages } = fakeAdmin(1000);
  assert.equal((await listAllAuthUsers(admin)).length, 1000);
  assert.deepEqual(pages, [1, 2]);
});

test("a listing error stops the read", async () => {
  const admin = {
    async listUsers() {
      return { data: { users: [] }, error: new Error("down") };
    },
  } as unknown as GoTrueAdminApi;
  await assert.rejects(listAllAuthUsers(admin), /down/);
});
