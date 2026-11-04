import {useMemo} from 'react';
import {useLibState} from '../react/context';

/**
 * Copy of a section of the task page (default `#instructions`), keeping only the elements whose
 * `data-version="1,3"` lists the current version (elements without data-version are kept).
 */
export function filterSectionHtml(sectionId: string, version: string | undefined): string | null {
  const section = document.getElementById(sectionId);
  if (!section) return null;
  const copy = section.cloneNode(true) as HTMLElement;
  const versioned = copy.querySelectorAll('[data-version]');
  for (let i = 0; i < versioned.length; i++) {
    const element = versioned[i]!;
    const versions = (element.getAttribute('data-version') ?? '').split(',').map((v) => v.trim());
    if (version === undefined || versions.indexOf(version) === -1) element.parentNode?.removeChild(element);
  }
  return copy.innerHTML;
}

export function TaskInstructions({section = 'instructions'}: {section?: string}) {
  const version = useLibState((state) => state.taskData?.version.version);
  const html = useMemo(() => filterSectionHtml(section, version), [section, version]);
  if (html === null) return null;
  return <div className="fioi-instructions" dangerouslySetInnerHTML={{__html: html}} />;
}
