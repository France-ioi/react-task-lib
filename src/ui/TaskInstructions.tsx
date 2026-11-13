import {useMemo} from 'react';
import {useLibState} from '../react/context';
import {filteredSection, HtmlContent} from './HtmlContent';

/**
 * The instructions of the task page (default section `#instructions`), filtered by version
 * (`data-version`), with `<fontawesomeicon>` support.
 */
export function TaskInstructions({section = 'instructions'}: {section?: string}) {
  const version = useLibState((state) => state.taskData?.version.version);
  const html = useMemo(() => filteredSection(section, version)?.innerHTML ?? null, [section, version]);
  if (html === null) return null;
  return <HtmlContent className="fioi-instructions" html={html} />;
}
