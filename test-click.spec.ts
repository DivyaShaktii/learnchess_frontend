import { test } from '@playwright/test';

test('pawn moves e2 to e4', async ({ page }) => {
  page.on('console', msg => {
    if (!msg.text().includes('vite') && !msg.text().includes('React DevTools'))
      console.log('PAGE:', msg.text());
  });

  await page.goto('http://localhost:5175');
  
  // Wait for board to be ready
  await page.waitForSelector('[data-square="e2"]', { timeout: 10000 });
  await page.waitForTimeout(1000); // Let game init settle

  // Click e2 to select pawn
  console.log('Selecting e2 pawn...');
  await page.click('[data-square="e2"]');
  await page.waitForTimeout(300);

  // Click e4 to move
  console.log('Moving to e4...');
  await page.click('[data-square="e4"]');
  await page.waitForTimeout(2000);

  // Check if piece is now on e4 (the piece image should be on e4)
  const pieceOnE4 = await page.$('[data-square="e4"] img');
  const pieceOnE2 = await page.$('[data-square="e2"] img');
  
  console.log('Piece on e4:', !!pieceOnE4);
  console.log('Piece on e2:', !!pieceOnE2);
  
  // Take screenshot
  await page.screenshot({ path: 'test-after-move.png', fullPage: false });
});
