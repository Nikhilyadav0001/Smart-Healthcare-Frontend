# Smart Healthcare frontend

A premium React/Vite healthcare workspace built around the confirmed Gateway BFF session endpoint.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite. For a production build:

```bash
npm run build
npm run preview
```

## Backend integration

The frontend makes one authenticated request:

```text
GET /api/me
```

The request uses `credentials: include`, so the Gateway BFF session cookie remains browser-managed. OAuth access or refresh tokens are never read by React and are not exposed to the client.

If the endpoint returns `401` or `403`, the app shows the secure sign-in CTA. If the endpoint is unavailable, the app shows a retryable connection state with an optional demo workspace. Appointments, records, care team, messages, and profile content are intentionally local demo data until their backend contracts are confirmed.

## Product surfaces

- Authenticated workspace shell with responsive navigation
- Loading, unauthenticated, error, and demo states
- Overview dashboard with wellness snapshot and upcoming appointments
- Appointments, health records, care team, messages, and profile/settings views
- Accessible buttons, labels, keyboard focus states, reduced-motion support, and mobile layouts
# Smart-Healthcare-Frontend
