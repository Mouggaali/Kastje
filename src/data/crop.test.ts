import { describe, expect, it } from 'vitest';
import { clampCrop, nextRotation, rotatedSize } from './crop';

describe('rotatedSize', () => {
  it('wisselt breedte en hoogte bij een kwartslag', () => {
    expect(rotatedSize(1600, 1200, 0)).toEqual({ width: 1600, height: 1200 });
    expect(rotatedSize(1600, 1200, 90)).toEqual({ width: 1200, height: 1600 });
    expect(rotatedSize(1600, 1200, 180)).toEqual({ width: 1600, height: 1200 });
    expect(rotatedSize(1600, 1200, 270)).toEqual({ width: 1200, height: 1600 });
  });
});

describe('clampCrop', () => {
  it('neemt bij zoom 1 een vierkant zo groot als de korte kant, in het midden', () => {
    expect(clampCrop(1600, 1200, 0, 1, { x: 800, y: 600 })).toEqual({ x: 200, y: 0, size: 1200 });
  });

  it('wordt kleiner bij inzoomen', () => {
    expect(clampCrop(1600, 1200, 0, 2, { x: 800, y: 600 })).toEqual({ x: 500, y: 300, size: 600 });
  });

  it('blijft binnen de foto als je te ver schuift', () => {
    expect(clampCrop(1600, 1200, 0, 1, { x: -500, y: 9999 })).toEqual({ x: 0, y: 0, size: 1200 });
    expect(clampCrop(1600, 1200, 0, 2, { x: 9999, y: -10 })).toEqual({ x: 1000, y: 0, size: 600 });
  });

  it('rekent in de gedraaide foto', () => {
    // Na 90° is de foto 1200 breed en 1600 hoog: het kader schuift nu verticaal.
    expect(clampCrop(1600, 1200, 90, 1, { x: 600, y: 800 })).toEqual({ x: 0, y: 200, size: 1200 });
  });

  it('zoomt nooit uit voorbij de foto', () => {
    expect(clampCrop(1000, 1000, 0, 0.5, { x: 500, y: 500 }).size).toBe(1000);
  });
});

describe('nextRotation', () => {
  it('draait een kwartslag en begint na 270 weer bij 0', () => {
    expect(nextRotation(0)).toBe(90);
    expect(nextRotation(270)).toBe(0);
  });
});
