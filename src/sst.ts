import path from 'path';

export const sstCachePaths = (sstFolder: string, homeFolder: string) => {
  return [
    path.resolve(sstFolder, '.sst/platform'),
    path.resolve(homeFolder, '.config/sst/plugins'),
    path.resolve(homeFolder, '.config/sst/bin'),
  ];
};