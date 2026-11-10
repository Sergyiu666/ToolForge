import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { parseBnrXml, pickDay } from './bnr';

// Public read-only official BNR reference rates.
export const bnrRatesFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(input))
  .handler(async ({ data }) => {
    const year = Number(data.date.slice(0, 4));
    if (year < 2005 || year > new Date().getUTCFullYear()) throw new Error('Date outside BNR coverage');
    const get = async (url: string) => {
      const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) throw new Error('BNR unavailable');
      return parseBnrXml(await res.text());
    };
    const latest = pickDay(await get('https://curs.bnr.ro/nbrfxrates.xml'), data.date);
    let day = latest && latest.date === data.date ? latest : undefined;
    for (let y = year; !day && y >= year - 1; y--) day = pickDay(await get(`https://curs.bnr.ro/files/xml/years/nbrfxrates${y}.xml`), data.date);
    if (!day) throw new Error('No BNR rate published on or before this date');
    return day;
  });
