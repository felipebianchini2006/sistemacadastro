import sharp from 'sharp';

export type ImagePreprocessResult = {
  buffer: Buffer;
  resized: boolean;
  rotated: boolean;
  originalWidth?: number;
  originalHeight?: number;
};

const MAX_DIMENSION = 2000;

export const preprocessImage = async (buffer: Buffer) => {
  const image = sharp(buffer, { failOnError: false });
  const metadata = await image.metadata();
  const width = metadata.width;
  const height = metadata.height;
  const orientation = metadata.orientation ?? 1;

  let pipeline = image.rotate();
  let resized = false;

  if (width && height && (width > MAX_DIMENSION || height > MAX_DIMENSION)) {
    pipeline = pipeline.resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    });
    resized = true;
  }

  const output = await pipeline.jpeg({ quality: 90 }).toBuffer();

  return {
    buffer: output,
    resized,
    rotated: orientation !== 1,
    originalWidth: width,
    originalHeight: height,
  } satisfies ImagePreprocessResult;
};
