import {useMemo} from 'react';
import {useLibState} from '../react/context';
import {Carousel} from './Carousel';
import {filteredSection, HtmlContent} from './HtmlContent';

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Slides of a tutorial section of the task page: each top-level element of `#<category>` (after
 * `data-version` filtering) is a slide.
 */
export function tutorialSlides(category: string, version: string | undefined): string[] {
  const section = filteredSection(category, version);
  if (!section) return [];
  const slides: string[] = [];
  for (let i = 0; i < section.childNodes.length; i++) {
    const node = section.childNodes[i]!;
    if (node.nodeType === Node.ELEMENT_NODE) slides.push((node as Element).outerHTML);
    else if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim()) {
      slides.push(escapeHtml(node.textContent!.trim()));
    }
  }
  return slides;
}

/** Slides of the tutorial `category` for the current version ([] when none). */
export function useTutorialSlides(category: string | undefined): string[] {
  const version = useLibState((state) => state.taskData?.version.version);
  return useMemo(() => (category ? tutorialSlides(category, version) : []), [category, version]);
}

/** Tutorial carousel of the page section `#<category>`; nothing when it has no slide. */
export function Tutorial({category}: {category: string}) {
  const slides = useTutorialSlides(category);
  if (!slides.length) return null;
  return (
    <Carousel
      label={category}
      slides={slides.map((html, index) => (
        <HtmlContent key={index} className="fioi-tutorial__slide" html={html} />
      ))}
    />
  );
}
