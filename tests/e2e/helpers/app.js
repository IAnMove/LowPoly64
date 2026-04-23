import fs from 'node:fs/promises';
import path from 'node:path';
import { expect } from '@playwright/test';

const releaseCaptureRoot = path.join(process.cwd(), 'artifacts', 'release-captures');
const trackedPageErrors = new WeakMap();
const DEFAULT_CAPTURE_LINGER_MS = 2200;
const DEFAULT_CAPTURE_SETTLE_MS = 250;
const CAPTURE_SURFACE_STYLE_ID = '__playwright-capture-surface__';

function escapeForRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

async function ensureParentDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

export async function waitForFrames(page, count = 2) {
  await page.evaluate(async (frameCount) => {
    await new Promise((resolve) => {
      let remaining = Math.max(1, frameCount);
      const step = () => {
        remaining -= 1;
        if (remaining <= 0) {
          resolve();
          return;
        }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, count);
}

export async function waitForUi(page, delay = 200) {
  await waitForFrames(page, 3);
  await page.waitForTimeout(delay);
  await waitForFrames(page, 2);
}

async function waitForAppBindings(page, timeout = 45000) {
  await page.waitForFunction(() => {
    const requiredBindings = [
      'addTemplate',
      'resetScene',
      'openArchetype',
      'openRigPanel',
    ];
    return requiredBindings.every((bindingName) => typeof window[bindingName] === 'function');
  }, null, { timeout });
}

async function prepareDarkBlankPage(page) {
  await page.evaluate(() => {
    document.documentElement.style.background = '#05070b';
    document.documentElement.style.colorScheme = 'dark';
    if (!document.body) {
      const body = document.createElement('body');
      document.documentElement.appendChild(body);
    }
    document.body.style.margin = '0';
    document.body.style.background = '#05070b';
    document.body.style.color = '#f5f5f5';
  });
}

async function stabilizeCaptureSurface(page) {
  await page.evaluate((styleId) => {
    const root = document.documentElement;
    if (root) {
      root.style.background = '#05070b';
      root.style.colorScheme = 'dark';
    }
    if (document.body) {
      document.body.style.background = '#05070b';
      document.body.style.color = '#f5f5f5';
    }

    if (!document.head || document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      html {
        background: #05070b !important;
        color-scheme: dark !important;
        scroll-behavior: auto !important;
      }
      body {
        background: #05070b !important;
      }
    `;
    document.head.appendChild(style);
  }, CAPTURE_SURFACE_STYLE_ID);
}

export async function bootstrapApp(page, target = '/', options = {}) {
  const {
    requireEditorModals = true,
    requireBindings = true,
  } = options;

  if (!trackedPageErrors.has(page)) {
    const pageErrors = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error?.message || String(error));
    });
    trackedPageErrors.set(page, pageErrors);
  }

  await page.addInitScript(() => {
    const styleId = '__playwright-capture-surface__';

    const applyDarkBootSurface = () => {
      const root = document.documentElement;
      if (root) {
        root.style.background = '#05070b';
        root.style.colorScheme = 'dark';
      }
      if (document.body) {
        document.body.style.background = '#05070b';
        document.body.style.color = '#f5f5f5';
      }

      if (document.head && !document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          html {
            background: #05070b !important;
            color-scheme: dark !important;
            scroll-behavior: auto !important;
          }
          body {
            background: #05070b !important;
          }
        `;
        document.head.appendChild(style);
      }
    };

    applyDarkBootSurface();
    document.addEventListener('DOMContentLoaded', applyDarkBootSurface);
    window.addEventListener('load', applyDarkBootSurface);

    try {
      localStorage.clear();
    } catch {}
    window.confirm = () => true;
    window.alert = () => {};
    window.prompt = (_message, fallback = '') => fallback;

    if (!navigator.clipboard) {
      Object.defineProperty(navigator, 'clipboard', {
        value: {},
        configurable: true,
      });
    }

    navigator.clipboard.writeText = async () => {};
  });
  await prepareDarkBlankPage(page);

  await page.goto(target, { waitUntil: 'commit' });
  await stabilizeCaptureSurface(page);

  if (target === '/help.html') {
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('#workflow')).toBeVisible();
    await waitForUi(page, 250);
    return;
  }

  await expect(page.locator('#canvas')).toBeVisible();
  await expect(page.locator('#left-panel')).toBeVisible();
  await expect(page.locator('#right-panel')).toBeVisible();
  if (requireEditorModals) {
    await expect(page.locator('#texture-editor-modal')).toHaveCount(1);
    await expect(page.locator('#svg-workbench-modal')).toHaveCount(1);
  }
  if (requireBindings) {
    await waitForAppBindings(page);
  }
  await waitForUi(page, 350);
}

export async function assertNoPageErrors(page) {
  const pageErrors = trackedPageErrors.get(page) || [];
  expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n')}`).toEqual([]);
}

export async function resetScene(page) {
  await page.waitForFunction(async () => {
    const { state } = await import('/src/modules/shared/state.js');
    return !!state?.userObjects;
  }, null, { timeout: 45000 });
  await page.evaluate(async () => {
    if (typeof window.resetScene === 'function') {
      window.resetScene();
      return;
    }

    const { resetScene: resetSceneFromModule } = await import('/src/modules/viewport/actions.js');
    resetSceneFromModule();
  });
  await waitForUi(page, 250);
}

export async function openArchetype(page, archetypeId) {
  await page.evaluate((id) => {
    window.openArchetype(id);
  }, archetypeId);
  await waitForUi(page, 450);
}

export async function closeRigPanelIfOpen(page) {
  const panel = page.locator('#rig-panel-modal');
  if (await panel.isVisible().catch(() => false)) {
    await page.evaluate(() => {
      window.closeRigPanel();
    });
    await expect(panel).toBeHidden();
  }
}

export async function openTextureEditor(page) {
  await page.evaluate(() => {
    window.openTextureEditor();
  });
  await expect(page.locator('#texture-editor-modal')).toBeVisible();
  await waitForUi(page, 300);
}

export async function paintOnTextureCanvas(page) {
  const canvas = page.locator('#tex-paint-canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) return;

  await page.mouse.move(box.x + box.width * 0.22, box.y + box.height * 0.28);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.78, box.y + box.height * 0.34, { steps: 8 });
  await page.mouse.move(box.x + box.width * 0.70, box.y + box.height * 0.70, { steps: 8 });
  await page.mouse.up();
  await waitForUi(page, 200);
}

export async function holdForVideo(page, lingerMs = DEFAULT_CAPTURE_LINGER_MS) {
  if (lingerMs <= 0) return;
  await page.waitForTimeout(lingerMs);
  await waitForFrames(page, 2);
}

function resolvePageFromCaptureTarget(target) {
  if (typeof target.page === 'function') {
    return target.page();
  }
  if (typeof target.screenshot === 'function' && typeof target.goto === 'function') {
    return target;
  }
  throw new Error('Capture target must be a Page or Locator.');
}

export async function capture(target, relativePath, options = {}) {
  const filePath = path.join(releaseCaptureRoot, relativePath);
  await ensureParentDir(filePath);
  const {
    lingerMs = DEFAULT_CAPTURE_LINGER_MS,
    settleMs = DEFAULT_CAPTURE_SETTLE_MS,
    fullPage = false,
    ...screenshotOptions
  } = options;

  if ('scrollIntoViewIfNeeded' in target) {
    await target.scrollIntoViewIfNeeded();
  }

  const page = resolvePageFromCaptureTarget(target);
  await waitForUi(page, settleMs);
  await holdForVideo(page, lingerMs);
  await page.screenshot({
    path: filePath,
    fullPage,
    animations: 'disabled',
    caret: 'hide',
    ...screenshotOptions,
  });
  return filePath;
}

export async function capturePage(page, relativePath, options = {}) {
  return capture(page, relativePath, options);
}

export async function captureFocusedViewport(page, locator, relativePath, options = {}) {
  await locator.evaluate((element) => {
    element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
  });
  return capture(page, relativePath, options);
}

export async function lingerOnCurrentState(page, ms = DEFAULT_CAPTURE_LINGER_MS) {
  await waitForUi(page, DEFAULT_CAPTURE_SETTLE_MS);
  await holdForVideo(page, ms);
}

export async function expandObjectList(page) {
  const content = page.locator('#object-list-content');
  if (!(await content.isVisible().catch(() => false))) {
    await page.evaluate(() => {
      window.toggleObjectList();
    });
  }
  await expect(content).toBeVisible();
  await waitForUi(page, 150);
}

export async function waitForObjectCount(page, expectedCount) {
  const label = `(${expectedCount})`;
  await expect.poll(async () => page.locator('#object-list-count').textContent()).toBe(label);
}

export async function addTemplate(page, templateId) {
  await page.waitForFunction(async () => {
    const { state } = await import('/src/modules/shared/state.js');
    return !!state?.userObjects;
  }, null, { timeout: 45000 });
  await page.evaluate(async (id) => {
    const { addTemplate: addTemplateFromModule } = await import('/src/modules/viewport/templates.js');
    addTemplateFromModule(id);
  }, templateId);
  await waitForUi(page, 250);
}

export async function selectPrimaryEditableMesh(page) {
  await page.evaluate(async () => {
    const [{ state }, { getPrimaryEditableMesh }, { selectMesh }] = await Promise.all([
      import('/src/modules/shared/state.js'),
      import('/src/modules/shared/ui-helpers.js'),
      import('/src/modules/viewport/selection.js'),
    ]);

    const current =
      state.selectedMesh ||
      state.userObjects?.children?.[state.userObjects.children.length - 1] ||
      null;
    const mesh = getPrimaryEditableMesh(current);
    if (!mesh) {
      throw new Error('No editable mesh available for texture editing');
    }

    selectMesh(mesh);
  });
  await waitForUi(page, 150);
}

export async function openSvgWorkbench(page) {
  await page.evaluate(() => {
    window.openSvgWorkbench();
  });
  await expect(page.locator('#svg-workbench-modal')).toBeVisible();
  await waitForUi(page, 200);
}

export async function openPromptGenerator(page) {
  await page.evaluate(() => {
    window.openPromptModal();
  });
  await expect(page.locator('#prompt-modal')).toBeVisible();
  await waitForUi(page, 200);
}

export async function waitForTemplateCatalog(page) {
  await expect.poll(async () => page.locator('#template-list > div').count()).toBeGreaterThan(0);
  await waitForUi(page, 250);
}

export async function captureTemplateSections(page, folder = 'templates', options = {}) {
  await waitForTemplateCatalog(page);
  const sections = page.locator('#template-list > div');
  const count = await sections.count();
  const {
    lingerMs = 1000,
    settleMs = DEFAULT_CAPTURE_SETTLE_MS,
    ...captureOptions
  } = options;

  for (let index = 0; index < count; index += 1) {
    const section = sections.nth(index);
    const header = section.locator('button').first();
    const headerText = (await header.textContent()) || `section-${index + 1}`;
    const label = headerText
      .replace(/\(\d+\)/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    await captureFocusedViewport(page, section, path.join(folder, `${slugify(label)}.png`), {
      lingerMs,
      settleMs,
      ...captureOptions,
    });
  }
}

export async function expectTextContains(locator, text) {
  await expect(locator).toContainText(new RegExp(escapeForRegex(text), 'i'));
}
