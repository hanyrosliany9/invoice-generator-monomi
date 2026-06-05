import { Module } from "@nestjs/common";
import { RedisThrottlerStorage } from "./redis-throttler.storage";

/**
 * Provides + exports the Redis-backed throttler storage so it can be injected
 * into ThrottlerModule.forRootAsync via `imports: [RedisThrottlerStorageModule]`.
 * (ThrottlerAsyncOptions resolves `inject` from its imported modules, not from
 * the root AppModule providers.)
 */
@Module({
  providers: [RedisThrottlerStorage],
  exports: [RedisThrottlerStorage],
})
export class RedisThrottlerStorageModule {}
