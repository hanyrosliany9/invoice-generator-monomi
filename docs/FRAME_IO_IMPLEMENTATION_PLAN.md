# Frame.io-like Media Collaboration Implementation Plan

> **This document has been split into two parts for easier reading and updates.**

---

## Documentation Structure

This implementation plan is now organized into two separate documents:

### **[Part 1: Planning & Architecture](./FRAME_IO_PART1_PLANNING.md)**
*Executive Summary → Database Schema*

**Contents:**
- Executive Summary (Project Goals, Key Capabilities, Success Metrics)
- Feature Overview (Core MVP Features, Advanced Features Phase 2-3)
- Technical Architecture (System Overview, Technology Stack)
- Database Schema (Prisma Models, Migration Strategy)

**What's covered:**
- All feature specifications for video AND photo workflows
- Star rating system (1-5 stars with keyboard shortcuts)
- Smart Collections (dynamic folders)
- Side-by-side photo comparison
- Complete database design with 14 models
- RAW image support (100+ formats)
- 33+ metadata fields

👉 **[Read Part 1: Planning & Architecture →](./FRAME_IO_PART1_PLANNING.md)**

---

### **[Part 2: Implementation & Operations](./FRAME_IO_PART2_IMPLEMENTATION.md)**
*Backend → Frontend → Testing → Deployment*

**Contents:**
- Backend Implementation (Services, Controllers, API Endpoints)
- Frontend Implementation (Components, Hooks, Services)
- Integration Points (Sidebar, Content Calendar, Projects)
- Implementation Phases (4 phases with detailed checklists)
- Technical Specifications (Infrastructure, Performance Requirements)
- Security & Permissions (RBAC, File Security, API Security)
- Testing Strategy (Unit, Integration, E2E tests)
- Future Enhancements (AI-Powered Features, Analytics, Mobile App)
- WebSocket Implementation Details (Option C2 - Subdomain Architecture)
- Deployment Checklist & Troubleshooting

**What's covered:**
- CollectionsService, MetadataService, ComparisonService implementations
- PhotoLightbox component with zoom/pan/loupe
- Keyboard shortcuts hook (1-5 star rating, navigation)
- Bulk selection & operations
- WebSocket gateway setup (subdomain `ws.monomiagency.com`)
- Cloudflare Tunnel #2 configuration
- Real-time collaboration with Socket.IO
- Complete testing examples

👉 **[Read Part 2: Implementation & Operations →](./FRAME_IO_PART2_IMPLEMENTATION.md)**

---

## Quick Navigation

**Planning Phase:**
- [Project Goals & Capabilities](./FRAME_IO_PART1_PLANNING.md#executive-summary)
- [Feature Overview](./FRAME_IO_PART1_PLANNING.md#feature-overview)
- [Technical Architecture Diagram](./FRAME_IO_PART1_PLANNING.md#technical-architecture)
- [Database Schema (14 Models)](./FRAME_IO_PART1_PLANNING.md#database-schema)

**Implementation Phase:**
- [Backend Services & Controllers](./FRAME_IO_PART2_IMPLEMENTATION.md#backend-implementation)
- [Frontend Components & Hooks](./FRAME_IO_PART2_IMPLEMENTATION.md#frontend-implementation)
- [Phase 1-4 Checklists](./FRAME_IO_PART2_IMPLEMENTATION.md#implementation-phases)
- [WebSocket Setup (Subdomain)](./FRAME_IO_PART2_IMPLEMENTATION.md#websocket-implementation-details-option-c2)

**Testing & Deployment:**
- [Unit/Integration/E2E Tests](./FRAME_IO_PART2_IMPLEMENTATION.md#testing-strategy)
- [Security & Permissions](./FRAME_IO_PART2_IMPLEMENTATION.md#security--permissions)
- [Deployment Checklist](./FRAME_IO_PART2_IMPLEMENTATION.md#deployment-checklist)
- [Troubleshooting Guide](./FRAME_IO_PART2_IMPLEMENTATION.md#troubleshooting)

---

## Document History

**Version 3.0** (2025-11-16)
- Split into 2 parts for easier reading and updates
- Part 1: Planning & Architecture (~1,300 lines)
- Part 2: Implementation & Operations (~2,300 lines)

**Version 2.0** (Previous)
- Updated with WebSocket Strategy Option C2 (Subdomain)
- Added photo features (star rating, smart collections, comparison)
- Unified video + photo workflows

**Version 1.0** (Initial)
- Video-only implementation plan

---

**Project Status:** Ready for Implementation
**Last Updated:** 2025-11-16
**Author:** Claude Code

**Infrastructure:**
- Home PC hosting via Cloudflare Tunnel
- Dual-tunnel setup:
  - `admin.monomiagency.com` (HTTP/REST API)
  - `ws.monomiagency.com` (WebSocket - Phase 2)
- Zero additional hosting cost (Cloudflare free tier)
