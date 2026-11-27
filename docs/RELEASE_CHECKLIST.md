# Release checklist

Training Academy is a static Vite application deployed from GitHub to the Vercel project `training-academy`. The production URL is https://training-academy-dun.vercel.app. See [Deployment](DEPLOYMENT.md) for project setup and the supported browser checks.

## Before the production release

- [ ] Record the exact candidate SHA, CI run, Vercel project, and READY preview URL. The maintained production branch is `main`.
- [ ] Run format, lint, type checking, unit tests, `npm run build`, `npm run verify:dist`, and the browser matrix. Inspect failures and retries for the candidate SHA.
- [ ] Exercise the Grown-ups flows on the candidate, including separate profiles, learning history, save and restore, guidance settings, keyboard access, and 200% text.
- [ ] For storage or content changes, run `npm run rehearse:update -- <live-sha>`. Keep the results with the release. Verify that older copies load, an open activity survives the switch, and cached screens still open offline.
- [ ] Review [privacy, security and licenses](RELEASE_AUDIT.md). Recheck the dependency advisory report, the build’s same-origin requests, and any changes to hosting, data collection, permissions, or policies.
- [ ] Have a human reviewer listen to the narration and Music Lab and record the outcome. Use Grown-ups → The voice: listen to every recording. The narration review process and its recording fields are in [Making the voice](../scripts/voice/README.md).
- [ ] Record the educator’s content review, including instructions, age fit, feedback, and adult supervision for the printable guides. Summaries should describe observed activities and answers.
- [ ] Check a physical iPhone and Android device in both orientations. Start with a clean session, play a lesson, use audio and replay, switch to calm motion and pictures, and reopen a previously visited lesson offline. In automatic graphics, record the device, tier and frame times from Grown-ups → Diagnostics.
- [ ] Check real screen-reader behavior. Confirm headings, form labels, the guidance preferences, import status, and dialog focus. Automated accessibility tests and WebKit emulation are supporting evidence.
- [ ] Obtain the owner’s production approval after the checks above.

## Verify production

1. In Vercel, open the production deployment and match its commit SHA to GitHub. Check the deployment is READY and owns the production domain.
2. Run the deployed revision’s own smoke tests against the production URL. Use a separate clean checkout and its locked dependencies.

   ```sh
   BASE_URL=https://training-academy-dun.vercel.app npm run test:e2e -- --project=desktop --project=phone
   ```

3. Open the home, a world, an activity, and Grown-ups by direct URLs. Check the deep-link rewrite, a missing hashed asset’s 404, the CSP, immutable asset caching, the service worker, and the deployed notice files.
4. Reopen a cached activity offline. Verify that an update becomes active after the prior version’s tabs close.
5. Record the production URL, SHA, Vercel deployment, checks, and any open verification in [Test results](TEST_RESULTS.md).

## Roll back if required

1. Record the affected deployment and symptom. Select the prior verified production deployment in Vercel.
2. If a release changed stored data, verify that the prior version understands the new records before moving production traffic. Use an already-exported copy to rehearse when possible. Prefer a forward fix when the old app cannot safely read the current format.
3. Use Vercel’s rollback for the approved deployment. Verify the production alias, smoke tests, offline reopening and service-worker version after the change.
4. Revert or fix the change on `main` so the next Git deploy reflects the intended version. Record the rollback and its replacement in [Test results](TEST_RESULTS.md).

[Vercel Git deployments](https://vercel.com/docs/git) · [Vercel Instant Rollback](https://vercel.com/docs/deployments/instant-rollback)
