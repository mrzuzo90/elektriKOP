/* eslint-disable no-unused-expressions -- Playwright CLI consumes this function expression. */
async page => {
 const button = name => page.getByRole('button', {name, exact:true});
 // Run in a dedicated playwright-cli session; this imports the supplied demo.
 await button('⏸ ElektriKOP').click();
 await page.locator('input[type="file"]').setInputFiles('docs/hmi/demo.json');
 await page.keyboard.press('Escape');
 await button('HMI').click();
 await button('Ejecutar HMI').click();
 const assert = (ok, message) => { if (!ok) throw new Error(message); };
 const checkLamp = async (name, value) => {
   await page.waitForFunction(({name,value}) => document.querySelector(`[role="status"][aria-label="${name}"]`)?.dataset.value === String(value), {name,value});
 };
 if (await button('▶ RUN').count()) await button('▶ RUN').click();
 const march = await button('Marcha').boundingBox();
 await page.mouse.move(march.x+40, march.y+20); await page.mouse.down();
 await checkLamp('Entrada marcha',true); await checkLamp('Salida PLC',true);
 assert((await page.getByText('PLC ve: 1', {exact:true}).count()) === 1, 'PLC no ve entrada');
 const activeDebug = await button('0.0').evaluate(el=>getComputedStyle(el).backgroundColor);
 await page.mouse.move(march.x+400,march.y+130); await page.mouse.up();
 await checkLamp('Entrada marcha',false); await checkLamp('Salida PLC',false);
 assert(activeDebug !== await button('0.0').evaluate(el=>getComputedStyle(el).backgroundColor), 'Depuración no cambió');
 await page.keyboard.press('0'); await checkLamp('Entrada marcha',true); await checkLamp('Salida PLC',true);
 await page.keyboard.press('0'); await checkLamp('Entrada marcha',false);
 await page.getByRole('textbox',{name:'Consigna',exact:true}).fill('');
 await page.getByRole('textbox',{name:'Consigna',exact:true}).pressSequentially('70');
 await page.keyboard.press('Enter');
 assert(await page.getByRole('status',{name:'Nivel actual',exact:true}).textContent() === '70', 'Consigna no aplicada');
 await checkLamp('Entrada marcha',false);
 await page.getByRole('textbox',{name:'Consigna',exact:true}).fill('999'); await page.keyboard.press('Enter');
 assert(await page.getByRole('textbox',{name:'Consigna',exact:true}).getAttribute('aria-invalid') === 'true', 'No valida rango');
 assert(await page.getByRole('status',{name:'Nivel actual',exact:true}).textContent() === '70', 'Escritura inválida alteró IW0');
 await page.keyboard.press('Escape');
 assert(await page.getByRole('textbox',{name:'Consigna',exact:true}).getAttribute('aria-invalid') === 'false', 'Escape conserva error');
 await button('Alternar entrada').click(); await checkLamp('Entrada marcha',true);
 await button('Alternar entrada').click(); await checkLamp('Entrada marcha',false);
 await button('Detalle').click(); await button('Volver').click();
 await checkLamp('Entrada marcha',false);
 // Window focus loss while holding a real pointer.
 await page.mouse.move(march.x+40,march.y+20); await page.mouse.down(); await checkLamp('Entrada marcha',true);
 await page.evaluate(() => window.dispatchEvent(new Event('blur')));
 await checkLamp('Entrada marcha',false); await page.mouse.up();
 // Mode switch with a keyboard-held momentary.
 await button('Marcha').focus(); await page.keyboard.down('Space'); await checkLamp('Entrada marcha',true);
 await button('Editar HMI').click(); await page.keyboard.up('Space');
 assert(await page.getByText('PLC ve: 0',{exact:true}).count()===1,'Cambio de modo dejó entrada activa');
 await button('Ejecutar HMI').click(); await checkLamp('Entrada marcha',false);
 await button('⏸ STOP').click();
 await button('Editar HMI').click();
 const count = await page.locator('.hmi-screens button').count();
 await button('+ Pantalla').click(); await page.keyboard.press('Control+z');
 assert(await page.locator('.hmi-screens button').count() === count, 'Deshacer inmediato falla');
 await page.keyboard.press('Control+Shift+z');
 assert(await page.locator('.hmi-screens button').count() === count + 1, 'Rehacer falla');
 await page.keyboard.press('Control+z');
 await page.waitForFunction(() => JSON.parse(localStorage.getItem('elektrikop.autosave.v1'))?.hmi?.screens.length === 2);
 await page.reload(); await button('HMI').click(); await button('Ejecutar HMI').click();
 assert(await page.locator('.hmi-runtime .hmi-component').count() === 8, 'Recarga pierde componentes');
 await page.keyboard.press('0'); await checkLamp('Entrada marcha', true);
 await page.keyboard.press('0');

 return { sharedInputAndOutput:true, releaseOutside:true, keyboard:true, setpoint:true, validation:true, toggle:true, navigation:true, blur:true, modeSwitch:true };
}
