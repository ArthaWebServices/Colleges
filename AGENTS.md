# Project rules
- Never commit .env or expose Cloudinary/Clerk secrets to the client.
- All Express routes must validate input before touching the database.
- courseCodes on an Announcement must always be validated against the Course collection.
- Ownership checks (postedBy === current user) happen server-side on every write, not just in the UI.
- Use Tailwind for all styling; no inline style objects in React components.