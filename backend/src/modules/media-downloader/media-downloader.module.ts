import { Module } from "@nestjs/common";
import { MediaDownloaderController } from "./media-downloader.controller";
import { YtdlpService } from "./ytdlp.service";

@Module({
  controllers: [MediaDownloaderController],
  providers: [YtdlpService],
  exports: [YtdlpService],
})
export class MediaDownloaderModule {}
