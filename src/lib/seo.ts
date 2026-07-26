export const SITE = "https://zesa.tapiwa.me";

/** Site-wide publisher identity, referenced by the other schema blocks. */
export const ORGANIZATION = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE}/#organization`,
  name: "VoltZW",
  url: SITE,
  logo: `${SITE}/icon.png`,
  description:
    "Independent ZESA (ZETDC) prepaid electricity tools for Zimbabwe: tariff calculator, daily-verified tariff data and token retrieval help.",
  areaServed: { "@type": "Country", name: "Zimbabwe" },
  email: "silentics.org@gmail.com",
  disambiguatingDescription:
    "VoltZW is not affiliated with ZESA Holdings or ZETDC. Tariff data is checked against ZERA-approved rates.",
};

export const WEBSITE = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE}/#website`,
  url: SITE,
  name: "VoltZW",
  inLanguage: "en-ZW",
  publisher: { "@id": `${SITE}/#organization` },
};

/** Trail helper: pass path segments as [label, href] pairs, home is added. */
export function breadcrumb(trail: [string, string][]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [["ZESA calculator", "/"], ...trail].map(([name, href], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: `${SITE}${href}`,
    })),
  };
}

/** Dataset schema for the tariff API + history series. Makes the data itself
 *  eligible for dataset surfaces, which no competing calculator publishes. */
export function tariffDataset(opts: {
  effectiveDate: string;
  firstDate: string;
  rows: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "ZESA (ZETDC) prepaid electricity tariff history for Zimbabwe",
    description:
      "Daily record of ZERA-approved ZETDC prepaid electricity tariffs: all six stepped consumption bands in ZWG, with and without the 6% Rural Electrification levy, plus the published ZWG/USD reference rate.",
    url: `${SITE}/zesa-tariffs/history/`,
    license: "https://creativecommons.org/licenses/by/4.0/",
    creator: { "@id": `${SITE}/#organization` },
    isAccessibleForFree: true,
    temporalCoverage: `${opts.firstDate}/${opts.effectiveDate}`,
    spatialCoverage: { "@type": "Country", name: "Zimbabwe" },
    variableMeasured: "ZESA prepaid electricity price per kWh (ZWG)",
    measurementTechnique: "Automated daily capture of published ZERA-approved ZETDC schedules",
    distribution: [
      {
        "@type": "DataDownload",
        encodingFormat: "application/json",
        contentUrl: `${SITE}/api/v1/tariff-history.json`,
      },
      {
        "@type": "DataDownload",
        encodingFormat: "text/csv",
        contentUrl: `${SITE}/api/v1/tariff-history.csv`,
      },
    ],
  };
}

/** Small helper so pages can drop several blocks without repeating markup. */
export function jsonLdProps(...blocks: unknown[]) {
  return { __html: JSON.stringify(blocks.length === 1 ? blocks[0] : blocks) };
}
