import assert from 'node:assert/strict';
import test from 'node:test';
import { parseContributionCalendar } from '../lib/contributions.ts';

const SAMPLE = `
<h2 id="js-contribution-activity-description" class="f4 text-normal mb-2">
      1,234
      contributions
        in the last year
</h2>
<table><tbody><tr>
<td tabindex="0" data-ix="0" style="width: 10px" data-date="2025-10-06" id="contribution-day-component-0-0" data-level="0" role="gridcell" class="ContributionCalendar-day"></td>
<td tabindex="0" data-ix="1" style="width: 10px" data-date="2025-10-05" id="contribution-day-component-0-1" data-level="2" role="gridcell" class="ContributionCalendar-day"></td>
<td tabindex="0" data-ix="2" style="width: 10px" data-date="2025-10-07" id="contribution-day-component-1-0" data-level="1" role="gridcell" class="ContributionCalendar-day"></td>
</tr></tbody></table>
<tool-tip id="tooltip-a" for="contribution-day-component-0-0" popover="manual" class="sr-only">No contributions on October 6th.</tool-tip>
<tool-tip id="tooltip-b" for="contribution-day-component-0-1" popover="manual" class="sr-only">12 contributions on October 5th.</tool-tip>
<tool-tip id="tooltip-c" for="contribution-day-component-1-0" popover="manual" class="sr-only">1 contribution on October 7th.</tool-tip>
`;

test('reads every day with its exact count, in date order, and the yearly total', () => {
  const { days, total } = parseContributionCalendar(SAMPLE);
  assert.deepEqual(days, [
    { date: '2025-10-05', count: 12 },
    { date: '2025-10-06', count: 0 },
    { date: '2025-10-07', count: 1 },
  ]);
  assert.equal(total, 1234);
});

test('falls back to the shade level when a tooltip is missing', () => {
  const html = '<td data-date="2025-01-01" id="d1" data-level="3"></td>';
  assert.deepEqual(parseContributionCalendar(html).days, [{ date: '2025-01-01', count: 3 }]);
});

test('returns nothing for an unexpected page', () => {
  assert.deepEqual(parseContributionCalendar('<html>rate limited</html>'), { days: [], total: null });
});
