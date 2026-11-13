import {LEVELS, levelNames} from '../levels';
import {useLibState, useLibTranslation} from '../react/context';
import type {LevelName} from '../types';
import {Stars} from './Stars';

/** One tab per level, with its stars filled by the level score. */
export function VersionTabs({onSelect}: {onSelect: (level: LevelName) => void}) {
  const t = useLibTranslation();
  const levels = useLibState((state) => state.levels);
  const currentVersion = useLibState((state) => state.taskData?.version.version);
  if (!levels) return null;

  return (
    <nav className="fioi-version-tabs" role="tablist">
      {levelNames(levels).map((name) => {
        const level = levels[name]!;
        const active = level.version === currentVersion;
        return (
          <a
            key={name}
            role="tab"
            tabIndex={active ? 0 : -1}
            aria-selected={active}
            aria-disabled={level.locked}
            className={`fioi-version-tabs__tab${active ? ' fioi-version-tabs__tab--active' : ''}${
              level.locked ? ' fioi-version-tabs__tab--locked' : ''
            }`}
            onClick={() => onSelect(name)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') onSelect(name);
            }}
          >
            {t('app.version_tab')} <Stars starsCount={LEVELS[name].stars} rating={level.score} />
          </a>
        );
      })}
    </nav>
  );
}
