import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {expect, test} from '@playwright/test';

const taskPage = pathToFileURL(path.resolve(import.meta.dirname, '../playground/task.html')).href;

test.describe('counter task (mountTask, client mode) opened from file://', () => {
  test('play level 1, validate, go to level 2, get a hint', async ({page}) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(taskPage);

    await expect(page.getByTestId('value')).toHaveText('0');
    await expect(page.locator('.fioi-instructions')).toContainText('Reach the target value, then validate');
    await expect(page.locator('.fioi-instructions fontawesomeicon svg')).toHaveCount(1);
    const tabs = page.getByRole('tab');
    await expect(tabs).toHaveCount(2);
    await expect(tabs.nth(1)).toHaveAttribute('aria-disabled', 'true');

    // Tutorial of the counter block
    await page.getByRole('button', {name: 'Lire les explications'}).click();
    const carousel = page.getByRole('region', {name: 'tutorial-counter'});
    await expect(carousel.getByRole('heading')).toHaveText('The counter');
    await carousel.getByRole('button', {name: 'Suivant'}).click();
    await expect(carousel.getByRole('heading')).toHaveText('Validate');
    await expect(carousel.getByRole('button', {name: 'Suivant'})).toHaveCount(0);
    await page.getByRole('button', {name: 'Cacher les explications'}).click();
    await expect(carousel).toBeHidden();

    await page.getByRole('button', {name: 'Augmenter'}).click();
    await page.getByRole('button', {name: 'Valider'}).click();
    await expect(page.locator('.fioi-result')).toContainText('Visez 2.');
    await expect(page.locator('.fioi-result')).toContainText('Votre score : 75');

    // A change of the answer clears the result.
    await page.getByRole('button', {name: 'Augmenter'}).click();
    await expect(page.locator('.fioi-result')).toHaveText('');

    await page.getByRole('button', {name: 'Valider'}).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Bravo, vous avez réussi !');
    // Focus moved into the dialog
    await expect(dialog.getByRole('button', {name: 'Passer à la suite'})).toBeFocused();
    await dialog.getByRole('button', {name: 'Passer à la suite'}).click();

    await expect(page.getByRole('heading', {name: 'Compteur — version 2'})).toBeVisible();
    await expect(page.locator('.fioi-instructions')).toContainText('Level 2: the target is higher.');
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('value')).toHaveText('0');

    await page.getByRole('button', {name: 'Hint'}).click();
    await expect(page.getByTestId('hint')).toHaveText('The target is 4.');
    await expect(page.getByText("L'indice demandé a été délivré.")).toBeVisible();

    // Back to level 1: its answer was kept.
    await tabs.nth(0).click();
    await expect(page.getByTestId('value')).toHaveText('2');
    expect(errors).toEqual([]);
  });
});
