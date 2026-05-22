const surname = "PEREZ DEL OLMO";
const particles = ['DE', 'DEL', 'LA', 'LAS', 'LOS', 'SAN', 'SANTA', 'VDA.', 'VDA', 'VIUDA'];
const words = surname.trim().split(/\s+/);
const parts = [];
for (let i = 0; i < words.length; i++) {
  let currentPart = [];
  while (i < words.length && particles.includes(words[i].toUpperCase())) {
    currentPart.push(words[i]);
    i++;
  }
  if (i < words.length) {
    currentPart.push(words[i]);
  }
  if (currentPart.length > 0) {
    parts.push(currentPart.join(' '));
  }
}
console.log(parts);
