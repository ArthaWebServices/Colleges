require('dotenv').config();
const { clerkClient } = require('@clerk/express');
const mongoose = require('mongoose');
const Announcement = require('../models/Announcement');

const targetUserId = process.argv[2];
const deleteNoticesArg = process.argv[3]; // optional flag: '--delete-notices'

const run = async () => {
  try {
    if (!clerkClient) {
      console.error('Error: Clerk SDK is not initialized. Ensure CLERK_SECRET_KEY is defined in .env');
      process.exit(1);
    }

    // List all registered HODs if 'list' or no arg is provided
    if (!targetUserId || targetUserId === 'list') {
      console.log('Fetching registered HOD users from Clerk...\n');
      const userListResponse = await clerkClient.users.getUserList();
      const users = userListResponse.data || userListResponse;

      if (!users || users.length === 0) {
        console.log('No registered HOD users found in Clerk.');
        process.exit(0);
      }

      console.log('Registered HOD Users:');
      console.log('--------------------------------------------------');
      for (const u of users) {
        const primaryEmail = u.emailAddresses?.find((e) => e.id === u.primaryEmailAddressId) || u.emailAddresses?.[0];
        const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || 'HOD';
        console.log(`User ID: ${u.id}`);
        console.log(`Name:    ${name}`);
        console.log(`Email:   ${primaryEmail?.emailAddress || 'N/A'}`);
        console.log(`Status:  ${u.publicMetadata?.isApproved ? 'APPROVED' : 'PENDING'}`);
        console.log('--------------------------------------------------');
      }

      console.log('\nUsage to delete an HOD user:');
      console.log('  node scripts/deleteHodCli.js <clerk_user_id>');
      console.log('  node scripts/deleteHodCli.js <clerk_user_id> --delete-notices\n');
      process.exit(0);
    }

    if (!targetUserId.startsWith('user_')) {
      console.error(`Error: Invalid Clerk User ID '${targetUserId}'. User IDs start with 'user_'.`);
      console.log('Run `node scripts/deleteHodCli.js list` to list all registered user IDs.');
      process.exit(1);
    }

    console.log(`Fetching user details for: ${targetUserId}...`);
    let user;
    try {
      user = await clerkClient.users.getUser(targetUserId);
    } catch (e) {
      console.error(`Error: User '${targetUserId}' not found in Clerk.`);
      process.exit(1);
    }

    const email = user.emailAddresses?.[0]?.emailAddress || 'N/A';
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'HOD';

    console.log(`Deleting HOD account: ${name} (${email}) [ID: ${targetUserId}] from Clerk...`);
    await clerkClient.users.deleteUser(targetUserId);
    console.log('✓ Successfully deleted HOD account from Clerk!');

    // Handle posted notices in MongoDB if requested
    if (deleteNoticesArg === '--delete-notices') {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gsc_announcements';
      console.log(`Connecting to MongoDB to clean up notices posted by ${targetUserId}...`);
      await mongoose.connect(mongoUri);
      const deleteResult = await Announcement.deleteMany({ postedBy: targetUserId });
      console.log(`✓ Deleted ${deleteResult.deletedCount} notice(s) created by this HOD from database.`);
      await mongoose.connection.close();
    } else {
      console.log('\nNote: Notices created by this HOD were retained in database.');
      console.log('If you also want to delete their posted notices, pass `--delete-notices`:');
      console.log(`  node scripts/deleteHodCli.js ${targetUserId} --delete-notices`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error deleting HOD account:', error.message);
    process.exit(1);
  }
};

run();
