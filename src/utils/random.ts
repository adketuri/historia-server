export function random(seed: number) {
  var x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}
