import React, { useEffect, useState } from 'react';
import { StarFilled, StarOutlined } from '@ant-design/icons';
import { Space, Tooltip, theme } from 'antd';

interface StarRatingProps {
  value?: number | null;
  onChange?: (rating: number) => void;
  size?: number;
  disabled?: boolean;
  enableKeyboard?: boolean;
}

/**
 * StarRating Component
 *
 * Interactive 5-star rating with keyboard shortcuts.
 * Keyboard shortcuts:
 * - 1-5: Set rating to 1-5 stars
 * - 0: Clear rating (set to null)
 */
export const StarRating: React.FC<StarRatingProps> = ({
  value = null,
  onChange,
  size = 20,
  disabled = false,
  enableKeyboard = true,
}) => {
  const { token } = theme.useToken();
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  useEffect(() => {
    if (!enableKeyboard || disabled) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't fire when the user is typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Only handle number keys 0-5
      const key = e.key;
      if (!/^[0-5]$/.test(key)) return;

      e.preventDefault();
      const rating = parseInt(key, 10);

      if (onChange) {
        onChange(rating);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [enableKeyboard, disabled, onChange]);

  const handleStarClick = (rating: number) => {
    if (disabled || !onChange) return;
    // If clicking the same rating, clear it
    onChange(value === rating ? 0 : rating);
  };

  const displayRating = hoverRating ?? value ?? 0;

  return (
    <Space size={4}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isActive = star <= displayRating;
        const IconComponent = isActive ? StarFilled : StarOutlined;

        return (
          <Tooltip
            key={star}
            title={`${star} star${star > 1 ? 's' : ''} (Press ${star})`}
          >
            <IconComponent
              style={{
                fontSize: size,
                color: isActive ? token.colorWarning : token.colorBorder,
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={() => handleStarClick(star)}
              onMouseEnter={() => !disabled && setHoverRating(star)}
              onMouseLeave={() => setHoverRating(null)}
            />
          </Tooltip>
        );
      })}
      {value !== null && value > 0 && (
        <Tooltip title="Clear rating (Press 0)">
          <span
            style={{
              fontSize: 12,
              color: token.colorTextTertiary,
              cursor: disabled ? 'not-allowed' : 'pointer',
              marginLeft: 4,
            }}
            onClick={() => !disabled && onChange && onChange(0)}
          >
            ×
          </span>
        </Tooltip>
      )}
    </Space>
  );
};

export default StarRating;
