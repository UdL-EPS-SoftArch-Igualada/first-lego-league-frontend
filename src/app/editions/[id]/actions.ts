"use server";

import { AwardsService } from "@/api/awardApi";
import { UsersService } from "@/api/userApi";
import { serverAuthProvider } from "@/lib/authProvider";
import { isAdmin } from "@/lib/authz";
import { AuthenticationError } from "@/types/errors";
import { revalidatePath } from "next/cache";

function parseErrorMessage(error: unknown): string | undefined {
  if (error instanceof AuthenticationError && error.message) {
    return error.message;
  }

  return undefined;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return parseErrorMessage(error) ?? fallback;
}

async function assertAdminAccess() {
  const auth = await serverAuthProvider.getAuth();
  if (!auth) {
    throw new AuthenticationError();
  }

  const currentUser = await new UsersService(serverAuthProvider).getCurrentUser();

  if (!isAdmin(currentUser)) {
    throw new AuthenticationError("You are not allowed to delete awards.", 403);
  }
}

export async function deleteAward(editionId: string, awardUri: string) {
  try {
    await assertAdminAccess();

    await new AwardsService(serverAuthProvider).deleteAward(awardUri);

    revalidatePath(`/editions/${editionId}`);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Error deleting the award"),
    };
  }
}
