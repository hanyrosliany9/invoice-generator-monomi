import React, { useState, useCallback } from 'react';
import { Modal, Upload, Form, Input, App, Progress, Card, Space, Typography, Button, Tag } from 'antd';
import type { UploadFile } from 'antd';
import { InboxOutlined, CheckCircleOutlined, LoadingOutlined, CloseCircleOutlined, PauseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { mediaCollabService } from '../../services/media-collab';
import { DuplicateFileModal, ConflictResolution, DuplicateFile } from './DuplicateFileModal';
import pLimit from 'p-limit';
import axios from 'axios';

const { Dragger } = Upload;
const { TextArea } = Input;
const { Text } = Typography;

interface UploadMediaModalProps {
  visible: boolean;
  projectId: string;
  folderId?: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FileWithResolution {
  file: File;
  resolution?: ConflictResolution;
}

interface UploadQueueItem {
  id: string;
  file: File;
  resolution?: ConflictResolution;
  status: 'waiting' | 'uploading' | 'completed' | 'failed' | 'paused';
  progress: number;
  uploadedBytes: number;
  totalBytes: number;
  speed: number; // bytes per second
  eta: number; // seconds remaining
  error?: string;
  startTime?: number;
  uploadUrl?: string; // Presigned URL for direct R2 upload
  r2Key?: string; // R2 object key for registered assets
}

/**
 * UploadMediaModal - Professional Upload System
 *
 * Features (Phase 1 - Quick Wins):
 * ✅ Parallel uploads (4 concurrent)
 * ✅ Per-file progress tracking
 * ✅ Upload speed and ETA display
 * ✅ Enhanced progress UI
 * ✅ Retry failed uploads
 * ✅ Duplicate detection with conflict resolution
 *
 * Inspired by Google Drive and Frame.io
 */
export const UploadMediaModal: React.FC<UploadMediaModalProps> = ({
  visible,
  projectId,
  folderId,
  onClose,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filesWithResolutions, setFilesWithResolutions] = useState<FileWithResolution[]>([]);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);

  // Duplicate detection state
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicateModalVisible, setDuplicateModalVisible] = useState(false);
  const [currentDuplicates, setCurrentDuplicates] = useState<DuplicateFile[]>([]);
  const [currentDuplicateIndex, setCurrentDuplicateIndex] = useState(0);
  const [globalResolution, setGlobalResolution] = useState<ConflictResolution | null>(null);

  // Calculate overall progress
  const overallProgress = uploadQueue.length > 0
    ? Math.round((uploadQueue.reduce((sum, item) => sum + item.progress, 0) / uploadQueue.length))
    : 0;

  const totalUploadedBytes = uploadQueue.reduce((sum, item) => sum + item.uploadedBytes, 0);
  const totalBytes = uploadQueue.reduce((sum, item) => sum + item.totalBytes, 0);
  const averageSpeed = uploadQueue.filter(item => item.status === 'uploading').reduce((sum, item) => sum + item.speed, 0);
  const overallETA = averageSpeed > 0 ? Math.round((totalBytes - totalUploadedBytes) / averageSpeed) : 0;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond < 1024) return `${bytesPerSecond} B/s`;
    if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const updateQueueItem = useCallback((id: string, updates: Partial<UploadQueueItem>) => {
    setUploadQueue(prev => prev.map(item =>
      item.id === id ? { ...item, ...updates } : item
    ));
  }, []);

  const uploadSingleFile = async (
    queueItem: UploadQueueItem,
    description?: string
  ): Promise<{ key: string; filename: string; originalName: string; mimeType: string; size: number }> => {
    const { file, resolution, id, uploadUrl } = queueItem;

    // Skip if resolution is 'skip'
    if (resolution === 'skip') {
      updateQueueItem(id, { status: 'completed', progress: 100 });
      return { key: '', filename: '', originalName: file.name, mimeType: file.type, size: file.size };
    }

    const startTime = Date.now();
    updateQueueItem(id, { status: 'uploading', startTime });

    // Retry with exponential backoff
    const MAX_RETRIES = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          // Exponential backoff with jitter: 1s, 2s, 4s + random 0-500ms
          const delay = Math.pow(2, attempt - 1) * 1000 + Math.random() * 500;
          await new Promise(resolve => setTimeout(resolve, delay));
          updateQueueItem(id, { status: 'uploading', error: undefined });
        }

        if (uploadUrl) {
          // Direct R2 upload via presigned URL (bypasses backend entirely)
          await axios.put(uploadUrl, file, {
            headers: {
              'Content-Type': file.type,
            },
            timeout: 5 * 60 * 1000, // 5 minutes per file
            onUploadProgress: (progressEvent) => {
              const { loaded, total } = progressEvent;
              const totalBytes = total || file.size;
              const progress = totalBytes ? Math.round((loaded / totalBytes) * 100) : 0;
              const elapsed = (Date.now() - startTime) / 1000;
              const speed = elapsed > 0 ? loaded / elapsed : 0;
              const eta = speed > 0 && totalBytes ? Math.round((totalBytes - loaded) / speed) : 0;

              updateQueueItem(id, {
                progress,
                uploadedBytes: loaded,
                totalBytes,
                speed,
                eta,
              });
            },
          });
        } else {
          // Fallback: upload through backend (for dev/non-R2 environments)
          await mediaCollabService.uploadAsset(
            projectId,
            file,
            description,
            folderId || undefined,
            resolution,
            (progressEvent) => {
              const { loaded, total } = progressEvent;
              const totalBytes = total || file.size;
              const progress = totalBytes ? Math.round((loaded / totalBytes) * 100) : 0;
              const elapsed = (Date.now() - startTime) / 1000;
              const speed = elapsed > 0 ? loaded / elapsed : 0;
              const eta = speed > 0 && totalBytes ? Math.round((totalBytes - loaded) / speed) : 0;

              updateQueueItem(id, {
                progress,
                uploadedBytes: loaded,
                totalBytes,
                speed,
                eta,
              });
            }
          );
        }

        updateQueueItem(id, {
          status: 'completed',
          progress: 100,
          uploadedBytes: file.size,
          eta: 0,
        });

        return {
          key: queueItem.r2Key || '',
          filename: file.name,
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
        };
      } catch (error: unknown) {
        lastError = error as Error;
        if (attempt < MAX_RETRIES) {
          updateQueueItem(id, {
            error: `Retry ${attempt + 1}/${MAX_RETRIES}...`,
          });
        }
      }
    }

    const errorMessage = lastError?.message || 'Upload failed';
    updateQueueItem(id, {
      status: 'failed',
      error: errorMessage,
    });
    throw lastError;
  };

  const performUpload = async (filesWithRes: FileWithResolution[], description?: string) => {
    setUploading(true);

    try {
      // Step 1: Get presigned URLs for all non-skipped files
      const filesToUpload = filesWithRes.filter(f => f.resolution !== 'skip');

      let presignedData: Array<{ filename: string; key: string; uploadUrl: string; expiresIn: number }> = [];

      if (filesToUpload.length > 0) {
        try {
          // Request presigned URLs in batches of 100
          const BATCH_SIZE = 100;
          for (let i = 0; i < filesToUpload.length; i += BATCH_SIZE) {
            const batch = filesToUpload.slice(i, i + BATCH_SIZE);
            const result = await mediaCollabService.getPresignedUploadUrls(
              projectId,
              batch.map(f => ({
                filename: f.file.name,
                mimeType: f.file.type,
                size: f.file.size,
              })),
            );
            presignedData.push(...result.urls);
          }
        } catch (err) {
          console.warn('[UploadMediaModal] Presigned URLs not available, falling back to proxy upload:', err);
          // Fallback: presignedData stays empty, will use backend proxy
        }
      }

      // Step 2: Build upload queue with presigned URLs mapped to files
      let presignedIndex = 0;
      const queue: UploadQueueItem[] = filesWithRes.map((item, index) => {
        let uploadUrl: string | undefined;
        let r2Key: string | undefined;

        if (item.resolution !== 'skip' && presignedIndex < presignedData.length) {
          uploadUrl = presignedData[presignedIndex].uploadUrl;
          r2Key = presignedData[presignedIndex].key;
          presignedIndex++;
        }

        return {
          id: `upload-${Date.now()}-${index}`,
          file: item.file,
          resolution: item.resolution,
          status: 'waiting' as const,
          progress: 0,
          uploadedBytes: 0,
          totalBytes: item.file.size,
          speed: 0,
          eta: 0,
          uploadUrl,
          r2Key,
        };
      });

      setUploadQueue(queue);

      // Step 3: Upload files with concurrency limit (6 concurrent - Frame.io inspired)
      const CONCURRENT_UPLOADS = 6;
      const limit = pLimit(CONCURRENT_UPLOADS);

      const uploadResults: Array<{ key: string; filename: string; originalName: string; mimeType: string; size: number }> = [];

      const uploadPromises = queue
        .filter(item => item.resolution !== 'skip')
        .map(queueItem =>
          limit(async () => {
            const result = await uploadSingleFile(queueItem, description);
            if (result.key) {
              uploadResults.push(result);
            }
            return result;
          })
        );

      const results = await Promise.allSettled(uploadPromises);

      // Step 4: Register successfully uploaded assets in database (batch)
      if (uploadResults.length > 0) {
        try {
          // Register in batches of 100
          const REG_BATCH_SIZE = 100;
          for (let i = 0; i < uploadResults.length; i += REG_BATCH_SIZE) {
            const batch = uploadResults.slice(i, i + REG_BATCH_SIZE);
            await mediaCollabService.registerBatchAssets(projectId, batch.map(r => ({
              key: r.key,
              filename: r.filename,
              originalName: r.originalName,
              mimeType: r.mimeType,
              size: r.size,
              folderId: folderId || undefined,
              description,
            })));
          }
        } catch (regError) {
          console.error('[UploadMediaModal] Failed to register assets:', regError);
          message.error('Files uploaded but failed to register in database. Please refresh.');
        }
      }

      // Step 5: Show summary
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      const skipped = queue.filter(item => item.resolution === 'skip').length;

      const messages: string[] = [];
      if (succeeded > 0) messages.push(`${succeeded} file${succeeded > 1 ? 's' : ''} uploaded`);
      if (skipped > 0) messages.push(`${skipped} skipped`);
      if (failed > 0) messages.push(`${failed} failed`);

      if (failed === 0) {
        message.success(messages.join(', '));
      } else if (succeeded > 0) {
        message.warning(messages.join(', ') + ' - You can retry failed uploads');
      } else {
        message.error('All uploads failed - You can retry');
      }

      if (failed === 0) {
        onSuccess && onSuccess();
        setTimeout(() => {
          form.resetFields();
          setSelectedFiles([]);
          setFilesWithResolutions([]);
          setCurrentDuplicates([]);
          setGlobalResolution(null);
          setUploadQueue([]);
          onClose();
        }, 1500);
      }
    } catch (error: unknown) {
      message.error((error as Error).message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRetry = async (queueItemId: string) => {
    const queueItem = uploadQueue.find(item => item.id === queueItemId);
    if (!queueItem) return;

    const description = form.getFieldValue('description');
    updateQueueItem(queueItemId, { status: 'waiting', error: undefined, progress: 0 });

    try {
      await uploadSingleFile(queueItem, description);
      message.success(`${queueItem.file.name} uploaded successfully`);
    } catch (error: unknown) {
      message.error(`Failed to upload ${queueItem.file.name}`);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      message.error('Please select at least one file');
      return;
    }

    try {
      const values = await form.validateFields();
      setCheckingDuplicates(true);

      // Step 1: Check for duplicates
      const filenames = selectedFiles.map(f => f.name);
      const duplicatesData = await mediaCollabService.checkDuplicates(projectId, filenames);

      const duplicateFiles: DuplicateFile[] = [];
      const filesMap: FileWithResolution[] = selectedFiles.map(file => ({ file }));

      // Identify which files are duplicates
      selectedFiles.forEach((file) => {
        if (duplicatesData[file.name]) {
          duplicateFiles.push({
            file,
            existingAsset: duplicatesData[file.name],
          });
        }
      });

      setCheckingDuplicates(false);

      // Step 2: Handle duplicates if found
      if (duplicateFiles.length > 0) {
        setCurrentDuplicates(duplicateFiles);
        setCurrentDuplicateIndex(0);
        setFilesWithResolutions(filesMap);
        setDuplicateModalVisible(true);
        return; // Wait for user to resolve conflicts
      }

      // Step 3: No duplicates, proceed with upload
      await performUpload(filesMap, values.description);
    } catch (error: unknown) {
      setCheckingDuplicates(false);
      message.error((error as Error).message || 'Failed to check for duplicates');
    }
  };

  const handleDuplicateResolve = async (resolution: ConflictResolution, applyToAll: boolean) => {
    try {
      const values = await form.validateFields();

      if (applyToAll) {
        // Apply same resolution to all duplicates
        setGlobalResolution(resolution);
        const updatedFiles = filesWithResolutions.map(item => {
          const isDuplicate = currentDuplicates.some(d => d.file.name === item.file.name);
          return {
            ...item,
            resolution: isDuplicate ? resolution : undefined,
          };
        });
        setFilesWithResolutions(updatedFiles);
        setDuplicateModalVisible(false);

        // Start upload with all resolutions applied
        await performUpload(updatedFiles, values.description);
      } else {
        // Apply resolution to current duplicate only
        const currentDuplicate = currentDuplicates[currentDuplicateIndex];
        const updatedFiles = filesWithResolutions.map(item => {
          if (item.file.name === currentDuplicate.file.name) {
            return { ...item, resolution };
          }
          return item;
        });
        setFilesWithResolutions(updatedFiles);

        // Move to next duplicate
        if (currentDuplicateIndex < currentDuplicates.length - 1) {
          setCurrentDuplicateIndex(currentDuplicateIndex + 1);
        } else {
          // All duplicates resolved, start upload
          setDuplicateModalVisible(false);
          await performUpload(updatedFiles, values.description);
        }
      }
    } catch (error: unknown) {
      message.error((error as Error).message || 'Upload failed');
    }
  };

  const handleDuplicateCancel = () => {
    setDuplicateModalVisible(false);
    setCurrentDuplicates([]);
    setCurrentDuplicateIndex(0);
    setGlobalResolution(null);
    setFilesWithResolutions([]);
  };

  const handleCancel = () => {
    if (!uploading && !checkingDuplicates) {
      // Full cleanup on cancel
      form.resetFields();
      setSelectedFiles([]);
      setFilesWithResolutions([]);
      setCurrentDuplicates([]);
      setGlobalResolution(null);
      setUploadQueue([]);
      setCurrentDuplicateIndex(0);
      onClose();
    }
  };

  // Reset state when modal opens
  React.useEffect(() => {
    if (visible && uploadQueue.length > 0 && !uploading) {
      // If modal reopens with completed uploads, clear them
      const allCompleted = uploadQueue.every(item => item.status === 'completed' || item.status === 'failed');
      const allUploaded = uploadQueue.every(item => item.status === 'completed');

      if (allUploaded) {
        // All uploads completed successfully, reset everything
        setUploadQueue([]);
        setSelectedFiles([]);
        setFilesWithResolutions([]);
        form.resetFields();
      }
    }
  }, [visible, uploadQueue, uploading, form]);

  const uploadProps = {
    name: 'file',
    multiple: true,
    beforeUpload: (file: File) => {
      // Validate file type
      const isValidType =
        file.type.startsWith('video/') ||
        file.type.startsWith('image/') ||
        file.name.match(/\.(cr2|cr3|nef|arw|raf|orf|rw2|pef|dng)$/i);

      if (!isValidType) {
        message.error(`${file.name}: Only video and image files are allowed`);
        return Upload.LIST_IGNORE;
      }

      // Validate file size (500MB max)
      const maxSize = 500 * 1024 * 1024;
      if (file.size > maxSize) {
        message.error(`${file.name}: File size must be less than 500MB`);
        return Upload.LIST_IGNORE;
      }

      // Check if file is already in selectedFiles (prevent duplicates in UI)
      const isDuplicate = selectedFiles.some(f => f.name === file.name && f.size === file.size);
      if (isDuplicate) {
        message.warning(`${file.name}: File already added`);
        return Upload.LIST_IGNORE;
      }

      // Add file to selected files list
      setSelectedFiles((prev) => [...prev, file]);
      return false; // Prevent auto upload
    },
    onRemove: (file: UploadFile) => {
      setSelectedFiles((prev) => prev.filter((f) => f.name !== file.name));
    },
    fileList: selectedFiles.map((file, index) => ({
      uid: `${index}`,
      name: file.name,
      status: 'done' as const,
      size: file.size,
      type: file.type,
    })),
  };

  const getStatusIcon = (status: UploadQueueItem['status']) => {
    switch (status) {
      case 'uploading':
        return <LoadingOutlined style={{ color: '#1890ff' }} />;
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'failed':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'paused':
        return <PauseCircleOutlined style={{ color: '#faad14' }} />;
      case 'waiting':
        return <ClockCircleOutlined style={{ color: '#8c8c8c' }} />;
    }
  };

  const getStatusText = (status: UploadQueueItem['status']) => {
    switch (status) {
      case 'uploading':
        return 'Uploading';
      case 'completed':
        return 'Done';
      case 'failed':
        return 'Failed';
      case 'paused':
        return 'Paused';
      case 'waiting':
        return 'Waiting';
    }
  };

  return (
    <>
      <Modal
        title="Upload Media"
        open={visible}
        onOk={handleUpload}
        onCancel={handleCancel}
        okText={checkingDuplicates ? 'Checking...' : 'Upload'}
        confirmLoading={uploading || checkingDuplicates}
        width={800}
        maskClosable={!uploading && !checkingDuplicates}
        destroyOnClose={false}
      >
        <Form form={form} layout="vertical">
          {uploadQueue.length === 0 ? (
            <>
              <Form.Item>
                <Dragger {...uploadProps}>
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">Click or drag files to upload</p>
                  <p className="ant-upload-hint">
                    Supports multiple files: videos (MP4, MOV, WebM), photos (JPEG, PNG, GIF, WebP), and RAW images (CR2, NEF, ARW, DNG, etc.)
                  </p>
                  <p className="ant-upload-hint" style={{ marginTop: 8 }}>
                    Maximum file size: 500MB
                  </p>
                  <p className="ant-upload-hint" style={{ marginTop: 4, color: '#1890ff' }}>
                    ✓ Automatic duplicate detection enabled
                  </p>
                </Dragger>
              </Form.Item>

              <Form.Item
                label="Description (optional)"
                name="description"
              >
                <TextArea
                  rows={3}
                  placeholder="Add a description for this media..."
                  disabled={uploading || checkingDuplicates}
                />
              </Form.Item>

              {checkingDuplicates && (
                <Form.Item>
                  <Progress
                    percent={50}
                    status="active"
                    format={() => 'Checking duplicates...'}
                  />
                </Form.Item>
              )}
            </>
          ) : (
            <>
              {/* Overall Progress */}
              <Card size="small" style={{ marginBottom: 16 }}>
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong>
                      Uploading {uploadQueue.length} file{uploadQueue.length > 1 ? 's' : ''} ({formatFileSize(totalBytes)})
                    </Text>
                    {averageSpeed > 0 && (
                      <Text type="secondary">
                        {formatSpeed(averageSpeed)} • {formatTime(overallETA)} remaining
                      </Text>
                    )}
                  </div>
                  <Progress
                    percent={overallProgress}
                    status={uploading ? 'active' : 'success'}
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                  />
                </Space>
              </Card>

              {/* Per-File Progress */}
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  {uploadQueue.map((item) => (
                    <Card
                      key={item.id}
                      size="small"
                      style={{
                        borderLeft: `4px solid ${
                          item.status === 'completed' ? '#52c41a' :
                          item.status === 'failed' ? '#ff4d4f' :
                          item.status === 'uploading' ? '#1890ff' :
                          '#d9d9d9'
                        }`
                      }}
                    >
                      <Space direction="vertical" style={{ width: '100%' }} size={4}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Space>
                            {getStatusIcon(item.status)}
                            <Text
                              strong
                              style={{
                                maxWidth: 300,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={item.file.name}
                            >
                              {item.file.name}
                            </Text>
                            <Tag>{getStatusText(item.status)}</Tag>
                          </Space>
                          <Space>
                            {item.status === 'failed' && (
                              <Button
                                type="link"
                                size="small"
                                onClick={() => handleRetry(item.id)}
                              >
                                Retry
                              </Button>
                            )}
                            <Text type="secondary">{formatFileSize(item.file.size)}</Text>
                          </Space>
                        </div>

                        {item.status === 'uploading' && (
                          <>
                            <Progress
                              percent={item.progress}
                              size="small"
                              status="active"
                              format={(percent) => `${percent}%`}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {formatFileSize(item.uploadedBytes)} / {formatFileSize(item.totalBytes)}
                              </Text>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {formatSpeed(item.speed)} • {formatTime(item.eta)} remaining
                              </Text>
                            </div>
                          </>
                        )}

                        {item.status === 'completed' && (
                          <Progress percent={100} size="small" status="success" />
                        )}

                        {item.status === 'failed' && (
                          <>
                            <Progress percent={item.progress} size="small" status="exception" />
                            <Text type="danger" style={{ fontSize: 12 }}>
                              {item.error || 'Upload failed'}
                            </Text>
                          </>
                        )}

                        {item.status === 'waiting' && (
                          <Progress percent={0} size="small" />
                        )}
                      </Space>
                    </Card>
                  ))}
                </Space>
              </div>
            </>
          )}
        </Form>
      </Modal>

      {/* Duplicate Resolution Modal */}
      {duplicateModalVisible && currentDuplicates.length > 0 && (
        <DuplicateFileModal
          visible={duplicateModalVisible}
          duplicates={currentDuplicates.slice(currentDuplicateIndex, currentDuplicateIndex + 1)}
          onResolve={handleDuplicateResolve}
          onCancel={handleDuplicateCancel}
        />
      )}
    </>
  );
};

export default UploadMediaModal;
