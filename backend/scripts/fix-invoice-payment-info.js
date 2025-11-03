"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp(target, key, result);
  return result;
};

// src/modules/settings/settings.service.ts
var settings_service_exports = {};
__export(settings_service_exports, {
  SettingsService: () => SettingsService
});
var import_common, import_child_process, import_util, fs, execAsync, SettingsService;
var init_settings_service = __esm({
  "src/modules/settings/settings.service.ts"() {
    "use strict";
    import_common = require("@nestjs/common");
    import_child_process = require("child_process");
    import_util = require("util");
    fs = __toESM(require("fs"));
    execAsync = (0, import_util.promisify)(import_child_process.exec);
    SettingsService = class {
      constructor(prisma) {
        this.prisma = prisma;
      }
      async getUserSettings(userId) {
        console.log("getUserSettings called with userId:", userId);
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true
          }
        });
        if (!user) {
          throw new import_common.NotFoundException("User not found");
        }
        let preferences = await this.prisma.userPreferences.upsert({
          where: { userId },
          update: {},
          create: {
            userId,
            timezone: "Asia/Jakarta",
            language: "id",
            emailNotifications: true,
            pushNotifications: true,
            theme: "light"
          }
        });
        return {
          user,
          preferences
        };
      }
      async updateUserSettings(userId, updateData) {
        if (updateData.name || updateData.email) {
          await this.prisma.user.update({
            where: { id: userId },
            data: {
              name: updateData.name,
              email: updateData.email
            }
          });
        }
        const preferences = await this.prisma.userPreferences.upsert({
          where: { userId },
          update: {
            timezone: updateData.timezone,
            language: updateData.language,
            emailNotifications: updateData.emailNotifications,
            pushNotifications: updateData.pushNotifications,
            theme: updateData.theme
          },
          create: {
            userId,
            timezone: updateData.timezone || "Asia/Jakarta",
            language: updateData.language || "id",
            emailNotifications: updateData.emailNotifications ?? true,
            pushNotifications: updateData.pushNotifications ?? true,
            theme: updateData.theme || "light"
          }
        });
        return this.getUserSettings(userId);
      }
      async getCompanySettings() {
        let settings = await this.prisma.companySettings.findFirst();
        if (!settings) {
          settings = await this.prisma.companySettings.create({
            data: {
              companyName: "PT Teknologi Indonesia",
              address: "Jl. Sudirman No. 123, Jakarta Pusat",
              phone: "021-1234567",
              email: "info@teknologi.co.id",
              website: "https://teknologi.co.id",
              taxNumber: "01.234.567.8-901.000",
              currency: "IDR",
              bankBCA: "1234567890",
              bankMandiri: "0987654321",
              bankBNI: "1122334455"
            }
          });
        }
        return settings;
      }
      async updateCompanySettings(updateData) {
        const settings = await this.prisma.companySettings.upsert({
          where: { id: "default" },
          update: updateData,
          create: {
            id: "default",
            ...updateData
          }
        });
        return settings;
      }
      async getSystemSettings() {
        let settings = await this.prisma.systemSettings.findFirst();
        if (!settings) {
          settings = await this.prisma.systemSettings.create({
            data: {
              defaultPaymentTerms: "NET 30",
              materaiThreshold: 5e6,
              invoicePrefix: "INV-",
              quotationPrefix: "QT-",
              autoBackup: true,
              backupFrequency: "daily",
              backupTime: "02:00",
              autoMateraiReminder: true,
              defaultCurrency: "IDR"
            }
          });
        }
        return settings;
      }
      async updateSystemSettings(updateData) {
        const settings = await this.prisma.systemSettings.upsert({
          where: { id: "default" },
          update: updateData,
          create: {
            id: "default",
            ...updateData
          }
        });
        return settings;
      }
      async getNotificationSettings(userId) {
        const preferences = await this.prisma.userPreferences.findUnique({
          where: { userId },
          select: {
            emailNotifications: true,
            pushNotifications: true
          }
        });
        return preferences || {
          emailNotifications: true,
          pushNotifications: true
        };
      }
      async updateNotificationSettings(userId, notificationData) {
        const preferences = await this.prisma.userPreferences.upsert({
          where: { userId },
          update: {
            emailNotifications: notificationData.emailNotifications,
            pushNotifications: notificationData.pushNotifications
          },
          create: {
            userId,
            emailNotifications: notificationData.emailNotifications ?? true,
            pushNotifications: notificationData.pushNotifications ?? true,
            timezone: "Asia/Jakarta",
            language: "id",
            theme: "light"
          }
        });
        return preferences;
      }
      async resetUserSettings(userId) {
        await this.prisma.userPreferences.upsert({
          where: { userId },
          update: {
            timezone: "Asia/Jakarta",
            language: "id",
            emailNotifications: true,
            pushNotifications: true,
            theme: "light"
          },
          create: {
            userId,
            timezone: "Asia/Jakarta",
            language: "id",
            emailNotifications: true,
            pushNotifications: true,
            theme: "light"
          }
        });
        return { message: "Settings reset to default values" };
      }
      async createBackup(userId) {
        try {
          const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").split("T")[0] + "_" + (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").split("T")[1].split(".")[0];
          const filename = `invoices_backup_${timestamp}.sql`;
          const backupPath = `/tmp/${filename}`;
          const databaseUrl = process.env.DATABASE_URL;
          if (!databaseUrl) {
            throw new import_common.InternalServerErrorException("Database URL not configured");
          }
          const dbMatch = databaseUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
          if (!dbMatch) {
            throw new import_common.InternalServerErrorException("Invalid database URL format");
          }
          const [, dbUser, dbPassword, dbHost, dbPort, dbName] = dbMatch;
          const command = `PGPASSWORD="${dbPassword}" pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --clean --if-exists --create > ${backupPath}`;
          await execAsync(command);
          if (!fs.existsSync(backupPath)) {
            throw new import_common.InternalServerErrorException("Backup file was not created");
          }
          const stats = fs.statSync(backupPath);
          if (stats.size === 0) {
            fs.unlinkSync(backupPath);
            throw new import_common.InternalServerErrorException("Backup file is empty");
          }
          const fileBuffer = fs.readFileSync(backupPath);
          fs.unlinkSync(backupPath);
          console.log(`Database backup created by user ${userId} at ${(/* @__PURE__ */ new Date()).toISOString()}`);
          return {
            filename,
            content: fileBuffer.toString("base64"),
            size: stats.size,
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          };
        } catch (error) {
          console.error("Backup creation error:", error);
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          throw new import_common.InternalServerErrorException(
            `Failed to create backup: ${errorMessage}`
          );
        }
      }
    };
    SettingsService = __decorateClass([
      (0, import_common.Injectable)()
    ], SettingsService);
  }
});

// src/common/utils/error-handling.util.ts
function getErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error occurred";
}
var import_common2, import_client;
var init_error_handling_util = __esm({
  "src/common/utils/error-handling.util.ts"() {
    "use strict";
    import_common2 = require("@nestjs/common");
    import_client = require("@prisma/client");
  }
});

// src/modules/prisma/prisma.service.ts
var prisma_service_exports = {};
__export(prisma_service_exports, {
  PrismaService: () => PrismaService
});
var import_common3, import_client2, PrismaService;
var init_prisma_service = __esm({
  "src/modules/prisma/prisma.service.ts"() {
    "use strict";
    import_common3 = require("@nestjs/common");
    import_client2 = require("@prisma/client");
    init_error_handling_util();
    PrismaService = class extends import_client2.PrismaClient {
      logger = new import_common3.Logger(PrismaService.name);
      constructor() {
        super({
          log: process.env.NODE_ENV === "development" ? ["query", "info", "warn", "error"] : ["error"]
        });
      }
      async onModuleInit() {
        try {
          await this.$connect();
          this.logger.log("\u2705 Database connected successfully");
          await this.$queryRaw`SELECT 1`;
          this.logger.log("\u2705 Database query test successful");
        } catch (error) {
          this.logger.error("\u274C Database connection failed:", error);
          throw error;
        }
      }
      async onModuleDestroy() {
        try {
          await this.$disconnect();
          this.logger.log("Database disconnected");
        } catch (error) {
          this.logger.error("Error disconnecting from database:", error);
        }
      }
      async healthCheck() {
        try {
          await this.$queryRaw`SELECT 1`;
          return { status: "ok", message: "Database is healthy" };
        } catch (error) {
          return {
            status: "error",
            message: "Database connection failed",
            error: getErrorMessage(error)
          };
        }
      }
    };
    PrismaService = __decorateClass([
      (0, import_common3.Injectable)()
    ], PrismaService);
  }
});

// scripts/fix-invoice-payment-info.ts
var import_client3 = require("@prisma/client");
async function fixInvoicePaymentInfo() {
  const prisma = new import_client3.PrismaClient();
  console.log("\u{1F680} Starting invoice payment info migration...\n");
  try {
    const { SettingsService: SettingsService2 } = await Promise.resolve().then(() => (init_settings_service(), settings_service_exports));
    const { PrismaService: PrismaService2 } = await Promise.resolve().then(() => (init_prisma_service(), prisma_service_exports));
    const prismaService = new PrismaService2();
    const settingsService = new SettingsService2(prismaService);
    console.log("\u{1F4CA} Fetching company settings...");
    const companySettings = await settingsService.getCompanySettings();
    console.log(`\u2713 Company: ${companySettings.companyName}
`);
    const bankAccounts = [];
    if (companySettings.bankBCA) {
      bankAccounts.push(`BCA: ${companySettings.bankBCA}`);
    }
    if (companySettings.bankMandiri) {
      bankAccounts.push(`Mandiri: ${companySettings.bankMandiri}`);
    }
    if (companySettings.bankBNI) {
      bankAccounts.push(`BNI: ${companySettings.bankBNI}`);
    }
    let properPaymentInfo;
    if (bankAccounts.length > 0) {
      const companyName = companySettings.companyName || "Company";
      properPaymentInfo = `Bank Transfer
Rekening atas nama: ${companyName}
${bankAccounts.join(" | ")}`;
    } else {
      properPaymentInfo = "Bank Transfer - Silakan hubungi kami untuk detail rekening pembayaran";
    }
    console.log("\u2713 Generated payment info:");
    console.log(properPaymentInfo.split("\n").map((line) => `  ${line}`).join("\n"));
    console.log("");
    const placeholderTexts = [
      "Bank Transfer - Lihat detail di company settings",
      "Bank Transfer - Silakan hubungi kami untuk detail rekening pembayaran"
    ];
    let totalFound = 0;
    let totalUpdated = 0;
    let totalFailed = 0;
    for (const placeholder of placeholderTexts) {
      console.log(`\u{1F50D} Searching for invoices with: "${placeholder}"...`);
      const invoicesWithPlaceholder = await prisma.invoice.findMany({
        where: {
          paymentInfo: {
            contains: placeholder
          }
        },
        select: {
          id: true,
          invoiceNumber: true,
          paymentInfo: true,
          status: true
        }
      });
      console.log(`  Found: ${invoicesWithPlaceholder.length} invoice(s)
`);
      totalFound += invoicesWithPlaceholder.length;
      for (const invoice of invoicesWithPlaceholder) {
        try {
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
              paymentInfo: properPaymentInfo
            }
          });
          console.log(`  \u2713 Updated: ${invoice.invoiceNumber} (${invoice.status})`);
          totalUpdated++;
        } catch (error) {
          console.error(`  \u2717 Failed: ${invoice.invoiceNumber}`, error.message);
          totalFailed++;
        }
      }
      if (invoicesWithPlaceholder.length > 0) {
        console.log("");
      }
    }
    console.log("\u{1F50D} Searching for invoices with NULL or empty payment info...");
    const invoicesWithoutPaymentInfo = await prisma.invoice.findMany({
      where: {
        OR: [
          { paymentInfo: null },
          { paymentInfo: "" }
        ]
      },
      select: {
        id: true,
        invoiceNumber: true,
        status: true
      }
    });
    console.log(`  Found: ${invoicesWithoutPaymentInfo.length} invoice(s)
`);
    totalFound += invoicesWithoutPaymentInfo.length;
    for (const invoice of invoicesWithoutPaymentInfo) {
      try {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            paymentInfo: properPaymentInfo
          }
        });
        console.log(`  \u2713 Updated: ${invoice.invoiceNumber} (${invoice.status})`);
        totalUpdated++;
      } catch (error) {
        console.error(`  \u2717 Failed: ${invoice.invoiceNumber}`, error.message);
        totalFailed++;
      }
    }
    console.log("\n" + "=".repeat(60));
    console.log("\u{1F4CA} Migration Summary:");
    console.log("=".repeat(60));
    console.log(`Total invoices found:    ${totalFound}`);
    console.log(`Successfully updated:    ${totalUpdated}`);
    console.log(`Failed:                  ${totalFailed}`);
    console.log("=".repeat(60));
    if (totalUpdated > 0) {
      console.log("\n\u2705 Migration completed successfully!");
    } else if (totalFound === 0) {
      console.log("\n\u2728 No invoices needed updating - all good!");
    } else {
      console.log("\n\u26A0\uFE0F  Migration completed with some failures.");
    }
  } catch (error) {
    console.error("\n\u274C Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}
fixInvoicePaymentInfo().then(() => {
  console.log("\n\u{1F44B} Migration script finished.");
  process.exit(0);
}).catch((error) => {
  console.error("\n\u{1F4A5} Fatal error:", error);
  process.exit(1);
});
