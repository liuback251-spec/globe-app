let countriesData = {};

export async function loadCountriesData(url) {
  const response = await fetch(url);
  countriesData = await response.json();
}

export function getCountryInfo(iso2, iso3) {
  return countriesData[iso2] || countriesData[iso3] || null;
}

export function getAllCountryNames() {
  return Object.entries(countriesData)
    .filter(([key]) => key !== '_default')
    .map(([iso, data]) => ({
      iso,
      name: data.name,
      nameEn: data.nameEn,
    }));
}
