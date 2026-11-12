// Formas geométricas desenhadas em SVG.
import { pick } from "./util.js";

export const SHAPES = {
  circulo: { nome: "círculo", lados: 0, svg: '<circle cx="50" cy="50" r="40"/>' },
  quadrado: { nome: "quadrado", lados: 4, svg: '<rect x="12" y="12" width="76" height="76" rx="4"/>' },
  triangulo: { nome: "triângulo", lados: 3, svg: '<polygon points="50,8 92,88 8,88"/>' },
  retangulo: { nome: "retângulo", lados: 4, svg: '<rect x="4" y="25" width="92" height="50" rx="4"/>' },
  pentagono: { nome: "pentágono", lados: 5, svg: '<polygon points="50,6 94,38 77,90 23,90 6,38"/>' },
  hexagono: { nome: "hexágono", lados: 6, svg: '<polygon points="27,8 73,8 96,50 73,92 27,92 4,50"/>' },
  estrela: { nome: "estrela", lados: 10, svg: '<polygon points="50,4 61,38 97,38 68,59 79,94 50,72 21,94 32,59 3,38 39,38"/>' }
};

export const SHAPE_COLORS = ["#ff6b8a", "#4cc3ff", "#ffc93c", "#7ed957", "#b67cff", "#ff9f43"];

export function shapeSVG(key, size = 70, color) {
  const fill = color || pick(SHAPE_COLORS);
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" aria-label="${SHAPES[key].nome}"><g fill="${fill}" stroke="#2a2140" stroke-width="4" stroke-linejoin="round">${SHAPES[key].svg}</g></svg>`;
}
