import {test,expect} from '@playwright/test';
test('logo pile assembles, switches stacks, and resets',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await expect(page.locator('.pile-card')).toHaveCount(140);
 await page.screenshot({path:'/tmp/jev-initial.png',fullPage:true});
 await page.getByRole('button',{name:'Azure Multi-Agent AI system'}).click();
 await expect(page.locator('.tech-card').filter({hasText:'Microsoft AutoGen'})).toBeVisible();
 await expect(page.locator('.engine')).toHaveText('Keyword Heuristic Fallback');
 const active=await page.locator('.tech-card').count();
 await expect(page.locator('.pile-card')).toHaveCount(140-active);
 await page.screenshot({path:'/tmp/jev-results.png',fullPage:true});
 await page.getByRole('button',{name:'Clear prompt'}).click();
 await expect(page.locator('.pile-card')).toHaveCount(140);
 await expect(page.locator('.tech-card')).toHaveCount(0);
 await page.getByRole('button',{name:'iOS & macOS native app'}).click();
 await expect(page.locator('.tech-card').filter({hasText:'SwiftUI'})).toBeVisible();
 await expect(page.locator('.tech-card').filter({hasText:'Microsoft AutoGen'})).toHaveCount(0);
 expect(errors).toEqual([]);
});
test('mobile layout fits viewport and submits custom prompts',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await page.getByRole('textbox').fill('Real-time streaming media pipeline');
 await expect(page.locator('.tech-card').filter({hasText:'FFmpeg'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 await page.screenshot({path:'/tmp/jev-mobile.png',fullPage:true});
});
test('clear cancels a pending response',async({page})=>{
 await page.route('**/api/classify',async route=>{await new Promise(r=>setTimeout(r,1500));await route.fulfill({json:{matches:[{id:'swift',confidence:.98}],engine:'Jay API (System One)',latency_ms:100,cost_usd:.00004,cost_estimated:true,reason:null}})});
 await page.goto('/');await page.getByRole('textbox').fill('ios app');
 await expect(page.getByText('Finding the right pieces for your idea…')).toBeVisible();
 await page.getByRole('button',{name:'Clear prompt'}).click();
 await page.waitForTimeout(1700);
 await expect(page.locator('.tech-card')).toHaveCount(0);
 await expect(page.locator('.pile-card')).toHaveCount(140);
});
