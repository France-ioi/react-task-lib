import {useMemo, useState} from 'react';
import {createPortal} from 'react-dom';
import {useRenderIcon} from '../react/context';
import {parseStyle} from './icons';

/**
 * Copy of a section of the task page, keeping only the elements whose `data-version="1,3"` lists
 * the current version (elements without data-version are kept). null when the section is missing.
 */
export function filteredSection(sectionId: string, version: string | undefined): HTMLElement | null {
  const section = document.getElementById(sectionId);
  if (!section) return null;
  const copy = section.cloneNode(true) as HTMLElement;
  const versioned = copy.querySelectorAll('[data-version]');
  for (let i = 0; i < versioned.length; i++) {
    const element = versioned[i]!;
    const versions = (element.getAttribute('data-version') ?? '').split(',').map((v) => v.trim());
    if (version === undefined || versions.indexOf(version) === -1) element.parentNode?.removeChild(element);
  }
  return copy;
}

export interface HtmlContentProps {
  /** Trusted HTML (from the task page). */
  html: string;
  className?: string;
}

/**
 * Renders trusted HTML from the task page; `<fontawesomeicon icon="name" style="…">` elements
 * are rendered with the icon renderer (built-in icons, or `renderIcon` given to mountTask).
 */
export function HtmlContent({html, className}: HtmlContentProps) {
  const renderIcon = useRenderIcon();
  // A new element for each html: the ref callback then finds the icon placeholders.
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const icons = useMemo(() => {
    if (!container) return [];
    const nodes = container.querySelectorAll('fontawesomeicon');
    return Array.prototype.slice.call(nodes) as Element[];
  }, [container]);

  return (
    <>
      <div key={html} ref={setContainer} className={className} dangerouslySetInnerHTML={{__html: html}} />
      {icons.map((node, index) =>
        createPortal(
          renderIcon(node.getAttribute('icon') ?? '', parseStyle(node.getAttribute('style'))),
          node,
          String(index),
        ),
      )}
    </>
  );
}
