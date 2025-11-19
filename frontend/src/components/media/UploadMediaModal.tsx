import React, { useState } from 'react';
import { Modal, Upload, Form, Input, App, Progress } from 'antd';
import type { UploadFile } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { mediaCollabService } from '../../services/media-collab';
import { DuplicateFileModal, ConflictResolution, DuplicateFile } from './DuplicateFileModal';

const { Dragger } = Upload;
const { TextArea } = Input;

interface UploadMediaModalProps {
  visible: boolean;
  projectId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FileWithResolution {
  file: File;
  resolution?: ConflictResolution;
}

/**
 * UploadMediaModal
 *
 * Professional upload modal with duplicate detection and conflict resolution.
 * Similar to Google Drive, Dropbox, and Frame.io:
 * - Detects duplicate filenames before upload
 * - Shows conflict resolution dialog
 * - Supports skip, replace, keep-both strategies
 * - Handles bulk uploads with mixed duplicates
 */
export const UploadMediaModal: React.FC<UploadMediaModalProps> = ({
  visible,
  projectId,
  onClose,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filesWithResolutions, setFilesWithResolutions] = useState<FileWithResolution[]>([]);

  // Duplicate detection state
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicateModalVisible, setDuplicateModalVisible] = useState(false);
  const [currentDuplicates, setCurrentDuplicates] = useState<DuplicateFile[]>([]);
  const [currentDuplicateIndex, setCurrentDuplicateIndex] = useState(0);
  const [globalResolution, setGlobalResolution] = useState<ConflictResolution | null>(null);

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
      selectedFiles.forEach((file, index) => {
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

  const performUpload = async (filesWithRes: FileWithResolution[], description?: string) => {
    setUploading(true);
    setUploadProgress(0);

    const totalFiles = filesWithRes.filter(f => f.resolution !== 'skip').length;
    let completedFiles = 0;
    let uploadedCount = 0;
    let skippedCount = 0;

    try {
      // Upload files one by one with their resolutions
      for (const { file, resolution } of filesWithRes) {
        if (resolution === 'skip') {
          skippedCount++;
          completedFiles++;
          setUploadProgress(Math.round((completedFiles / totalFiles) * 100));
          continue;
        }

        await mediaCollabService.uploadAsset(
          projectId,
          file,
          description,
          undefined, // folderId
          resolution, // conflictResolution
        );

        uploadedCount++;
        completedFiles++;
        setUploadProgress(Math.round((completedFiles / totalFiles) * 100));
      }

      // Success message
      const messages = [];
      if (uploadedCount > 0) {
        messages.push(`${uploadedCount} file${uploadedCount > 1 ? 's' : ''} uploaded`);
      }
      if (skippedCount > 0) {
        messages.push(`${skippedCount} skipped`);
      }
      message.success(messages.join(', '));

      // Cleanup and close
      form.resetFields();
      setSelectedFiles([]);
      setFilesWithResolutions([]);
      setCurrentDuplicates([]);
      setGlobalResolution(null);
      onSuccess && onSuccess();
      onClose();
    } catch (error: unknown) {
      message.error((error as Error).message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCancel = () => {
    if (!uploading && !checkingDuplicates) {
      form.resetFields();
      setSelectedFiles([]);
      setFilesWithResolutions([]);
      setCurrentDuplicates([]);
      setGlobalResolution(null);
      onClose();
    }
  };

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

  return (
    <>
      <Modal
        title="Upload Media"
        open={visible}
        onOk={handleUpload}
        onCancel={handleCancel}
        okText={checkingDuplicates ? 'Checking...' : 'Upload'}
        confirmLoading={uploading || checkingDuplicates}
        width={600}
        maskClosable={!uploading && !checkingDuplicates}
      >
        <Form form={form} layout="vertical">
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

          {(uploading || checkingDuplicates) && (
            <Form.Item>
              <Progress
                percent={uploadProgress}
                status="active"
                format={(percent) => checkingDuplicates ? 'Checking duplicates...' : `${percent}%`}
              />
            </Form.Item>
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
