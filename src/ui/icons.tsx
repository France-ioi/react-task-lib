import type {IconDefinition} from '@fortawesome/fontawesome-common-types';
import {
  faCheck,
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faChevronUp,
  faCircleQuestion,
  faLock,
  faLockOpen,
  faNoteSticky,
  faPlus,
  faSpinner,
  faThumbtack,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import type {CSSProperties, ReactNode, SVGProps} from 'react';

export type {IconDefinition};

export interface IconProps extends SVGProps<SVGSVGElement> {
  /** A FontAwesome icon definition, e.g. `faCheck` from @fortawesome/free-solid-svg-icons. */
  icon: IconDefinition;
  /** Rotates continuously (spinners). */
  spin?: boolean;
}

/*! Icons: Font Awesome Free by @fontawesome - https://fontawesome.com - License: CC BY 4.0 (https://fontawesome.com/license/free) */
/**
 * Renders a FontAwesome icon definition as inline SVG (1em high, like FontAwesome), without the
 * FontAwesome runtime (fontawesome-svg-core / react-fontawesome).
 */
export function Icon({icon, spin = false, className, ...props}: IconProps) {
  const [width, height, , , path] = icon.icon;
  const paths = Array.isArray(path) ? path : [path];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${height}`}
      height="1em"
      width={`${(width / height).toFixed(4)}em`}
      fill="currentColor"
      aria-hidden={props['aria-label'] ? undefined : true}
      focusable="false"
      data-icon={icon.iconName}
      {...props}
      className={`fioi-icon${spin ? ' fioi-icon--spin' : ''}${className ? ` ${className}` : ''}`}
    >
      {paths.map((d, index) => (
        <path key={index} d={d} />
      ))}
    </svg>
  );
}

/** Icons used by the lib, and available by name in task HTML (the ones v3 registered). */
export const BUILTIN_ICONS: IconDefinition[] = [
  faCheck,
  faXmark,
  faSpinner,
  faPlus,
  faChevronUp,
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faLock,
  faLockOpen,
  faNoteSticky,
  faThumbtack,
  faCircleQuestion,
];

/** name → definition, with FontAwesome's aliases (e.g. "times" for xmark, "sticky-note" for note-sticky). */
export function iconsByName(icons: IconDefinition[]): Record<string, IconDefinition> {
  const byName: Record<string, IconDefinition> = {};
  for (const icon of icons) {
    byName[icon.iconName] = icon;
    for (const alias of icon.icon[2]) {
      if (typeof alias === 'string') byName[alias] = icon;
    }
  }
  return byName;
}

/**
 * Renders the icon of a `<fontawesomeicon icon="name" style="…">` found in task HTML;
 * returns null when it doesn't know the name.
 */
export type RenderIcon = (name: string, style: CSSProperties) => ReactNode;

/** Renders task HTML icons from the built-in icons plus `extraIcons` (mountTask `icons` option). */
export function createIconRenderer(extraIcons: IconDefinition[] = []): RenderIcon {
  const byName = iconsByName([...BUILTIN_ICONS, ...extraIcons]);
  return (name, style) => {
    const icon = byName[name];
    if (!icon) {
      console.warn(`react-task-lib: unknown icon "${name}" (add its definition to the mountTask "icons" option)`);
      return null;
    }
    return <Icon icon={icon} style={style} />;
  };
}

/** `"color: red; font-size: 2em"` → `{color: 'red', fontSize: '2em'}` */
export function parseStyle(style: string | null | undefined): CSSProperties {
  const result: Record<string, string> = {};
  if (!style) return result;
  for (const declaration of style.split(';')) {
    const colon = declaration.indexOf(':');
    if (colon === -1) continue;
    const property = declaration.slice(0, colon).trim();
    const value = declaration.slice(colon + 1).trim();
    if (!property || !value) continue;
    const name =
      property.indexOf('--') === 0 ? property : property.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
    result[name] = value;
  }
  return result as CSSProperties;
}
