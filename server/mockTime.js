/**
 * Dev-only mock time utility.
 * Replace every `new Date()` / `Date.now()` in server logic with `getNow()`.
 * The mock date is stored in memory and cleared on server restart.
 */

let _mockNow = null;

export const getNow   = () => (_mockNow ? new Date(_mockNow) : new Date());
export const setMockNow   = (iso) => { _mockNow = iso; };
export const clearMockNow = ()    => { _mockNow = null; };
export const getMockNow   = ()    => _mockNow;
