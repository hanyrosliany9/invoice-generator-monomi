import { Module } from "@nestjs/common";
import { ShotListsController } from "./shot-lists.controller";
import { ShotListsService } from "./shot-lists.service";
import { ShotsController } from "./shots.controller";
import { ShotsService } from "./shots.service";
import { ScenesController } from "./scenes.controller";
import { ScenesService } from "./scenes.service";

@Module({
  controllers: [ShotListsController, ShotsController, ScenesController],
  providers: [ShotListsService, ShotsService, ScenesService],
  exports: [ShotListsService],
})
export class ShotListsModule {}
