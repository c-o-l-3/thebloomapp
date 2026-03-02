#!/usr/bin/env node
/**
 * Create Admin User Script
 * Creates an admin user with full access to all features
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Admin user configuration
const ADMIN_USER = {
  email: 'cole@nowweflourish.com',
  name: 'Cole Admin',
  role: 'admin',
  permissions: {
    // Admin has full access to all features
    clients: {
      view: true,
      create: true,
      edit: true,
      delete: true
    },
    journeys: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      publish: true,
      approve: true
    },
    touchpoints: {
      view: true,
      create: true,
      edit: true,
      delete: true
    },
    templates: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      sync: true
    },
    workflows: {
      view: true,
      create: true,
      edit: true,
      delete: true
    },
    analytics: {
      view: true,
      export: true,
      manage: true
    },
    admin: {
      dashboard: true,
      userManagement: true,
      systemSettings: true,
      rateLimits: true
    },
    clientPortal: {
      manageSettings: true,
      viewAllRequests: true,
      approveChanges: true
    }
  }
};

async function createAdminUser() {
  console.log('🔐 Creating admin user...\n');

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: ADMIN_USER.email }
    });

    if (existingUser) {
      // Update existing user to admin
      console.log(`⚠️  User ${ADMIN_USER.email} already exists. Updating to admin role...`);
      
      const updatedUser = await prisma.user.update({
        where: { email: ADMIN_USER.email },
        data: {
          role: 'admin',
          permissions: ADMIN_USER.permissions,
          name: ADMIN_USER.name
        }
      });

      console.log('\n✅ User updated to admin successfully!');
      console.log('\n📋 Admin User Details:');
      console.log(`   ID:    ${updatedUser.id}`);
      console.log(`   Email: ${updatedUser.email}`);
      console.log(`   Name:  ${updatedUser.name}`);
      console.log(`   Role:  ${updatedUser.role}`);
      console.log(`   Created: ${updatedUser.createdAt}`);
    } else {
      // Create new admin user
      console.log(`Creating new admin user: ${ADMIN_USER.email}...`);
      
      const user = await prisma.user.create({
        data: {
          email: ADMIN_USER.email,
          name: ADMIN_USER.name,
          role: 'admin',
          permissions: ADMIN_USER.permissions
        }
      });

      console.log('\n✅ Admin user created successfully!');
      console.log('\n📋 Admin User Details:');
      console.log(`   ID:    ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name:  ${user.name}`);
      console.log(`   Role:  ${user.role}`);
      console.log(`   Created: ${user.createdAt}`);
    }

    console.log('\n🔑 Admin Privileges Granted:');
    console.log('   ✓ View all clients and journeys');
    console.log('   ✓ Edit touchpoints');
    console.log('   ✓ Access admin dashboard');
    console.log('   ✓ Manage client portal settings');
    console.log('   ✓ Manage users and system settings');
    console.log('   ✓ Full rate limit administration');
    console.log('   ✓ Workflow and template management');
    console.log('   ✓ Analytics and reporting access');

    console.log('\n💡 Login Instructions:');
    console.log('   URL:      http://localhost:8080/api/auth/login');
    console.log('   Method:   POST');
    console.log('   Headers:  Content-Type: application/json');
    console.log('   Body:     {"email": "cole@nowweflourish.com"}');
    console.log('\n   Or use the journey-visualizer app at http://localhost:5173');
    console.log('   and click login with email: cole@nowweflourish.com');

    return true;
  } catch (error) {
    console.error('\n❌ Error creating admin user:', error.message);
    console.error(error.stack);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createAdminUser()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

export { createAdminUser, ADMIN_USER };
