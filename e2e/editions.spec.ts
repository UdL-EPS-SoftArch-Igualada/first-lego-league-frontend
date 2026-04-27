import { expect, test } from "@playwright/test";
import { hasAdminTestUser } from "./utils/api";
import { loginViaUi } from "./utils/auth";

function getAdminUser() {
    return {
        username: process.env.E2E_ADMIN_USERNAME ?? "",
        password: process.env.E2E_ADMIN_PASSWORD ?? "",
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

    test("admins can delete an award and the page refreshes without the award", async ({ page }) => {
        let deletedAwardUri: string | null = null;
        let awardDeleted = false;

        await page.route("**/awards/search/findByEdition**", async (route) => {
            const response = await route.fetch();
            const body = await response.json();
            const awards = body._embedded?.awards ?? [];

            if (!deletedAwardUri) {
                const matchingAward = awards.find((award: { name?: string; title?: string; category?: string }) =>
                    award.name === "Champion Award" || award.title === "Champion Award" || award.category === "Champion Award"
                );
                const selectedAward = matchingAward ?? awards[0];
                deletedAwardUri = selectedAward?._links?.self?.href ?? selectedAward?.uri ?? null;
            }

            if (awardDeleted && deletedAwardUri) {
                body._embedded = {
                    ...(body._embedded ?? {}),
                    awards: awards.filter((award: { _links?: { self?: { href?: string } }; uri?: string }) => {
                        const awardUri = award._links?.self?.href ?? award.uri;
                        return awardUri !== deletedAwardUri;
                    }),
                };
            }

            await route.fulfill({ response, json: body });
        });

        await page.goto("/editions/1");
        await expect(page.getByRole("heading", { name: "Participating Teams", level: 2 })).toBeVisible();

        const deleteButton = page.getByRole("button", { name: "Delete Champion Award" });
        await expect(deleteButton).toBeVisible();
        await expect(page.getByText("Champion Award")).toBeVisible();

        if (!deletedAwardUri) {
            throw new Error("Could not determine the award URI.");
        }

        await page.route(`**${new URL(deletedAwardUri, "http://localhost").pathname}`, async (route) => {
            if (route.request().method() === "DELETE") {
                awardDeleted = true;
                await route.fulfill({ status: 204, body: "" });
                return;
            }

            await route.continue();
        });

        await deleteButton.click();
        const dialog = page.getByRole("dialog", { name: "Delete award" });
        await expect(dialog).toBeVisible();
        await page.getByRole("button", { name: "Delete award" }).click();

        await expect(deleteButton).not.toBeVisible();
        await expect(page.getByText("Champion Award")).not.toBeVisible();
    });
});

test("non-admin users cannot see award delete controls", async ({ page }) => {
    await page.goto("/editions/1");

    await expect(page.getByRole("heading", { name: "Participating Teams", level: 2 })).toBeVisible();
    await expect(page.getByText("Champion Award")).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete Champion Award" })).toHaveCount(0);
});
