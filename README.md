# BrightPath Kids — GitHub Pages + Firebase

This package is ready for the repository:
`https://github.com/ran-cpu/brightpath-kids`

## Upload these files to the repository root
- `index.html`
- `styles.css`
- `app.js`
- `config.js`
- `firestore.rules`
- `.nojekyll`
- `README.md`

## Firebase setup

### Authentication
Already expected:
- `admin@itrna.com`
- `amit@itrna.com`
- `maya@itrna.com`

Ella can be created later:
- `ella@itrna.com`

### Firestore Rules
In Firebase Console go to:
**Firestore Database → Rules**

Replace the existing rules with the contents of `firestore.rules` and click **Publish**.

### Authorized domain
Go to:
**Authentication → Settings → Authorized domains**

Add:
`ran-cpu.github.io`

Later, when using the custom domain, also add:
`learn.itrna.com`

## Enable GitHub Pages
In GitHub open:
**Settings → Pages**

Choose:
- Source: **Deploy from a branch**
- Branch: **main**
- Folder: **/(root)**

Save.

The first site URL should be:
`https://ran-cpu.github.io/brightpath-kids/`

## First run
1. Open the site.
2. Log in as Admin using the password you created in Firebase.
3. Click **Seed / refresh starter challenges**.
4. Log out.
5. Log in as Maya or Amit and complete a challenge.
6. Log back in as Admin and confirm the attempt appears.

## What is included
- Separate Admin, Amit, Maya and Ella profiles
- Separate student progress
- Admin dashboard
- English and Hebrew challenge areas
- Automatic grading
- Saved attempts in Firestore
- Hebrew RTL
- Responsive layout
- Starter Hebrew unseen with 15 questions
- Starter English reading challenge
- Starter Kindergarten English/Hebrew challenges for Ella

## Security note
The Firebase web configuration in `config.js` is intended to be public in client-side Firebase apps. Data protection comes from Firebase Authentication and the Firestore rules. Do not place passwords in the GitHub repository.
