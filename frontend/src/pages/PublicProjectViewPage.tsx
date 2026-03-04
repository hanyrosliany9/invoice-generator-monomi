import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ConfigProvider, Typography, Spin, App, Modal, Input, Drawer, theme,
  Button, Tooltip,
} from 'antd';
import {
  QuestionCircleOutlined, UserOutlined, SendOutlined, CommentOutlined,
  HomeOutlined, FolderOutlined, EyeOutlined, GlobalOutlined,
} from '@ant-design/icons';
import { mediaCollabService, MediaAsset, MediaAssetFilters, FrameComment } from '../services/media-collab';
import { MediaLibrary } from '../components/media/MediaLibrary';
import { FilterBar } from '../components/media/FilterBar';
import { PhotoLightbox } from '../components/media/PhotoLightbox';
import { VideoReviewModal } from '../components/media/VideoReviewModal';
import { ComparisonView } from '../components/media/ComparisonView';
import { MetadataPanel } from '../components/media/MetadataPanel';
import { getProxyUrl } from '../utils/mediaProxy';
import { formatDistanceToNow } from 'date-fns';

const { Text, Paragraph } = Typography;

const GUEST_NAME_KEY = 'media-public-guest-name';

// ─── Injected styles ──────────────────────────────────────────────────────────
const PAGE_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500&display=swap');

*, *::before, *::after { box-sizing: border-box; }

body, html {
  overflow-x: hidden !important;
  scroll-behavior: smooth;
}

.pub-page {
  min-height: 100vh;
  background: #04050a;
  font-family: 'DM Sans', system-ui, sans-serif;
  color: rgba(255,255,255,0.88);
  overflow-x: hidden;
  position: relative;
}

/* ── Aurora orbs ── */
.pub-orb {
  position: fixed;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
  will-change: transform;
}
.pub-orb-1 {
  width: 700px; height: 700px;
  background: radial-gradient(circle at 50% 50%, rgba(34,211,238,0.18), transparent 65%);
  top: -280px; left: -220px;
  animation: pubFloat1 24s ease-in-out infinite;
}
.pub-orb-2 {
  width: 600px; height: 600px;
  background: radial-gradient(circle at 50% 50%, rgba(167,139,250,0.15), transparent 65%);
  bottom: -160px; right: -180px;
  animation: pubFloat2 30s ease-in-out infinite;
}
.pub-orb-3 {
  width: 440px; height: 440px;
  background: radial-gradient(circle at 50% 50%, rgba(52,211,153,0.10), transparent 65%);
  top: 42%; left: 55%;
  animation: pubFloat3 20s ease-in-out infinite;
}
@keyframes pubFloat1 {
  0%,100% { transform: translate(0,0) scale(1); }
  40% { transform: translate(40px,-50px) scale(1.06); }
  70% { transform: translate(-25px,30px) scale(0.94); }
}
@keyframes pubFloat2 {
  0%,100% { transform: translate(0,0) scale(1); }
  35% { transform: translate(-35px,40px) scale(1.04); }
  65% { transform: translate(20px,-25px) scale(0.96); }
}
@keyframes pubFloat3 {
  0%,100% { transform: translate(0,0) scale(1); }
  50% { transform: translate(-40px,-30px) scale(1.08); }
}

/* ── Glass panel ── */
.pub-glass {
  background: rgba(255,255,255,0.03);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 16px;
  /* NO overflow:hidden — it clips Ant Design dropdowns and internal controls */
}
.pub-glass-strong {
  background: rgba(255,255,255,0.05);
  backdrop-filter: blur(32px) saturate(200%);
  -webkit-backdrop-filter: blur(32px) saturate(200%);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 16px;
}

/* ── Navigation ── */
.pub-nav {
  position: sticky;
  top: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 32px;
  height: 68px;
  background: rgba(4,5,10,0.75);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.pub-nav-left {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}
.pub-nav-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.pub-logo-text {
  font-family: 'Syne', sans-serif;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.4px;
  color: rgba(255,255,255,0.95);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}
.pub-logo-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  font-weight: 400;
  color: rgba(255,255,255,0.35);
  letter-spacing: 0.5px;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 1px;
}

/* ── Badges & chips ── */
.pub-badge-views {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  background: rgba(34,211,238,0.08);
  border: 1px solid rgba(34,211,238,0.18);
  color: rgba(34,211,238,0.85);
  font-family: 'DM Sans', sans-serif;
}
.pub-guest-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  background: rgba(167,139,250,0.08);
  border: 1px solid rgba(167,139,250,0.2);
  color: rgba(167,139,250,0.9);
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'DM Sans', sans-serif;
  white-space: nowrap;
}
.pub-guest-chip:hover {
  background: rgba(167,139,250,0.16);
  border-color: rgba(167,139,250,0.35);
}
.pub-guest-chip-x {
  opacity: 0.5;
  font-size: 10px;
  margin-left: 2px;
}

/* ── Content layout ── */
.pub-content {
  position: relative;
  z-index: 1;
  max-width: 1440px;
  margin: 0 auto;
  padding: 32px 32px 64px;
}

/* ── Description card ── */
.pub-desc-card {
  padding: 20px 24px;
  margin-bottom: 24px;
  border-left: 2px solid rgba(34,211,238,0.35);
  border-radius: 0 12px 12px 0;
  background: rgba(34,211,238,0.04);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(34,211,238,0.12);
  border-left-width: 2px;
}
.pub-desc-text {
  color: rgba(255,255,255,0.65);
  font-size: 14px;
  line-height: 1.7;
  margin: 0;
}

/* ── Gallery card ── */
.pub-gallery-card {
  padding: 0;
  overflow: hidden;
}
.pub-gallery-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 24px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.pub-gallery-title {
  font-family: 'Syne', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: rgba(255,255,255,0.9);
  letter-spacing: -0.2px;
}
.pub-gallery-meta {
  font-size: 12px;
  color: rgba(255,255,255,0.3);
  font-family: 'DM Sans', sans-serif;
}
.pub-gallery-body {
  padding: 20px 24px 24px;
}

/* ── Breadcrumb ── */
.pub-breadcrumb {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  padding: 10px 14px;
  margin-bottom: 16px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px;
}
.pub-breadcrumb-sep {
  color: rgba(255,255,255,0.2);
  font-size: 13px;
  margin: 0 2px;
}
.pub-breadcrumb-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: rgba(255,255,255,0.55);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'DM Sans', sans-serif;
}
.pub-breadcrumb-btn:hover {
  background: rgba(255,255,255,0.07);
  color: rgba(255,255,255,0.85);
}

/* ── Feedback button ── */
.pub-feedback-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(52,211,153,0.9);
  background: rgba(52,211,153,0.08);
  border: 1px solid rgba(52,211,153,0.2);
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'DM Sans', sans-serif;
}
.pub-feedback-btn:hover, .pub-feedback-btn.active {
  background: rgba(52,211,153,0.16);
  border-color: rgba(52,211,153,0.4);
}

/* ── Shortcuts button ── */
.pub-shortcuts-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.5);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}
.pub-shortcuts-btn:hover {
  background: rgba(255,255,255,0.09);
  color: rgba(255,255,255,0.8);
}

/* ── Loading & error states ── */
.pub-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 16px;
}
.pub-error-card {
  text-align: center;
  padding: 48px 40px;
  max-width: 400px;
}
.pub-error-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.3;
}
.pub-error-title {
  font-family: 'Syne', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: rgba(255,255,255,0.8);
  margin-bottom: 8px;
}
.pub-error-sub {
  font-size: 14px;
  color: rgba(255,255,255,0.35);
  line-height: 1.6;
}

/* ── Comment panel (drawer) ── */
.pub-comment-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}
.pub-comment-input-area {
  padding: 12px 16px;
  border-top: 1px solid rgba(255,255,255,0.06);
  background: rgba(0,0,0,0.3);
}
.pub-comment-bubble {
  padding: 10px 14px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 10px;
  margin-bottom: 10px;
}
.pub-comment-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
}
.pub-comment-avatar {
  width: 24px; height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #22d3ee, #a78bfa);
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700; color: #fff;
  flex-shrink: 0;
}
.pub-comment-author {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255,255,255,0.75);
}
.pub-comment-time {
  font-size: 11px;
  color: rgba(255,255,255,0.28);
  margin-left: auto;
}
.pub-comment-text {
  font-size: 13px;
  color: rgba(255,255,255,0.65);
  line-height: 1.55;
}
.pub-comment-empty {
  text-align: center;
  padding: 40px 20px;
  font-size: 13px;
  color: rgba(255,255,255,0.25);
}

/* ── Footer ── */
.pub-footer {
  text-align: center;
  padding: 24px;
  font-size: 12px;
  color: rgba(255,255,255,0.2);
  font-family: 'DM Sans', sans-serif;
  letter-spacing: 0.3px;
}

/* ── Scrollbar ── */
.pub-page ::-webkit-scrollbar { width: 4px; height: 4px; }
.pub-page ::-webkit-scrollbar-track { background: transparent; }
.pub-page ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 2px; }

/* ── Ant Design overrides for dark glass ── */
.pub-page .ant-drawer-content-wrapper { box-shadow: -8px 0 40px rgba(0,0,0,0.6) !important; }
.pub-page .ant-drawer-content {
  background: rgba(6,7,14,0.92) !important;
  backdrop-filter: blur(28px) !important;
  -webkit-backdrop-filter: blur(28px) !important;
}
.pub-page .ant-drawer-header {
  background: rgba(6,7,14,0.5) !important;
  border-bottom: 1px solid rgba(255,255,255,0.06) !important;
  padding: 14px 20px !important;
}
.pub-page .ant-drawer-title {
  font-family: 'Syne', sans-serif !important;
  font-size: 14px !important;
  font-weight: 700 !important;
}
.pub-page .ant-modal-content {
  background: rgba(8,9,18,0.94) !important;
  backdrop-filter: blur(28px) !important;
  -webkit-backdrop-filter: blur(28px) !important;
  border: 1px solid rgba(255,255,255,0.08) !important;
  box-shadow: 0 24px 80px rgba(0,0,0,0.7) !important;
}
.pub-page .ant-modal-header {
  background: transparent !important;
  border-bottom: 1px solid rgba(255,255,255,0.06) !important;
  padding-bottom: 14px !important;
}
.pub-page .ant-modal-title {
  font-family: 'Syne', sans-serif !important;
  font-size: 16px !important;
  font-weight: 700 !important;
  color: rgba(255,255,255,0.9) !important;
}
.pub-page .ant-modal-close {
  color: rgba(255,255,255,0.35) !important;
}
.pub-page .ant-modal-close:hover {
  color: rgba(255,255,255,0.7) !important;
  background: rgba(255,255,255,0.07) !important;
}

/* Tooltip */
.pub-shortcut-tip { font-size: 11px; line-height: 1.7; }

/* ── Animations ── */
@keyframes pubFadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
.pub-fade-1 { animation: pubFadeUp 0.5s ease 0.05s both; }
.pub-fade-2 { animation: pubFadeUp 0.5s ease 0.15s both; }
.pub-fade-3 { animation: pubFadeUp 0.5s ease 0.25s both; }

/* ── FilterBar visibility fix ── */
/* Ant Design components inside the dark glass need explicit contrast */
.pub-page .ant-input-affix-wrapper,
.pub-page .ant-input,
.pub-page .ant-select-selector {
  background: rgba(255,255,255,0.08) !important;
  border-color: rgba(255,255,255,0.14) !important;
  color: rgba(255,255,255,0.88) !important;
}
.pub-page .ant-input-affix-wrapper:hover,
.pub-page .ant-select-selector:hover {
  border-color: rgba(34,211,238,0.4) !important;
}
.pub-page .ant-input-prefix,
.pub-page .ant-input-suffix,
.pub-page .ant-select-arrow {
  color: rgba(255,255,255,0.35) !important;
}
.pub-page .ant-select-selection-placeholder {
  color: rgba(255,255,255,0.28) !important;
}
.pub-page .ant-select-selection-item {
  color: rgba(255,255,255,0.88) !important;
}
.pub-page .ant-radio-button-wrapper {
  background: rgba(255,255,255,0.07) !important;
  border-color: rgba(255,255,255,0.14) !important;
  color: rgba(255,255,255,0.65) !important;
}
.pub-page .ant-radio-button-wrapper-checked {
  background: #22d3ee !important;
  border-color: #22d3ee !important;
  color: #04050a !important;
}
.pub-page .ant-collapse-header {
  color: rgba(255,255,255,0.75) !important;
}
.pub-page .ant-tag {
  border-color: rgba(255,255,255,0.12) !important;
}

/* ── MediaLibrary toolbar ── */
/* The view toggle + density controls sit inside MediaLibrary */
.pub-page .ant-btn-compact-item {
  border-color: rgba(255,255,255,0.14) !important;
}
.pub-page .ant-space-item .ant-btn-primary {
  background: #22d3ee !important;
  border-color: #22d3ee !important;
  color: #04050a !important;
}

/* ── Select dropdown menu ── */
.pub-page .ant-select-dropdown {
  background: #0d0f1e !important;
  border: 1px solid rgba(255,255,255,0.12) !important;
  box-shadow: 0 12px 40px rgba(0,0,0,0.6) !important;
}
.pub-page .ant-select-item {
  color: rgba(255,255,255,0.75) !important;
}
.pub-page .ant-select-item-option-active {
  background: rgba(34,211,238,0.1) !important;
}
.pub-page .ant-select-item-option-selected {
  background: rgba(34,211,238,0.15) !important;
  color: #22d3ee !important;
}

/* ── Mobile ── */
@media (max-width: 767px) {
  .pub-nav {
    height: auto;
    min-height: 56px;
    padding: 10px 16px;
    flex-wrap: wrap;
    gap: 8px;
  }
  .pub-logo-text { font-size: 16px; }
  .pub-content { padding: 12px 12px 48px; }
  .pub-gallery-header { padding: 14px 16px; flex-wrap: wrap; }
  .pub-gallery-body { padding: 14px 16px 16px; }
  .pub-glass { border-radius: 12px; }
  .pub-hide-mobile { display: none !important; }
  .pub-badge-views { display: none; }
  .pub-desc-card { padding: 14px 16px; margin-bottom: 14px; }
}
@media (max-width: 480px) {
  .pub-nav-right { gap: 6px; }
  .pub-logo-text { font-size: 15px; max-width: 180px; }
}
`;

// ── Dark ConfigProvider theme ─────────────────────────────────────────────────
const DARK_THEME = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorBgBase: '#060710',
    colorBgContainer: 'rgba(255,255,255,0.08)',
    colorBgElevated: '#0d0f1e',
    colorBgSpotlight: '#0d0f1e',
    colorBorder: 'rgba(255,255,255,0.15)',
    colorBorderSecondary: 'rgba(255,255,255,0.10)',
    colorText: 'rgba(255,255,255,0.88)',
    colorTextSecondary: 'rgba(255,255,255,0.52)',
    colorTextTertiary: 'rgba(255,255,255,0.35)',
    colorTextPlaceholder: 'rgba(255,255,255,0.28)',
    colorPrimary: '#22d3ee',
    colorPrimaryHover: '#38e1f5',
    colorPrimaryActive: '#06b6d4',
    borderRadius: 8,
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  components: {
    Modal: {
      contentBg: 'rgba(8,9,18,0.96)',
      headerBg: 'transparent',
    },
    Drawer: {
      colorBgContainer: 'rgba(6,7,14,0.95)',
    },
    Input: {
      colorBgContainer: 'rgba(255,255,255,0.08)',
      activeBorderColor: '#22d3ee',
      hoverBorderColor: 'rgba(34,211,238,0.4)',
    },
    Select: {
      colorBgContainer: 'rgba(255,255,255,0.08)',
      colorBgElevated: '#0d0f1e',
      optionActiveBg: 'rgba(34,211,238,0.1)',
      optionSelectedBg: 'rgba(34,211,238,0.15)',
    },
    Button: {
      defaultBg: 'rgba(255,255,255,0.09)',
      defaultBorderColor: 'rgba(255,255,255,0.16)',
      defaultColor: 'rgba(255,255,255,0.82)',
      defaultHoverBg: 'rgba(255,255,255,0.14)',
      defaultHoverBorderColor: 'rgba(255,255,255,0.25)',
      defaultHoverColor: 'rgba(255,255,255,0.96)',
    },
    Radio: {
      buttonBg: 'rgba(255,255,255,0.07)',
      buttonColor: 'rgba(255,255,255,0.65)',
      buttonSolidCheckedBg: '#22d3ee',
      buttonSolidCheckedColor: '#04050a',
      colorBorder: 'rgba(255,255,255,0.15)',
    },
    Tag: {
      defaultBg: 'rgba(255,255,255,0.09)',
      defaultColor: 'rgba(255,255,255,0.72)',
    },
    Collapse: {
      contentBg: 'rgba(255,255,255,0.05)',
      headerBg: 'rgba(255,255,255,0.07)',
    },
    Badge: {
      colorBgContainer: 'rgba(255,255,255,0.08)',
    },
  },
};

// ── GuestNameModal ────────────────────────────────────────────────────────────
interface GuestNameModalProps {
  open: boolean;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}
const GuestNameModal: React.FC<GuestNameModalProps> = ({ open, onConfirm, onCancel }) => {
  const [name, setName] = useState('');
  return (
    <Modal
      title="Who's giving feedback?"
      open={open}
      onOk={() => { if (name.trim()) onConfirm(name.trim()); }}
      onCancel={onCancel}
      okText="Continue"
      okButtonProps={{ disabled: !name.trim(), style: { background: '#22d3ee', borderColor: '#22d3ee', color: '#04050a', fontWeight: 600 } }}
      cancelButtonProps={{ style: { background: 'transparent', borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)' } }}
      width={380}
    >
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '0 0 16px', lineHeight: 1.6 }}>
        Enter your name so reviewers can attribute your feedback.
      </p>
      <Input
        autoFocus
        placeholder="Your name"
        prefix={<UserOutlined style={{ color: 'rgba(255,255,255,0.25)' }} />}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onPressEnter={() => { if (name.trim()) onConfirm(name.trim()); }}
        maxLength={60}
        size="large"
      />
    </Modal>
  );
};

// ── ImageCommentPanel ─────────────────────────────────────────────────────────
interface ImageCommentPanelProps {
  asset: MediaAsset;
  shareToken: string;
  guestName: string;
}
const ImageCommentPanel: React.FC<ImageCommentPanelProps> = ({ asset, shareToken, guestName }) => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['public-comments', asset.id, shareToken],
    queryFn: () => mediaCollabService.getPublicAssetComments(shareToken, asset.id),
    enabled: !!asset.id,
  });

  const addMutation = useMutation({
    mutationFn: (content: string) =>
      mediaCollabService.createPublicComment(shareToken, asset.id, {
        content,
        guestName: guestName || 'Anonymous',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-comments', asset.id, shareToken] });
      setText('');
      message.success('Feedback added');
    },
    onError: () => message.error('Failed to send feedback'),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="pub-comment-list">
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <Spin />
          </div>
        ) : (comments as any[]).length === 0 ? (
          <div className="pub-comment-empty">
            <div style={{ fontSize: 28, marginBottom: 10 }}>💬</div>
            No feedback yet.<br />Be the first!
          </div>
        ) : (
          (comments as any[]).map((c) => (
            <div key={c.id} className="pub-comment-bubble">
              <div className="pub-comment-meta">
                <div className="pub-comment-avatar">
                  {(c.author?.name || 'A').charAt(0).toUpperCase()}
                </div>
                <span className="pub-comment-author">{c.author?.name || 'Anonymous'}</span>
                <span className="pub-comment-time">
                  {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className="pub-comment-text">{c.text}</p>
            </div>
          ))
        )}
      </div>

      <div className="pub-comment-input-area">
        <Input.TextArea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add your feedback…"
          autoSize={{ minRows: 2, maxRows: 5 }}
          style={{ marginBottom: 8, fontSize: 13 }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="primary"
            icon={<SendOutlined />}
            size="small"
            disabled={!text.trim()}
            loading={addMutation.isPending}
            onClick={() => { if (text.trim()) addMutation.mutate(text.trim()); }}
            style={{ background: '#22d3ee', borderColor: '#22d3ee', color: '#04050a', fontWeight: 600 }}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── PublicProjectViewPage ─────────────────────────────────────────────────────
export const PublicProjectViewPage: React.FC = () => {
  const { token: shareToken } = useParams<{ token: string }>();
  const { message } = App.useApp();

  // Guest identity — persisted in localStorage
  const [guestName, setGuestName] = useState<string>(() => {
    try { return localStorage.getItem(GUEST_NAME_KEY) || ''; } catch { return ''; }
  });
  const [guestNameModalOpen, setGuestNameModalOpen] = useState(false);
  const pendingCommentRef = useRef<(() => void) | null>(null);

  const requireGuestName = useCallback((onConfirmed: () => void) => {
    if (guestName) {
      onConfirmed();
    } else {
      pendingCommentRef.current = onConfirmed;
      setGuestNameModalOpen(true);
    }
  }, [guestName]);

  const handleGuestNameConfirm = (name: string) => {
    try { localStorage.setItem(GUEST_NAME_KEY, name); } catch { /* noop */ }
    setGuestName(name);
    setGuestNameModalOpen(false);
    pendingCommentRef.current?.();
    pendingCommentRef.current = null;
  };

  // Filter state
  const [filters, setFilters] = useState<MediaAssetFilters>({
    sortBy: 'uploadedAt',
    sortOrder: 'desc',
  });

  // Folder navigation
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Viewer state
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [videoPlayerVisible, setVideoPlayerVisible] = useState(false);
  const [videoPlayerKey, setVideoPlayerKey] = useState(0);
  const [comparisonAssetIds, setComparisonAssetIds] = useState<string[]>([]);
  const [metadataPanelVisible, setMetadataPanelVisible] = useState(false);
  const [imageCommentDrawerOpen, setImageCommentDrawerOpen] = useState(false);

  // ── Data fetching ────────────────────────────────────────────────────────
  const { data: project, isLoading: projectLoading, error: projectError } = useQuery({
    queryKey: ['public-project', shareToken],
    queryFn: () => mediaCollabService.getPublicProject(shareToken!),
    enabled: !!shareToken,
  });

  const { data: assets, isLoading: assetsLoading, refetch: refetchAssets } = useQuery({
    queryKey: ['public-assets', shareToken],
    queryFn: () => mediaCollabService.getPublicAssets(shareToken!),
    enabled: !!shareToken,
  });

  const { data: folders } = useQuery({
    queryKey: ['public-folders', shareToken],
    queryFn: () => mediaCollabService.getPublicFolders(shareToken!),
    enabled: !!shareToken,
  });

  // Signed JWT for Cloudflare Worker — valid 24h
  const { data: mediaToken } = useQuery({
    queryKey: ['public-media-token', shareToken],
    queryFn: () => mediaCollabService.getPublicMediaToken(shareToken!),
    enabled: !!shareToken,
    staleTime: 23 * 60 * 60 * 1000,
  });

  // ── Derived data ─────────────────────────────────────────────────────────
  const currentFolderAssets = useMemo(() => {
    if (!assets) return [];
    return assets.filter(asset => asset.folderId === currentFolderId);
  }, [assets, currentFolderId]);

  const currentSubfolders = useMemo(() => {
    if (!folders) return [];
    return folders.filter(f => f.parentId === currentFolderId);
  }, [folders, currentFolderId]);

  const currentFolderPath = useMemo(() => {
    if (!currentFolderId || !folders) return [];
    const path: typeof folders = [];
    let folderId: string | null | undefined = currentFolderId;
    while (folderId) {
      const folder = folders.find(f => f.id === folderId);
      if (!folder) break;
      path.unshift(folder);
      folderId = folder.parentId;
    }
    return path;
  }, [currentFolderId, folders]);

  const navigableAssets = useMemo(() => {
    let base = currentFolderAssets.filter(
      a => a.mediaType === 'IMAGE' || a.mediaType === 'RAW_IMAGE'
    );
    if (filters.search) {
      const q = filters.search.toLowerCase();
      base = base.filter(a =>
        a.originalName.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q)
      );
    }
    if (filters.mediaType) base = base.filter(a => a.mediaType === filters.mediaType);
    if (filters.status) base = base.filter(a => a.status === filters.status);
    if (filters.starRating) base = base.filter(a => a.starRating && a.starRating >= filters.starRating!);
    if (filters.sortBy) {
      base = [...base].sort((a, b) => {
        let comparison = 0;
        switch (filters.sortBy) {
          case 'uploadedAt': comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime(); break;
          case 'originalName': comparison = a.originalName.localeCompare(b.originalName); break;
          case 'starRating': comparison = (a.starRating || 0) - (b.starRating || 0); break;
        }
        return filters.sortOrder === 'asc' ? comparison : -comparison;
      });
    }
    return base;
  }, [currentFolderAssets, filters]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleAssetClick = (asset: MediaAsset) => {
    setSelectedAsset(asset);
    if (asset.mediaType === 'IMAGE' || asset.mediaType === 'RAW_IMAGE') {
      setLightboxVisible(true);
    } else if (asset.mediaType === 'VIDEO') {
      setVideoPlayerVisible(true);
    }
  };

  const navigateToAsset = (direction: 'prev' | 'next') => {
    if (!selectedAsset) return;
    const currentIndex = navigableAssets.findIndex(a => a.id === selectedAsset.id);
    if (currentIndex === -1) return;
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < navigableAssets.length) {
      setSelectedAsset(navigableAssets[newIndex]);
    }
  };

  const handleStarRatingChange = async (assetId: string, rating: number) => {
    if (selectedAsset && selectedAsset.id === assetId) {
      setSelectedAsset({ ...selectedAsset, starRating: rating });
    }
    try {
      await mediaCollabService.updatePublicAssetRating(shareToken!, assetId, rating);
      refetchAssets();
    } catch {
      message.error('Failed to update rating');
    }
  };

  const handleStatusChange = async (assetId: string, status: string) => {
    try {
      await mediaCollabService.updatePublicAssetStatus(shareToken!, assetId, status);
      refetchAssets();
    } catch {
      message.error('Failed to update status');
    }
  };

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (metadataPanelVisible || comparisonAssetIds.length > 0) return;

      switch (event.key) {
        case 'ArrowLeft':
          if (lightboxVisible && selectedAsset) { event.preventDefault(); navigateToAsset('prev'); }
          break;
        case 'ArrowRight':
          if (lightboxVisible && selectedAsset) { event.preventDefault(); navigateToAsset('next'); }
          break;
        case 'Escape':
          if (lightboxVisible) { event.preventDefault(); setLightboxVisible(false); }
          else if (videoPlayerVisible) { event.preventDefault(); setVideoPlayerVisible(false); }
          break;
        case ' ':
        case 'Space':
          if (selectedAsset && !lightboxVisible && !videoPlayerVisible) {
            event.preventDefault();
            if (selectedAsset.mediaType === 'IMAGE' || selectedAsset.mediaType === 'RAW_IMAGE') {
              setLightboxVisible(true);
            } else if (selectedAsset.mediaType === 'VIDEO') {
              setVideoPlayerVisible(true);
            }
          }
          break;
        case '1': case '2': case '3': case '4': case '5':
          if (selectedAsset && !lightboxVisible) {
            event.preventDefault();
            handleStarRatingChange(selectedAsset.id, parseInt(event.key));
          }
          break;
        case 'i': case 'I':
          if (selectedAsset) { event.preventDefault(); setMetadataPanelVisible(v => !v); }
          break;
        case 'c': case 'C':
          if (selectedAsset && (selectedAsset.mediaType === 'IMAGE' || selectedAsset.mediaType === 'RAW_IMAGE')) {
            event.preventDefault();
            setImageCommentDrawerOpen(v => !v);
          }
          break;
      }
    },
    [lightboxVisible, videoPlayerVisible, selectedAsset, metadataPanelVisible, comparisonAssetIds]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ── Lightbox helpers ──────────────────────────────────────────────────────
  const selectedIndex = selectedAsset
    ? navigableAssets.findIndex(a => a.id === selectedAsset.id)
    : -1;
  const prevAsset = selectedIndex > 0 ? navigableAssets[selectedIndex - 1] : null;
  const nextAsset = selectedIndex < navigableAssets.length - 1 ? navigableAssets[selectedIndex + 1] : null;
  const isImageAsset = selectedAsset &&
    (selectedAsset.mediaType === 'IMAGE' || selectedAsset.mediaType === 'RAW_IMAGE');

  // ── Early returns ─────────────────────────────────────────────────────────
  if (!shareToken) {
    return (
      <ConfigProvider theme={DARK_THEME}>
        <div className="pub-page">
          <style>{PAGE_STYLES}</style>
          <div className="pub-orb pub-orb-1" /><div className="pub-orb pub-orb-2" />
          <div className="pub-center">
            <div className="pub-glass pub-glass-strong pub-error-card">
              <div className="pub-error-icon">🔗</div>
              <div className="pub-error-title">Invalid Link</div>
              <div className="pub-error-sub">This share link appears to be broken or missing.</div>
            </div>
          </div>
        </div>
      </ConfigProvider>
    );
  }

  if (projectLoading || assetsLoading) {
    return (
      <ConfigProvider theme={DARK_THEME}>
        <div className="pub-page">
          <style>{PAGE_STYLES}</style>
          <div className="pub-orb pub-orb-1" /><div className="pub-orb pub-orb-2" /><div className="pub-orb pub-orb-3" />
          <div className="pub-center">
            <Spin size="large" />
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
              Loading gallery…
            </span>
          </div>
        </div>
      </ConfigProvider>
    );
  }

  if (projectError) {
    return (
      <ConfigProvider theme={DARK_THEME}>
        <div className="pub-page">
          <style>{PAGE_STYLES}</style>
          <div className="pub-orb pub-orb-1" /><div className="pub-orb pub-orb-2" />
          <div className="pub-center">
            <div className="pub-glass pub-glass-strong pub-error-card">
              <div className="pub-error-icon">🚫</div>
              <div className="pub-error-title">Link Not Found</div>
              <div className="pub-error-sub">This public link is invalid or has been disabled by the owner.</div>
            </div>
          </div>
        </div>
      </ConfigProvider>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ConfigProvider theme={DARK_THEME}>
      <div className="pub-page">
        <style>{PAGE_STYLES}</style>

        {/* Aurora background orbs */}
        <div className="pub-orb pub-orb-1" />
        <div className="pub-orb pub-orb-2" />
        <div className="pub-orb pub-orb-3" />

        {/* ── Navigation ── */}
        <nav className="pub-nav">
          <div className="pub-nav-left">
            <div className="pub-logo-text">{project?.name}</div>
            <div className="pub-logo-sub">
              <GlobalOutlined style={{ fontSize: 9 }} />
              Public Gallery
            </div>
          </div>

          <div className="pub-nav-right">
            <div className="pub-badge-views">
              <EyeOutlined style={{ fontSize: 11 }} />
              {project?.publicViewCount ?? 0} views
            </div>

            {guestName ? (
              <div
                className="pub-guest-chip"
                onClick={() => {
                  try { localStorage.removeItem(GUEST_NAME_KEY); } catch { /* noop */ }
                  setGuestName('');
                }}
              >
                <UserOutlined style={{ fontSize: 11 }} />
                {guestName}
                <span className="pub-guest-chip-x">✕</span>
              </div>
            ) : (
              <div
                className="pub-guest-chip"
                onClick={() => { pendingCommentRef.current = null; setGuestNameModalOpen(true); }}
              >
                <UserOutlined style={{ fontSize: 11 }} />
                Set name
              </div>
            )}

            <Tooltip
              title={
                <div className="pub-shortcut-tip">
                  <strong>Shortcuts</strong>
                  <div>← / → — Navigate</div>
                  <div>1–5 — Rate</div>
                  <div>Space — Preview</div>
                  <div>I — Info</div>
                  <div>C — Comments</div>
                  <div>Esc — Close</div>
                </div>
              }
              placement="bottomRight"
            >
              <div className="pub-shortcuts-btn">
                <QuestionCircleOutlined />
              </div>
            </Tooltip>
          </div>
        </nav>

        {/* ── Main content ── */}
        <main className="pub-content">

          {/* Description */}
          {project?.description && (
            <div className="pub-desc-card pub-fade-1">
              <p className="pub-desc-text">{project.description}</p>
            </div>
          )}

          {/* Gallery card */}
          <div className="pub-glass pub-gallery-card pub-fade-2">
            <div className="pub-gallery-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span className="pub-gallery-title">Media Gallery</span>
                <span className="pub-gallery-meta">
                  {currentFolderAssets.length} asset{currentFolderAssets.length !== 1 ? 's' : ''}
                  {currentSubfolders.length > 0 && ` · ${currentSubfolders.length} folder${currentSubfolders.length !== 1 ? 's' : ''}`}
                </span>
              </div>

              {selectedAsset && isImageAsset && (
                <button
                  className={`pub-feedback-btn${imageCommentDrawerOpen ? ' active' : ''}`}
                  onClick={() => requireGuestName(() => setImageCommentDrawerOpen(true))}
                >
                  <CommentOutlined style={{ fontSize: 13 }} />
                  Feedback
                </button>
              )}
            </div>

            <div className="pub-gallery-body">
              {/* Breadcrumb */}
              {(currentFolderId || currentFolderPath.length > 0) && (
                <div className="pub-breadcrumb">
                  <button className="pub-breadcrumb-btn" onClick={() => setCurrentFolderId(null)}>
                    <HomeOutlined style={{ fontSize: 11 }} />
                    Root
                  </button>
                  {currentFolderPath.map(folder => (
                    <React.Fragment key={folder.id}>
                      <span className="pub-breadcrumb-sep">/</span>
                      <button className="pub-breadcrumb-btn" onClick={() => setCurrentFolderId(folder.id)}>
                        <FolderOutlined style={{ fontSize: 11 }} />
                        {folder.name}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              )}

              {/* Filter bar */}
              <div style={{ marginBottom: 16 }}>
                <FilterBar
                  filters={filters}
                  onFilterChange={setFilters}
                  resultCount={currentFolderAssets.length}
                  totalCount={assets?.length}
                />
              </div>

              {/* Media grid */}
              <MediaLibrary
                assets={currentFolderAssets}
                folders={currentSubfolders}
                onAssetClick={handleAssetClick}
                onCompare={(assetIds) => setComparisonAssetIds(assetIds)}
                onFolderDoubleClick={(folderId) => setCurrentFolderId(folderId)}
                filters={filters}
                disableDndContext={true}
                mediaToken={mediaToken ?? null}
                readOnly={true}
                onRatingChange={handleStarRatingChange}
                onStatusChange={handleStatusChange}
              />
            </div>
          </div>

          <div className="pub-footer pub-fade-3">
            Powered by Monomi Media Collaboration
          </div>
        </main>

        {/* ── Photo Lightbox ── */}
        {selectedAsset && isImageAsset && (
          <PhotoLightbox
            visible={lightboxVisible}
            imageUrl={getProxyUrl(selectedAsset.url, mediaToken)}
            thumbnailUrl={selectedAsset.thumbnailUrl ? getProxyUrl(selectedAsset.thumbnailUrl, mediaToken) : undefined}
            imageName={selectedAsset.originalName}
            onClose={() => setLightboxVisible(false)}
            onPrevious={() => navigateToAsset('prev')}
            onNext={() => navigateToAsset('next')}
            hasPrevious={selectedIndex > 0}
            hasNext={selectedIndex < navigableAssets.length - 1}
            nextImageUrl={nextAsset ? getProxyUrl(nextAsset.url, mediaToken) : undefined}
            previousImageUrl={prevAsset ? getProxyUrl(prevAsset.url, mediaToken) : undefined}
            currentRating={selectedAsset.starRating}
            onRatingChange={(rating) => handleStarRatingChange(selectedAsset.id, rating)}
          />
        )}

        {/* ── Video Review Modal ── */}
        {selectedAsset && selectedAsset.mediaType === 'VIDEO' && (
          <VideoReviewModal
            key={videoPlayerKey}
            visible={videoPlayerVisible}
            asset={selectedAsset}
            mediaToken={mediaToken ?? null}
            publicShareToken={shareToken ?? null}
            guestName={guestName}
            onPublicRatingChange={(rating) => handleStarRatingChange(selectedAsset.id, rating)}
            onPublicStatusChange={(status) => handleStatusChange(selectedAsset.id, status)}
            onClose={() => {
              setVideoPlayerVisible(false);
              setVideoPlayerKey(k => k + 1);
            }}
          />
        )}

        {/* ── Image Comment Drawer ── */}
        <Drawer
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CommentOutlined style={{ color: '#22d3ee' }} />
              {selectedAsset?.originalName}
            </span>
          }
          open={imageCommentDrawerOpen && !!selectedAsset && !!isImageAsset}
          onClose={() => setImageCommentDrawerOpen(false)}
          width={380}
          styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' } }}
        >
          {selectedAsset && isImageAsset && shareToken && (
            <ImageCommentPanel
              asset={selectedAsset}
              shareToken={shareToken}
              guestName={guestName}
            />
          )}
        </Drawer>

        {/* ── Comparison View ── */}
        <Modal
          title={`Compare (${comparisonAssetIds.length} assets)`}
          open={comparisonAssetIds.length > 0}
          onCancel={() => setComparisonAssetIds([])}
          footer={null}
          width="90%"
          style={{ top: 20 }}
          styles={{ body: { height: '80vh', overflow: 'auto' } }}
        >
          {comparisonAssetIds.length > 0 && (
            <ComparisonView
              assetIds={comparisonAssetIds}
              onClose={() => setComparisonAssetIds([])}
              mediaToken={mediaToken ?? undefined}
            />
          )}
        </Modal>

        {/* ── Metadata Panel ── */}
        {selectedAsset && (
          <Modal
            title="Asset Details"
            open={metadataPanelVisible}
            onCancel={() => setMetadataPanelVisible(false)}
            footer={null}
            width={500}
          >
            <MetadataPanel
              asset={{
                id: selectedAsset.id,
                filename: selectedAsset.originalName,
                mediaType: selectedAsset.mediaType,
                size: typeof selectedAsset.size === 'string'
                  ? parseInt(selectedAsset.size, 10)
                  : selectedAsset.size,
                duration: selectedAsset.duration,
                width: selectedAsset.width,
                height: selectedAsset.height,
                fps: selectedAsset.fps,
                codec: selectedAsset.codec,
                bitrate: selectedAsset.bitrate,
                createdAt: selectedAsset.uploadedAt,
                metadata: selectedAsset.metadata,
              }}
            />
          </Modal>
        )}

        {/* ── Guest Name Modal ── */}
        <GuestNameModal
          open={guestNameModalOpen}
          onConfirm={handleGuestNameConfirm}
          onCancel={() => {
            setGuestNameModalOpen(false);
            pendingCommentRef.current = null;
          }}
        />
      </div>
    </ConfigProvider>
  );
};

export default PublicProjectViewPage;
