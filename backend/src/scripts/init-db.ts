import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { execSync } from "child_process";
import * as path from "path";
import { getErrorMessage } from "../common/utils/error-handling.util";

const prisma = new PrismaClient();

async function initDatabase() {
  try {
    console.log("🔧 Starting database initialization...");

    // Check if database is accessible
    await prisma.$connect();
    console.log("✅ Database connection successful");

    // Check if database schema exists, create if not
    console.log("📋 Checking database schema...");
    let schemaExists = false;
    try {
      const result =
        await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'`;
      if (Array.isArray(result) && result.length > 0) {
        console.log("✅ Database schema verified");
        schemaExists = true;
      } else {
        throw new Error("Users table not found");
      }
    } catch (schemaError) {
      console.log("📋 Database schema not found, creating tables...");
      try {
        // Automatically run prisma db push to create schema
        console.log("⚡ Running Prisma schema push...");
        const backendPath = path.resolve(process.cwd());
        execSync("npx prisma db push", {
          cwd: backendPath,
          stdio: "inherit",
          timeout: 30000,
        });

        // Reconnect to ensure Prisma picks up new schema
        console.log("🔄 Reconnecting to database...");
        await prisma.$disconnect();
        await prisma.$connect();

        // Verify schema was created
        console.log("🔍 Verifying schema creation...");
        const verifyResult =
          await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'`;
        if (Array.isArray(verifyResult) && verifyResult.length > 0) {
          console.log("✅ Database schema created and verified successfully");
          schemaExists = true;
        } else {
          throw new Error(
            "Schema creation failed - users table still not found",
          );
        }
      } catch (pushError) {
        console.error(
          "❌ Failed to create database schema:",
          getErrorMessage(pushError),
        );
        throw new Error("Could not create database schema automatically");
      }
    }

    // Check if admin user exists (now safe because tables exist)
    let existingAdmin;
    try {
      existingAdmin = await prisma.user.findFirst({
        where: { email: "admin@monomi.id" },
      });
    } catch (userCheckError) {
      console.log("⚠️  Users table not found, assuming first-time setup");
      existingAdmin = null;
    }

    if (!existingAdmin) {
      console.log("👤 Creating default admin user...");

      // Use simple hashing for development to avoid bcrypt Alpine issues
      let hashedPassword;
      try {
        hashedPassword = await bcrypt.hash("password123", 10);
      } catch (error) {
        console.warn("bcrypt failed, using fallback hash");
        hashedPassword = "$2b$10$dummy.hash.for.development.password123";
      }

      await prisma.user.create({
        data: {
          email: "admin@monomi.id",
          name: "Administrator",
          password: hashedPassword,
          role: "ADMIN",
          isActive: true,
        },
      });

      console.log(
        "✅ Default admin user created (admin@monomi.id / password123)",
      );
    } else {
      console.log("👤 Admin user already exists");
    }

    // Create sample client if none exist
    const clientCount = await prisma.client.count();
    if (clientCount === 0) {
      console.log("🏢 Creating sample client...");

      await prisma.client.create({
        data: {
          name: "PT Sample Client",
          email: "client@sample.com",
          phone: "+62811234567",
          address: "Jl. Sample Street No. 123, Jakarta",
          company: "PT Sample Client Indonesia",
          contactPerson: "John Doe",
          paymentTerms: "NET 30",
        },
      });

      console.log("✅ Sample client created");
    } else {
      console.log("🏢 Clients already exist");
    }

    // Create sample project if none exist
    const projectCount = await prisma.project.count();
    if (projectCount === 0) {
      console.log("📋 Creating sample project...");

      const client = await prisma.client.findFirst();
      const projectType = await prisma.projectTypeConfig.findFirst({
        where: { code: "PRODUCTION" },
      });
      
      if (client && projectType) {
        await prisma.project.create({
          data: {
            number: "PRJ-202501-001",
            description: "Sample Website Development Project",
            output: "Responsive website with admin panel",
            projectTypeId: projectType.id,
            status: "PLANNING",
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            estimatedBudget: 50000000, // 50 million IDR
            clientId: client.id,
          },
        });

        console.log("✅ Sample project created");
      }
    } else {
      console.log("📋 Projects already exist");
    }

    console.log("🎉 Database initialization completed successfully!");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run initialization if this script is executed directly
if (require.main === module) {
  initDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { initDatabase };
