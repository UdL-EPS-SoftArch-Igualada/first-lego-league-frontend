import { expect, test } from "@playwright/test";
import { hasAdminTestUser } from "./utils/api";
import { loginViaUi } from "./utils/auth";

function getAdminUser() {
    return {
        username: process.env.E2E_ADMIN_USERNAME ?? "",
        password: process.env.E2E_ADMIN_PASSWORD ?? "",
        email: `${process.env.E2E_ADMIN_USERNAME ?? "admin"}@sample.app`,
    };
}

test("editions page links to an edition detail page", async ({ page }) => {
    await page.goto("/editions");

    await expect(page.getByRole("heading", { name: "Editions", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Season overview", level: 2 })).toBeVisible();

    const emptyState = page.getByText("No editions found");
    const firstEditionLink = page.locator('a[href^="/editions/"]').first();

    await expect(emptyState.or(firstEditionLink)).toBeVisible();

    if (await emptyState.isVisible()) {
        return;
    }

    await firstEditionLink.click();

    await expect(page).toHaveURL(/\/editions\/.+$/);
    await expect(page.getByRole("heading", { name: "Participating Teams", level: 2 })).toBeVisible();
});

test.describe("edition award delete controls", () => {
    test.beforeEach(async ({ page }) => {
        test.skip(!hasAdminTestUser(), "Admin credentials not configured");
        await loginViaUi(page, getAdminUser());
        await page.goto("/editions/1");
        await expect(page.getByRole("heading", { name: "Participating Teams", level: 2 })).toBeVisible();
    });

    test("admins can open and cancel the award delete dialog", async ({ page }) => {
        const deleteButton = page.getByRole("button", { name: "Delete Champion Award" });

        await expect(deleteButton).toBeVisible();
        await deleteButton.click();

        const dialog = page.getByRole("dialog", { name: "Delete award" });
        await expect(dialog).toBeVisible();
        await expect(dialog.getByText("Champion Award")).toBeVisible();

        await page.getByRole("button", { name: "Cancel" }).click();
        await expect(dialog).not.toBeVisible();
    });
});
