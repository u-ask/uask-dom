export function percentile(data: number[], k: number): number {
  const index = Math.round(data.length * (k / 100));
  return data.length == 1 ? data[0] : data[index];
}

export function percentiles(data: number[], segments = 4): number[] {
  data = data.slice().sort((a, b) => a - b);
  const index = partition(data.length, segments);
  return index.map(i => {
    const p = i % 1;
    if (p == 0) return data[i];
    i = i - p;
    return (1 - p) * data[i] + p * data[i + 1];
  });
}

export function partition(length: number, segments: number): number[] {
  return Array.from(
    new Array(segments + 1),
    (_, i) => (i * (length - 1)) / segments
  );
}
