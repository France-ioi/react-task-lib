import {act, fireEvent, screen, within} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {useState} from 'react';
import {Block, ContentBlock} from '../Block';
import {Carousel} from '../Carousel';
import {HtmlContent} from '../HtmlContent';
import {Modal} from '../Modal';
import {NumberPicker} from '../NumberPicker';
import {TaskInstructions} from '../TaskInstructions';
import {TaskResult} from '../TaskResult';
import {Tutorial, tutorialSlides} from '../Tutorial';
import {faEye} from '@fortawesome/free-solid-svg-icons';
import {Icon, parseStyle} from '../icons';
import {renderInTask, setPageHtml} from './render';

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('HtmlContent / TaskInstructions', () => {
  it('filters data-version elements', () => {
    setPageHtml(
      '<div id="instructions"><p>All</p><p data-version="2, 3">Two or three</p><p data-version="1">One</p></div>',
    );
    const {container, store} = renderInTask(<TaskInstructions />);
    expect(container.textContent).toBe('AllOne');
    act(() => store.setState({taskData: {version: {version: '3'}}}));
    expect(container.textContent).toBe('AllTwo or three');
  });

  it('renders nothing without the section', () => {
    setPageHtml('');
    expect(renderInTask(<TaskInstructions />).container.innerHTML).toBe('');
  });

  it('renders <fontawesomeicon> with the built-in icons, with their style', () => {
    const {container} = renderInTask(
      <HtmlContent html='<p>Click <fontawesomeicon icon="check" style="color: red; font-size: 2em"></fontawesomeicon></p>' />,
    );
    const icon = container.querySelector('fontawesomeicon svg') as SVGElement;
    expect(icon).not.toBeNull();
    expect(icon.style.color).toBe('red');
    expect(icon.style.fontSize).toBe('2em');
  });

  it('accepts the v3 names (FontAwesome aliases) and extra icons, and warns about unknown icons', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const {container} = renderInTask(
      <HtmlContent html='<fontawesomeicon icon="times"></fontawesomeicon><fontawesomeicon icon="sticky-note"></fontawesomeicon><fontawesomeicon icon="eye"></fontawesomeicon><fontawesomeicon icon="nope"></fontawesomeicon>' />,
      {icons: [faEye]},
    );
    const rendered = Array.from(container.querySelectorAll('fontawesomeicon')).map(
      (node) => node.querySelector('svg')?.getAttribute('data-icon') ?? null,
    );
    expect(rendered).toEqual(['xmark', 'note-sticky', 'eye', null]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('unknown icon "nope"'));
  });

  it('parseStyle converts CSS declarations', () => {
    expect(parseStyle('color: red; background-color:blue;;--x: 1')).toEqual({
      color: 'red',
      backgroundColor: 'blue',
      '--x': '1',
    });
    expect(parseStyle(null)).toEqual({});
  });
});

describe('Icon', () => {
  it('renders a FontAwesome definition as a 1em-high inline SVG', () => {
    const {container} = renderInTask(<Icon icon={faEye} className="x" />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe(`0 0 ${faEye.icon[0]} ${faEye.icon[1]}`);
    expect(svg.getAttribute('height')).toBe('1em');
    expect(svg.getAttribute('class')).toBe('fioi-icon x');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.querySelector('path')!.getAttribute('d')).toBe(faEye.icon[4]);
  });
});

describe('Tutorial / Carousel', () => {
  const tutorialHtml =
    '<div id="secret">\n  <div><h3>First</h3></div>\n  <div data-version="2"><h3>Only v2</h3></div>\n  <div><h3>Last <fontawesomeicon icon="lock"></fontawesomeicon></h3></div>\n</div>';

  it('one slide per top-level element, filtered by version', () => {
    setPageHtml(tutorialHtml);
    expect(tutorialSlides('secret', '1')).toHaveLength(2);
    expect(tutorialSlides('secret', '2')).toHaveLength(3);
    expect(tutorialSlides('missing', '1')).toEqual([]);
  });

  it('navigates without wrapping', () => {
    setPageHtml(tutorialHtml);
    renderInTask(<Tutorial category="secret" />);
    const carousel = screen.getByRole('region');
    const heading = () => within(carousel).getByRole('heading');
    expect(heading().textContent).toBe('First');
    expect(within(carousel).queryByRole('button', {name: 'Précédent'})).toBeNull();

    fireEvent.click(within(carousel).getByRole('button', {name: 'Suivant'}));
    expect(heading().textContent).toBe('Last ');
    expect(heading().querySelector('svg')).not.toBeNull();
    expect(within(carousel).queryByRole('button', {name: 'Suivant'})).toBeNull();

    fireEvent.keyDown(carousel, {key: 'ArrowLeft'});
    expect(heading().textContent).toBe('First');
    fireEvent.click(within(carousel).getByRole('button', {name: '2 sur 2'}));
    expect(heading().textContent).toBe('Last ');
  });

  it('Carousel renders nothing without slides', () => {
    expect(renderInTask(<Carousel slides={[]} />).container.innerHTML).toBe('');
  });
});

describe('Block', () => {
  it('collapses and expands from the header', () => {
    vi.useFakeTimers();
    renderInTask(
      <Block title="Circuit">
        <p>Body</p>
      </Block>,
    );
    const toggle = screen.getByRole('button', {name: 'Replier'});
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(screen.getByRole('heading', {name: 'Circuit'}));
    act(() => vi.runAllTimers());
    expect(screen.getByText('Body').closest('.fioi-collapse')!.getAttribute('aria-hidden')).toBe('true');
    expect((screen.getByText('Body').closest('.fioi-collapse') as HTMLElement).style.display).toBe('none');

    fireEvent.click(screen.getByRole('button', {name: 'Déplier'}));
    act(() => vi.runAllTimers());
    expect((screen.getByText('Body').closest('.fioi-collapse') as HTMLElement).style.display).toBe('');
  });

  it('shows the tutorial toggle only when the tutorial has slides', () => {
    setPageHtml('<div id="study"><div>Slide</div></div>');
    renderInTask(<Block title="A" tutorial="study" />);
    renderInTask(<Block title="B" tutorial="missing" />);
    const toggles = screen.getAllByRole('button', {name: /explications/});
    expect(toggles).toHaveLength(1);
    expect(toggles[0]!.textContent).toBe('Lire les explications');
    fireEvent.click(toggles[0]!);
    expect(toggles[0]!.textContent).toBe('Cacher les explications');
    expect(toggles[0]!.getAttribute('aria-expanded')).toBe('true');
  });

  it('asks for confirmation before closing', () => {
    const onClose = vi.fn();
    renderInTask(<Block title="Draft" onClose={onClose} closeConfirmText="Really?" />);
    fireEvent.click(screen.getByRole('button', {name: 'Fermer'}));
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('Really?');
    fireEvent.click(within(dialog).getByText('Annuler'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', {name: 'Fermer'}));
    fireEvent.click(within(screen.getByRole('dialog')).getByText('Confirmer'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ContentBlock renders a titled section', () => {
    renderInTask(
      <ContentBlock title="Votre mission" icon={<i>i</i>}>
        <p>Text</p>
      </ContentBlock>,
    );
    expect(screen.getByRole('heading', {name: 'Votre mission'})).toBeTruthy();
    expect(screen.getByText('Text')).toBeTruthy();
  });
});

describe('Modal', () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>open</button>
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title="Title"
          footer={
            <>
              <button>first</button>
              <button onClick={() => setOpen(false)}>last</button>
            </>
          }
        >
          body
        </Modal>
      </>
    );
  }

  it('focuses the last footer button, traps Tab, closes on Escape and restores focus', () => {
    renderInTask(<Harness />);
    const opener = screen.getByText('open');
    opener.focus();
    fireEvent.click(opener);

    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-labelledby')).toBe(screen.getByText('Title').id);
    expect(document.activeElement).toBe(screen.getByText('last'));

    fireEvent.keyDown(document, {key: 'Tab'});
    expect(document.activeElement).toBe(screen.getByRole('button', {name: 'Fermer'}));
    fireEvent.keyDown(document, {key: 'Tab', shiftKey: true});
    expect(document.activeElement).toBe(screen.getByText('last'));

    fireEvent.keyDown(document, {key: 'Escape'});
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('closes on backdrop click, not on dialog click', () => {
    renderInTask(<Harness />);
    fireEvent.click(screen.getByText('open'));
    fireEvent.mouseDown(screen.getByText('body'));
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.mouseDown(screen.getByRole('dialog').parentElement!);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('NumberPicker', () => {
  function Picker(props: Partial<Parameters<typeof NumberPicker>[0]> & {initial?: number}) {
    const [value, setValue] = useState(props.initial ?? 0);
    return <NumberPicker aria-label="n" {...props} value={value} onChange={setValue} />;
  }
  const input = () => screen.getByRole('spinbutton', {name: 'n'}) as HTMLInputElement;
  const minus = () => screen.getByRole('button', {name: 'Diminuer'}) as HTMLButtonElement;
  const plus = () => screen.getByRole('button', {name: 'Augmenter'}) as HTMLButtonElement;

  it('steps within bounds and disables the buttons at the bounds', () => {
    renderInTask(<Picker min={0} max={2} />);
    expect(minus().disabled).toBe(true);
    fireEvent.click(plus());
    fireEvent.click(plus());
    expect(input().value).toBe('2');
    expect(plus().disabled).toBe(true);
  });

  it('clamps typed values', () => {
    renderInTask(<Picker min={0} max={10} />);
    fireEvent.change(input(), {target: {value: '42'}});
    expect(input().value).toBe('10');
  });

  it('loops between min and max', () => {
    renderInTask(<Picker min={1} max={5} loop initial={5} />);
    expect(plus().disabled).toBe(false);
    fireEvent.click(plus());
    expect(input().value).toBe('1');
    fireEvent.click(minus());
    expect(input().value).toBe('5');
  });

  it('uses the step', () => {
    renderInTask(<Picker step={5} />);
    fireEvent.click(plus());
    expect(input().value).toBe('5');
  });

  it('is inert when read-only', () => {
    renderInTask(<Picker readOnly />);
    expect(minus().disabled && plus().disabled && input().readOnly).toBe(true);
  });
});

describe('TaskResult', () => {
  it('shows the grading, unless the task displays it itself (showResult: false)', () => {
    const shown = renderInTask(<TaskResult changeLevel={() => undefined} />);
    act(() => shown.store.setState({grading: {score: 40, message: 'Almost'}}));
    expect(screen.getByText('Almost')).toBeTruthy();
    shown.unmount();

    const hidden = renderInTask(<TaskResult changeLevel={() => undefined} showGrading={false} />);
    act(() => hidden.store.setState({grading: {score: 40, message: 'Almost'}}));
    expect(screen.queryByText('Almost')).toBeNull();
  });
});
