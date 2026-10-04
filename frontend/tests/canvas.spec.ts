import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
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
 await page.route('**/api/classify',async route=>{await new Promise(r=>setTimeout(r,1500));await route.fulfill({json:{matches:[{id:'swift',confidence:.98}],engine:'Typesafe (System One)',latency_ms:100,cost_usd:.00004,cost_estimated:true,reason:null}})});
 await page.goto('/');await page.getByRole('textbox').fill('ios app');
 await expect(page.getByText('Finding the right pieces for your idea…')).toBeVisible();
 await page.getByRole('button',{name:'Clear prompt'}).click();
 await page.waitForTimeout(1700);
 await expect(page.locator('.tech-card')).toHaveCount(0);
 await expect(page.locator('.pile-card')).toHaveCount(140);
});
test('all six categories fit one desktop screen with token metrics',async({page})=>{
 const catalog: {id:string;category:string}[]=JSON.parse(readFileSync(new URL('../../shared/catalog.json',import.meta.url),'utf8'));
 const categories=[...new Set(catalog.map(t=>t.category))];
 const matches=categories.flatMap(category=>catalog.filter(t=>t.category===category).slice(0,5).map(t=>({id:t.id,confidence:.98})));
 await page.route('**/api/classify',route=>route.fulfill({json:{matches,engine:'Typesafe (System One)',latency_ms:214,cost_usd:.00012,cost_estimated:true,reason:null,input_tokens:2860,output_tokens:420}}));
 await page.setViewportSize({width:1280,height:720});await page.goto('/');
 await page.getByRole('textbox').fill('Complete project stack');
 await expect(page.locator('.tech-card')).toHaveCount(30);
 await expect(page.locator('.token-metric')).toContainText('IN 2,860');
 await expect(page.locator('.token-metric')).toContainText('OUT 420');
 await expect(page.locator('.telemetry')).toContainText('214 ms');
 await expect(page.locator('.tile-category').filter({hasText:'Language'})).toHaveCount(5);
 expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBeLessThanOrEqual(720);
 await page.waitForTimeout(1000);
 await page.screenshot({path:'/tmp/jev-compact-all.png',fullPage:true});
});
test('bakery and microservice prompts select useful stacks',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Bakery website with online ordering'}).click();
 await expect(page.locator('.tech-card').filter({hasText:'Astro'})).toBeVisible();
 await page.getByRole('button',{name:'Microservices with Go & Kubernetes'}).click();
 await expect(page.locator('.tech-card').filter({hasText:'Kubernetes'})).toBeVisible();
});
