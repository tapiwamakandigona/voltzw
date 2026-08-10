/** Hand-written, page-specific context for the /units pages.
 *
 *  The whole cluster used to be one template with different numbers in it,
 *  which is exactly what Google refuses to spend crawl budget on (Search
 *  Console: "Discovered – currently not indexed", never crawled). Every entry
 *  below says something true about *that* purchase that no other page says,
 *  in its own words. Nothing here is a promise or a price — prices always come
 *  from the synced tariff data, so this copy cannot go stale.
 */

/** Units-first pages: `/units/{n}-units/`. */
export const UNIT_COPY: Record<number, string> = {
  50: "Fifty units is exactly the first band — the cheapest electricity ZETDC sells, and the only purchase where every single unit is charged at the entry rate. It is also the most efficient top-up in the month: nothing you buy afterwards will ever cost this little per unit again until the quota resets.",
  100: "A hundred units clears the two cheapest bands and stops right before the step up. For a home that cooks on gas and uses electricity for lights, a fridge, a TV and phone charging, this is the shape of a normal top-up rather than an emergency one.",
  150: "A hundred and fifty units is where the ladder starts to bite: the first hundred are still cheap, and the last fifty fall into the third band at roughly double the entry rate. If your bill suddenly feels wrong, this is usually the crossing that did it.",
  200: "Two hundred units is half of the 400 kWh discounted quota and the end of the third band. It is the realistic monthly figure for a household that cooks on electricity a few nights a week and heats water with a geyser occasionally rather than daily.",
  250: "Two hundred and fifty units pushes fifty units into the fourth band, so the average price per unit climbs even though the tariff itself has not changed. Splitting a purchase this size across a month boundary is where the stepped tariff can actually be beaten.",
  300: "Three hundred units is three quarters of the monthly quota — a full-electric household with a geyser running daily, or a small shop. The last hundred units here cost far more than the first hundred, which is why the total is never three times the 100-unit price.",
  400: "Four hundred units is the entire discounted monthly quota, and the largest purchase that still enjoys stepped pricing. Every unit bought above this in the same calendar month is charged at the top band rate, so this is the natural ceiling for one month's buying.",
};

/** Money-first pages: `/units/{zwg|usd}-{amount}/`. */
export const AMOUNT_COPY: Record<string, string> = {
  "zwg-50": "Fifty ZWG is a stop-gap: enough to keep the lights, the fridge and the phones going until payday. Because it lands entirely inside the cheapest band, it is also the fairest price per unit you can pay all month.",
  "zwg-100": "A hundred ZWG stays at the cheap end of the ladder, so almost all of it becomes units instead of being eaten by the higher bands. It is the classic small top-up for a home that cooks on gas and uses electricity for lights, a fridge and phones.",
  "zwg-200": "Two hundred ZWG is about a week for a household moving at the pace of the full monthly quota, and considerably longer if you only run lights, a fridge and a TV. As a first purchase of the month nearly all of it is still priced in the lower bands.",
  "zwg-500": "Five hundred ZWG is a common round-number top-up, and it is big enough to cross into the mid bands. That crossing is why the units it buys move noticeably whenever ZERA adjusts even one band price.",
  "zwg-1000": "A thousand ZWG spans several bands, so its average price per unit is meaningfully higher than a small top-up's. If you already bought earlier this month, this is the amount where entering your prior purchases in the calculator changes the answer most.",
  "zwg-2000": "Two thousand ZWG is a full-electric household's monthly buy: geyser, stove and heating included. At this size a large part of the purchase is priced in the upper bands, which is where splitting across the month boundary saves real money.",
  "zwg-5000": "Five thousand ZWG is a large purchase — a big household, a lodge or a small business. Once it takes you past the 400 kWh quota, every extra unit is charged at the top rate, so buying it as two purchases either side of the 1st is usually cheaper.",
  "usd-1": "One US dollar is the smallest amount worth asking about, and the honest answer is: not much, but it is priced at the cheapest band, so it goes further per dollar than any larger purchase. ZETDC bills in ZWG, so the figure below uses the reference rate published with the tariffs.",
  "usd-2": "Two dollars is a couple of days of light use, and it stays inside the entry band. Like every USD figure on this site it is a conversion, not a ZETDC price list — the meter is credited in ZWG at the published reference rate.",
  "usd-5": "Five dollars sits low enough on the ladder that almost none of it is lost to the expensive upper bands — most of what you pay comes back as units. For a light user it is several days of normal running.",
  "usd-10": "Ten dollars is the round-number amount most people ask about in USD. As a first purchase of the month it stays mostly in the cheaper bands, which is why it buys proportionally more than twenty dollars does.",
  "usd-20": "Twenty dollars reaches into the mid bands, so the units you get are less than double what ten dollars buys. That gap is the stepped tariff working exactly as designed, not a vendor taking a cut.",
  "usd-50": "Fifty dollars is a serious monthly buy — enough to run a geyser and an electric stove through the month. A large slice of it is charged at upper-band rates, which is why the per-unit average is far above the headline entry price.",
  "usd-100": "A hundred dollars is a whole-month buy for a full-electric home, and big enough that part of it can spill past the 400 kWh quota into top-band pricing. Splitting it across two calendar months is the easiest way to get more units for the same money.",
};
