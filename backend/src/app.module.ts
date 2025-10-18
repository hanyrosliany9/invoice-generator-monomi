import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule } from "@nestjs/throttler";
import { APP_INTERCEPTOR, APP_FILTER } from "@nestjs/core";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { ClientsModule } from "./modules/clients/clients.module";
import { ProjectsModule } from "./modules/projects/projects.module";
import { QuotationsModule } from "./modules/quotations/quotations.module";
import { InvoicesModule } from "./modules/invoices/invoices.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { ExpensesModule } from "./modules/expenses/expenses.module";
import { AccountingModule } from "./modules/accounting/accounting.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { MateraiModule } from "./modules/materai/materai.module";
import { LocalizationModule } from "./modules/localization/localization.module";
import { PdfModule } from "./modules/pdf/pdf.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { ProjectTypesModule } from "./modules/project-types/project-types.module";
import { BusinessJourneyModule } from "./modules/business-journey/business-journey.module";
import { DocumentsModule } from "./modules/documents/documents.module";
import { AssetsModule } from "./modules/assets/assets.module";
import { VendorsModule } from "./modules/vendors/vendors.module";
import { PurchaseOrdersModule } from "./modules/purchase-orders/purchase-orders.module";
import { GoodsReceiptsModule } from "./modules/goods-receipts/goods-receipts.module";
import { VendorInvoicesModule } from "./modules/vendor-invoices/vendor-invoices.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { HealthModule } from "./health/health.module";
import { MetricsModule } from "./metrics/metrics.module";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    ProjectsModule,
    QuotationsModule,
    InvoicesModule,
    PaymentsModule,
    ExpensesModule,
    AccountingModule,
    NotificationsModule,
    MateraiModule,
    LocalizationModule,
    PdfModule,
    ReportsModule,
    SettingsModule,
    ProjectTypesModule,
    BusinessJourneyModule,
    DocumentsModule,
    AssetsModule,
    VendorsModule,
    PurchaseOrdersModule,
    GoodsReceiptsModule,
    VendorInvoicesModule,
    HealthModule,
    MetricsModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
