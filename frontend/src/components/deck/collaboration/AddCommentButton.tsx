import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Tooltip } from 'antd';
import { CommentOutlined } from '@ant-design/icons';
import { useCollaborationStore } from '../../../stores/collaborationStore';

export const AddCommentButton: React.FC = () => {
  const { t } = useTranslation();
  const { isAddingComment, setAddingComment } = useCollaborationStore();

  return (
    <Tooltip title={t('deckEditor.addCommentHint', 'Add comment (click on slide)')}>
      <Button
        icon={<CommentOutlined />}
        type={isAddingComment ? 'primary' : 'default'}
        onClick={() => setAddingComment(!isAddingComment)}
      >
        {t('deckEditor.comment', 'Comment')}
      </Button>
    </Tooltip>
  );
};

export default AddCommentButton;
