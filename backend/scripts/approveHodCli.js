require('dotenv').config();
const { clerkClient } = require('@clerk/express');

const targetUserId = process.argv[2];
const action = process.argv[3] || 'approve';

const run = async () => {
  try {
    if (!clerkClient) {
      console.error('Error: Clerk SDK is not initialized. Ensure CLERK_SECRET_KEY is defined in .env');
      process.exit(1);
    }

    // Auto-approve ALL registered users if 'all' is passed as argument
    if (targetUserId === 'all') {
      console.log('Fetching all registered users from Clerk...');
      const userListResponse = await clerkClient.users.getUserList();
      const users = userListResponse.data || userListResponse;

      if (!users || users.length === 0) {
        console.log('No registered users found in Clerk yet. Please sign up at http://localhost:3000/admin first!');
        process.exit(0);
      }

      console.log(`Found ${users.length} registered user(s). Approving all...`);
      for (const u of users) {
        const updated = await clerkClient.users.updateUserMetadata(u.id, {
          publicMetadata: {
            ...(u.publicMetadata || {}),
            isApproved: true,
          },
        });
        const email = updated.emailAddresses?.[0]?.emailAddress || 'N/A';
        console.log(`  ✓ Approved HOD: ${updated.id} (${email})`);
      }

      console.log('\nAll registered HOD accounts have been APPROVED!');
      console.log('Refresh your browser at http://localhost:3000/admin to access the dashboard.');
      process.exit(0);
    }

    if (!targetUserId) {
      console.log(`
Usage:
  node scripts/approveHodCli.js all                 (Approve ALL registered HODs)
  node scripts/approveHodCli.js <clerk_user_id>     (Approve specific Clerk User ID)

Example:
  node scripts/approveHodCli.js all
  `);
      process.exit(1);
    }

    if (!targetUserId.startsWith('user_')) {
      console.error(`Error: Invalid Clerk User ID '${targetUserId}'.`);
      console.error(`To approve ALL registered accounts automatically, run:\n  node scripts/approveHodCli.js all`);
      process.exit(1);
    }

    const isApproved = action.toLowerCase() === 'approve';
    console.log(`Setting publicMetadata.isApproved = ${isApproved} for Clerk User: ${targetUserId}...`);

    const user = await clerkClient.users.getUser(targetUserId);
    const existingMetadata = user.publicMetadata || {};

    const updatedUser = await clerkClient.users.updateUserMetadata(targetUserId, {
      publicMetadata: {
        ...existingMetadata,
        isApproved,
      },
    });

    console.log('\n✓ Successfully updated user approval state!');
    console.log(`User ID: ${updatedUser.id}`);
    console.log(`Email: ${updatedUser.emailAddresses?.[0]?.emailAddress || 'N/A'}`);
    console.log(`Public Metadata:`, updatedUser.publicMetadata);

    process.exit(0);
  } catch (error) {
    console.error('Error updating HOD user in Clerk:', error.message);
    process.exit(1);
  }
};

run();
