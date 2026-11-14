export function monthlyCost(price, downPercent, annualRate, years, taxAnnual, insuranceAnnual, hoaMonthly, maintenancePercent) {
 const loan = price * (1 - downPercent / 100), n = years * 12, r = annualRate / 1200;
 const principalInterest = loan === 0 ? 0 : r === 0 ? loan / n : loan * r / (1 - Math.pow(1 + r, -n));
 return { principalInterest, tax: taxAnnual / 12, insurance: insuranceAnnual / 12, hoa: hoaMonthly, maintenance: price * maintenancePercent / 1200, total: principalInterest + taxAnnual / 12 + insuranceAnnual / 12 + hoaMonthly + price * maintenancePercent / 1200 };
}
export function validListing(value) {
 return !!value && typeof value === 'object' && typeof value.id === 'string' && typeof value.address === 'string' && typeof value.url === 'string' && /^https?:\/\//.test(value.url) && typeof value.zip === 'string' && /^\d{5}$/.test(value.zip) && Number.isFinite(value.price) && value.price > 0 && Number.isInteger(value.beds) && value.beds >= 4 && ['待研究','值得看','已看房','考虑出价','放弃'].includes(value.status) && typeof value.note === 'string';
}
export function parseBackup(text) {
 const data = JSON.parse(text);
 if(data.version !== 1 || !Array.isArray(data.listings) || !data.listings.every(validListing) || data.listings.length > 500 || new Set(data.listings.map(x=>x.id)).size !== data.listings.length) throw new Error('备份格式错误：必须是本应用导出的 v1 备份，最多 500 套四房独栋候选房源。');
 return data.listings;
}
