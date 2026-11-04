// Must stay first: polyfills for the supported browsers.
import '@france-ioi/react-task-lib/polyfills';
import '@france-ioi/react-task-lib/style.css';
import './style.scss';

import {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {BROWSERSLIST, VERSION} from '@france-ioi/react-task-lib';
import {runProbes} from './probes';
import starUrl from './star.svg';

interface ProbeResult {
  name: string;
  ok: boolean;
  detail: string;
}

async function loadGrader(): Promise<string> {
  if (__TASK_MODE__ === 'client') {
    // Inlined in the single-file bundle; removed entirely from server builds.
    const {LOCAL_GRADER_MARKER, grade} = await import('./server-modules');
    return `${LOCAL_GRADER_MARKER} (grade(3) = ${grade(3)})`;
  }
  return 'remote grader';
}

/**
 * `?report=<url>`: send the probe results to <url> (used by scripts/old-browsers-smoke.mjs).
 * An image request works from file:// and in every browser, without CORS.
 */
function report(results: ProbeResult[], grader: string) {
  const target = new URLSearchParams(window.location.search).get('report');
  if (!target) return;
  const payload = JSON.stringify({userAgent: navigator.userAgent, mode: __TASK_MODE__, grader, results});
  new Image().src = `${target}?data=${encodeURIComponent(payload)}`;
}

function Playground() {
  const [results, setResults] = useState<ProbeResult[] | null>(null);
  const [grader, setGrader] = useState('…');

  useEffect(() => {
    void Promise.all([runProbes(), loadGrader()]).then(([probeResults, graderLabel]) => {
      setResults(probeResults);
      setGrader(graderLabel);
      report(probeResults, graderLabel);
    });
  }, []);

  const failed = results?.filter((r) => !r.ok).length;

  return (
    <div className="fioi-root playground">
      <div className="playground__header">
        <img src={starUrl} alt="" width={22} height={22} />
        <strong>react-task-lib {VERSION}</strong>
      </div>
      <p>
        Mode: <span data-testid="mode">{__TASK_MODE__}</span> — grader: <span data-testid="grader">{grader}</span>
      </p>
      <p>Targets: {BROWSERSLIST.join(', ')}</p>
      <p data-testid="summary">
        {results ? (failed ? `${failed} probe(s) failed` : `all ${results.length} probes passed`) : 'running…'}
      </p>
      {results?.map((r) => (
        <div key={r.name} className={`playground__probe${r.ok ? '' : ' playground__probe--fail'}`}>
          <span>{r.name}</span>
          <span>{r.ok ? 'ok' : `FAIL ${r.detail}`}</span>
        </div>
      ))}
    </div>
  );
}

export function runReact(container: HTMLElement, _options: unknown) {
  const root = createRoot(container);
  root.render(<Playground />);
  return {root};
}
