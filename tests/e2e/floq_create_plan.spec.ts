import { test, expect } from '@playwright/test'
import { seedFloqForUser } from '../helpers/seeders'

test.describe('Floq host sees Create Plan CTA', () => {
  test('host sees button, non-host does not', async ({ page, request }) => {
    const { floqId, hostSession, guestSession } = await seedFloqForUser(request)

    // --- Host ---
    await page.goto(`/auth/callback?token=${hostSession.access_token}`)
    await page.goto(`/floqs/${floqId}?tab=plans`)
    await expect(page.getByRole('button', { name: /create plan/i })).toBeVisible()

    // --- Guest ---
    await page.context().clearCookies()
    await page.goto(`/auth/callback?token=${guestSession.access_token}`)
    await page.goto(`/floqs/${floqId}?tab=plans`)
    await expect(page.getByRole('button', { name: /create plan/i })).not.toBeVisible()
  })
})