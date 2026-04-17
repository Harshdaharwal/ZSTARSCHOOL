# Firestore migration

## Files

- `firestore-seed.json`: exported project data generated from the mock backend.
- `firestore.rules`: Firestore rules for the project.

## Commands

- `npm run firebase:export-seed`
- `npm run firebase:migrate-firestore`
- `npm run firebase:create-auth-users`

## Required environment

- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_API_KEY` for auth-user creation
- `GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_SERVICE_ACCOUNT` pointing to a Firebase service account JSON
