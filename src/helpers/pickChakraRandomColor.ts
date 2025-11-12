function fnv1aHash(str: string) {
  // FNV-1a 32-bit hash
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h >>> 0) * 0x01000193 >>> 0;
  }
  return h >>> 0;
}

function pickChakraRandomColor(seed?: string, variant = '') {
  const colors = [
    'red',
    'orange',
    'yellow',
    'green',
    'teal',
    'blue',
    'cyan',
    'purple',
    'pink'
  ];

  let index: number;
  if (seed) {
    const hash = fnv1aHash(seed);
    index = hash % colors.length;
  } else {
    index = Math.floor(Math.random() * colors.length);
  }

  return colors[index] + variant;
}

export default pickChakraRandomColor;