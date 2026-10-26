import type { CSSProperties } from 'react';
import { mergeClasses } from '@fluentui/react-components';
import type { WordToken } from '../../utils/types';
import { useStyles } from './ClickableWord.styles';

interface ClickableWordProps {
  token: WordToken;
  isSelected: boolean;
  isRangePreview: boolean;
  isDisabled: boolean;
  isDemoTarget?: boolean;
  // Roving tabindex: exactly one word carries 0, the rest -1, so the document
  // body is a single tab stop and arrow keys move focus between words.
  tabIndex?: number;
  registerRef?: (el: HTMLSpanElement | null) => void;
  onFocus?: () => void;
  onMouseDown: () => void;
  onMouseUp: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export function ClickableWord({
  token, isSelected, isRangePreview, isDisabled, isDemoTarget,
  tabIndex, registerRef, onFocus,
  onMouseDown, onMouseUp, onMouseEnter, onMouseLeave,
}: ClickableWordProps) {
  const s = useStyles();

  if (token.type === 'newline') return <br />;
  if (token.type === 'space') return <span className={s.space}>{token.text}</span>;

  const className = mergeClasses(
    s.word,
    token.bold && s.bold,
    token.italic && s.italic,
    isSelected && s.selected,
    isRangePreview && !isSelected && s.rangePreview,
    isDisabled && s.disabled,
    isDemoTarget && !isSelected && s.demoTarget,
  );

  const inlineStyle: CSSProperties | undefined =
    (token.fontSize || token.fontFamily || token.color || token.underline) ? {
      fontSize: token.fontSize ? `${token.fontSize}px` : undefined,
      fontFamily: token.fontFamily || undefined,
      color: token.color || undefined,
      textDecorationLine: token.underline ? 'underline' : undefined,
    } : undefined;

  return (
    <span
      ref={registerRef}
      className={className}
      style={inlineStyle}
      data-token-id={token.id}
      tabIndex={isDisabled ? undefined : tabIndex}
      onFocus={isDisabled ? undefined : onFocus}
      onMouseDown={isDisabled ? undefined : onMouseDown}
      onMouseUp={isDisabled ? undefined : onMouseUp}
      onMouseEnter={isDisabled ? undefined : onMouseEnter}
      onMouseLeave={isDisabled ? undefined : onMouseLeave}
    >
      {token.text}
    </span>
  );
}
