import type { ButtonProps } from '@fluentui/react-components';
import { Button, mergeClasses } from '@fluentui/react-components';
import { useVeidneButtonStyles } from './VeidneButton.styles';

export function VeidneButton({ className, size, appearance, ...props }: ButtonProps) {
  const styles = useVeidneButtonStyles();

  const rootClass = mergeClasses(
    styles.root,
    size === 'large' && styles.large,
    size === 'small' && styles.small,
    appearance === 'secondary' && styles.secondary,
    appearance === 'transparent' && styles.transparent,
    className,
  );

  return (
    <Button {...props} size={size} appearance={appearance} className={rootClass} />
  );
}
