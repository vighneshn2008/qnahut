export default function Button({
  variant = 'default',
  block = false,
  icon: Icon,
  className = '',
  children,
  ...rest
}) {
  const classes = ['btn'];
  if (variant === 'primary') classes.push('btn-primary');
  if (variant === 'danger') classes.push('btn-danger');
  if (variant === 'warn') classes.push('btn-warn');
  if (variant === 'ghost') classes.push('btn-ghost');
  if (block) classes.push('btn-block');
  if (className) classes.push(className);

  return (
    <button className={classes.join(' ')} {...rest}>
      {Icon && <Icon size={16} aria-hidden="true" />}
      {children}
    </button>
  );
}
