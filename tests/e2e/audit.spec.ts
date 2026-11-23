/**
 * Automated walkthrough: every screen and mode at several sizes, light and dark.
 * Checks each screen for page errors, horizontal overflow, off-screen controls, tap
 * targets under 44 px and low text contrast. Run with `npm run audit`; set AUDIT_SHOTS=dir
 * to save a screenshot of every screen for a manual critique pass.
 */
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const VIEWPORTS = [
  { name: 'phone', width: 412, height: 915 },
  { name: 'small', width: 360, height: 740 },
  { name: 'landscape', width: 915, height: 412 },
  { name: 'tablet', width: 820, height: 1180 },
] as const;
const THEMES = ['light', 'dark'] as const;
const MODES = [
  'Find the chord',
  'From the tonic',
  'Next / previous shape',
  'Name the tones',
  'Quality switch',
  'Progression walk',
  'Name the chord',
] as const;

interface Problem {
  screen: string;
  kind: string;
  detail: string;
}

/** In-page checks. Returns problems found on the current screen. */
async function checkScreen(page: Page, screen: string): Promise<Problem[]> {
  const found = await page.evaluate(() => {
    const out: { kind: string; detail: string }[] = [];
    const vw = window.innerWidth;
    const doc = document.documentElement;
    if (doc.scrollWidth > vw + 1)
      out.push({
        kind: 'overflow-x',
        detail: `page is ${doc.scrollWidth}px wide in a ${vw}px viewport`,
      });

    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none';
    };
    const describe = (el: Element) => {
      const t = (el.getAttribute('aria-label') || el.textContent || '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 40);
      return `<${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''}> "${t}"`;
    };
    const inScroller = (el: Element) => !!el.closest('.board-wrap, .heat-wrap');

    // Tap targets (switch inputs are judged by their whole label row)
    const targets = document.querySelectorAll(
      'button, select, a[href], input:not([type=checkbox]):not([type=file]), label.toggle, [role=button], [role=radio]',
    );
    for (const el of targets) {
      if (!visible(el)) continue;
      // Links inside a sentence are exempt from target size (WCAG 2.5.8 "inline" exception).
      if (el.matches('p a, li a, dd a, p .link.inline, li .link.inline')) continue;
      const r = el.getBoundingClientRect();
      // SVG cells are scaled with the board; allow 1px rounding
      if (r.width < 43.5 || r.height < 43.5)
        out.push({
          kind: 'small-target',
          detail: `${describe(el)} ${Math.round(r.width)}×${Math.round(r.height)}`,
        });
      if (!inScroller(el) && (r.right > vw + 1 || r.left < -1))
        out.push({
          kind: 'off-screen',
          detail: `${describe(el)} at x ${Math.round(r.left)}–${Math.round(r.right)}`,
        });
    }

    // Text contrast (HTML text only; SVG labels sit on role colors checked separately)
    const parse = (c: string) => {
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const [r, g, b, a = '1'] = m[1].split(',').map((x) => x.trim());
      return { r: +r, g: +g, b: +b, a: +a };
    };
    const lum = (c: { r: number; g: number; b: number }) => {
      const f = (v: number) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    };
    const bgOf = (el: Element) => {
      for (let e: Element | null = el; e; e = e.parentElement) {
        const c = parse(getComputedStyle(e).backgroundColor);
        if (c && c.a > 0.5) return c;
      }
      return (
        parse(getComputedStyle(document.body).backgroundColor) ?? { r: 255, g: 255, b: 255, a: 1 }
      );
    };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set<Element>();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || seen.has(el) || !n.textContent?.trim() || el.closest('svg, option, [hidden]'))
        continue;
      seen.add(el);
      if (!visible(el) || el.closest(':disabled, [disabled]')) continue;
      const st = getComputedStyle(el);
      let op = 1;
      for (let e: Element | null = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity;
      if (op < 0.99) continue; // deliberately faded content
      const fg = parse(st.color);
      if (!fg) continue;
      const bg = bgOf(el);
      const L1 = lum(fg),
        L2 = lum(bg);
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      const size = parseFloat(st.fontSize);
      const large = size >= 24 || (size >= 18.66 && +st.fontWeight >= 700);
      if (ratio < (large ? 3 : 4.5))
        out.push({ kind: 'contrast', detail: `${describe(el)} ${ratio.toFixed(2)}:1` });
    }

    // Role-colored notes: white label on the role color
    for (const g of document.querySelectorAll('.fb-note:not(.ghost):not(.outside)')) {
      const c = g.querySelector('circle');
      const t = g.querySelector('.fb-label');
      if (!c || !t) continue;
      const fill = parse(getComputedStyle(c).fill);
      const fg = parse(getComputedStyle(t).fill);
      if (!fill || !fg) continue;
      const L1 = lum(fill),
        L2 = lum(fg);
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      // bold 14px labels: use the 3:1 large-text threshold as a floor
      if (ratio < 3)
        out.push({
          kind: 'note-contrast',
          detail: `"${t.textContent}" ${ratio.toFixed(2)}:1 on ${getComputedStyle(c).fill}`,
        });
    }
    return out;
  });
  return found.map((f) => ({ screen, ...f }));
}

function shotsDir(): string | null {
  const d = process.env.AUDIT_SHOTS;
  if (!d) return null;
  mkdirSync(d, { recursive: true });
  return d;
}

async function visit(page: Page, problems: Problem[], prefix: string, name: string) {
  await page.waitForTimeout(80);
  problems.push(...(await checkScreen(page, `${prefix} ${name}`)));
  const dir = shotsDir();
  if (dir)
    await page.screenshot({
      path: `${dir}/${`${prefix}-${name}`.replace(/[\s/]+/g, '_')}.png`,
      fullPage: true,
    });
}

/** Answer whatever kind of question is on screen (wrongly or via "Show answer"). */
async function answer(page: Page) {
  const show = page.getByRole('button', { name: 'Show answer' });
  if (await show.isVisible()) return show.click();
  const roles = page.getByRole('group', { name: 'Roles' });
  if (await roles.isVisible()) {
    for (let i = 0; i < 4 && !(await page.getByRole('status').isVisible()); i++) {
      await roles.getByRole('button').first().click();
    }
    return;
  }
  const choices = page.getByRole('group', { name: 'Answers' });
  if (await choices.isVisible()) return choices.getByRole('button').first().click();
  // quality switch: tap shown notes until graded (the moving note only selects itself)
  const ids = await page
    .locator('[data-kind=shown], [data-kind=tap]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!));
  for (const id of ids) {
    if (await page.getByRole('status').isVisible()) break;
    const [, s, f] = id.split('-');
    await page
      .getByRole('button', { name: new RegExp(`^String ${s} fret ${f}\\b`) })
      .dispatchEvent('pointerdown');
  }
}

for (const vp of VIEWPORTS) {
  for (const theme of THEMES) {
    test.describe(`${vp.name} ${theme}`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height }, colorScheme: theme });

      test('walkthrough', async ({ page }) => {
        test.setTimeout(120_000);
        const problems: Problem[] = [];
        page.on('pageerror', (e) =>
          problems.push({ screen: page.url(), kind: 'page-error', detail: e.message }),
        );
        page.on('console', (m) => {
          if (m.type() === 'error')
            problems.push({ screen: page.url(), kind: 'console-error', detail: m.text() });
        });
        const pre = `${vp.name}-${theme}`;

        await page.goto('./');
        await visit(page, problems, pre, 'home');
        await page.goto('./#/prefs');
        await visit(page, problems, pre, 'prefs');
        await page.goto('./#/stats');
        await visit(page, problems, pre, 'stats-empty');
        await page.goto('./#/about');
        await visit(page, problems, pre, 'about');
        await page.goto('./#/explore');
        await visit(page, problems, pre, 'explore');
        await page.getByRole('button', { name: 'V', exact: true }).click();
        await visit(page, problems, pre, 'explore-no-fit');
        await page.getByRole('radio', { name: 'Sevenths' }).click();
        await visit(page, problems, pre, 'explore-sevenths');

        for (const mode of MODES) {
          await page.goto('./'); // via Home, as a user would (re-opens Practice fresh)
          await page.getByRole('button', { name: /^Practice/ }).click();
          await page
            .getByRole('radio', { name: new RegExp(`^${mode.replace('/', '\\/')}`) })
            .click();
          await visit(page, problems, pre, `setup ${mode}`);
          await page.getByRole('button', { name: /^Start/ }).click();
          await visit(page, problems, pre, `${mode} question`);
          await answer(page);
          await expect(page.getByRole('status').first()).toBeVisible();
          await visit(page, problems, pre, `${mode} feedback`);
          const next = page.getByRole('button', { name: /^(Next|Next chord|Finish)$/ });
          await next.first().click();
          await visit(page, problems, pre, `${mode} next`);
          await page.getByRole('button', { name: 'End session' }).click();
          await expect(page.getByText('Session complete')).toBeVisible();
          await visit(page, problems, pre, `${mode} summary`);
        }

        await page.goto('./#/stats');
        await visit(page, problems, pre, 'stats');
        await page.goto('./');
        await visit(page, problems, pre, 'home-with-progress');

        // Report every problem (deduplicated) so one run shows the whole picture.
        const uniq = [...new Map(problems.map((p) => [`${p.kind}|${p.detail}`, p])).values()];
        const dir = shotsDir();
        if (dir) writeFileSync(`${dir}/${pre}-problems.json`, JSON.stringify(uniq, null, 1));
        expect(uniq, JSON.stringify(uniq, null, 1)).toEqual([]);
      });
    });
  }
}
