# BrightPath Hero Academy — Gamified Edition

This version upgrades BrightPath Kids into a superhero-learning campaign with original hero characters and a cinematic team-hero theme.

## Hero progression
0. Baby Kitten — 0 XP
1. Brave Cub — 250 XP
2. Shield Scout — 550 XP
3. Iron Lynx — 900 XP
4. Thunder Prowler — 1300 XP
5. Web Guardian — 1800 XP
6. Star Sentinel — 2400 XP
7. Cosmic Panther — 3100 XP
8. Infinity Champion — 3900 XP

These are original characters rather than official Marvel/Avengers art or branding, so the public website does not rely on copyrighted character assets.

## Scoring
Each mission uses the student's BEST score:
- score itself: up to 200 XP (2 XP for every percentage point)
- 60%+: +100 XP and unlocks the next mission
- 85%+: +50 XP excellence bonus
- 100%: +50 XP perfect bonus
- maximum = 400 XP per mission

Retakes increase total XP only when the best score improves.

## Included missions
Nine starter missions are included in `content.js`:
- Amit: Hebrew / English / Math
- Maya: Hebrew / English / Math
- Ella: Hebrew / English / Math

Maya's Hebrew mission contains the existing full unseen `תעלומת התיק שנעלם`.

## IMPORTANT: Firebase accounts expected by config.js
- Admin: ran.forest@gmail.com
- Amit: amitlevi9999999@gmail.com
- Maya: mayulit2014@gmail.com
- Ella: ran.forest+ella@gmail.com

Ella can remain uncreated until you are ready.

## Deploy update to GitHub Pages
Replace the files in the ROOT of `ran-cpu/brightpath-kids` with:
- index.html
- styles.css
- app.js
- config.js
- content.js
- firestore.rules
- README.md
- .nojekyll

Then Firebase:
1. Firestore Database > Rules
2. Replace the current rules with `firestore.rules`
3. Publish

Then log in as Admin and click **Seed / refresh all missions** once.
GitHub Pages should redeploy automatically after the commit.

## Important
The theme is intentionally an original superhero-team design rather than official Avengers/Marvel logos, names or artwork. This makes it much safer to host publicly on your own domain while keeping the heroic progression feeling.
