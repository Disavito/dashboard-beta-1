const { performance } = require('perf_hooks');

const normalize = (text) => String(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const fields = ["Juan", "Perez", "Lima", "Mz A", "Lt 5"];
const query = "Juan Perez";

const start = performance.now();
for (let i = 0; i < 7000; i++) {
  const tokens = normalize(query).trim().split(/\s+/);
  const textToSearch = normalize(fields.filter(val => val !== undefined && val !== null).join(' '));
  tokens.every(token => textToSearch.includes(token));
}
const end = performance.now();
console.log("Time:", end - start, "ms");
