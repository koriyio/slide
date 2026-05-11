const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  await page.goto('https://slide-0pc2.onrender.com');
  
  await new Promise(r => setTimeout(r, 2000));
  await page.type('#auth-username', 'Slide');
  await page.type('#auth-password', 'slide2026');
  await page.click('button[type="submit"]');
  
  await new Promise(r => setTimeout(r, 2000));
  await page.click('.admin-role'); // select Juez 1
  
  await new Promise(r => setTimeout(r, 2000));
  const elements = await page.$$('.nav-item');
  for(let e of elements) {
    const text = await page.evaluate(el => el.textContent, e);
    if(text.includes('Competencias')) {
      await e.click();
      break;
    }
  }
  
  await new Promise(r => setTimeout(r, 2000));
  
  // click jueceo
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    for(let b of btns) {
      if(b.textContent.includes('Jueceo de Ronda')) {
        b.click();
        break;
      }
    }
  });
  
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
