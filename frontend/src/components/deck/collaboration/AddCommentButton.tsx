import React from 'react';
import { Button, Tooltip } from 'antd';
import { CommentOutlined } from '@ant-design/icons';
import { useCollaborationStore } from '../../../stores/collaborationStore';

export const AddCommentButton: React.FC = () => {
  const { isAddingComment, setAddingComment } = useCollaborationStore();

  return (
    <Tooltip title="Add comment (click on slide)">
      <Button
        icon={<CommentOutlined />}
        type={isAddingComment ? 'primary' : 'default'}
        onClick={() => setAddingComment(!isAddingComment)}
      >
        Comment
      </Button>
    </Tooltip>
  );
};

export default AddCommentButton;
