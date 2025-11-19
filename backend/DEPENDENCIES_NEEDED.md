# Required Dependencies for Media Collaboration

## Install these packages in the Docker container:

```bash
# Run inside the backend container
docker compose -f docker-compose.dev.yml exec app sh -c "cd backend && npm install --save fluent-ffmpeg @types/fluent-ffmpeg sharp exif-parser @nestjs/websockets @nestjs/platform-socket.io socket.io"
```

## Packages:
1. **fluent-ffmpeg** - Video processing and metadata extraction
2. **@types/fluent-ffmpeg** - TypeScript definitions
3. **sharp** - Image processing and thumbnail generation
4. **exif-parser** - EXIF metadata extraction from photos
5. **@nestjs/websockets** - WebSocket support for real-time collaboration
6. **@nestjs/platform-socket.io** - Socket.IO adapter for NestJS
7. **socket.io** - WebSocket library

## System Dependencies (already in Dockerfile):
- ffmpeg (for video processing)
- libvips (for sharp image processing)

## Frontend Dependencies:

```bash
# Run inside the frontend container
docker compose -f docker-compose.dev.yml exec frontend sh -c "npm install --save socket.io-client date-fns"
```

1. **socket.io-client** - WebSocket client
2. **date-fns** - Date formatting (already used in CommentPanel)
