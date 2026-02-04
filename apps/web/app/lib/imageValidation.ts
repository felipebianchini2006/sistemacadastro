export type ImageValidationResult = {
  valid: boolean;
  warnings: string[];
  errors: string[];
  metadata: {
    width: number;
    height: number;
    size: number;
    type: string;
  };
};

export type ImageQualityCheck = {
  brightness?: number;
  isBlurry?: boolean;
};

const MIN_WIDTH = 600;
const MIN_HEIGHT = 600;
const MIN_SIZE = 5 * 1024; // 5KB
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/**
 * Valida resolução mínima, tamanho do arquivo e tipo
 */
export async function validateImageBasics(file: File): Promise<ImageValidationResult> {
  const result: ImageValidationResult = {
    valid: true,
    warnings: [],
    errors: [],
    metadata: {
      width: 0,
      height: 0,
      size: file.size,
      type: file.type,
    },
  };

  // Validar tipo de arquivo
  if (!ALLOWED_TYPES.includes(file.type)) {
    result.valid = false;
    result.errors.push(`Tipo de arquivo não suportado: ${file.type}. Use JPEG, PNG ou WebP.`);
    return result;
  }

  // Validar tamanho do arquivo
  if (file.size < MIN_SIZE) {
    result.valid = false;
    result.errors.push(
      `Arquivo muito pequeno (${(file.size / 1024).toFixed(0)}KB). Mínimo: ${(MIN_SIZE / 1024).toFixed(0)}KB.`,
    );
  }

  if (file.size > MAX_SIZE) {
    result.valid = false;
    result.errors.push(
      `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: ${(MAX_SIZE / 1024 / 1024).toFixed(0)}MB.`,
    );
  }

  // Validar dimensões
  try {
    const dimensions = await getImageDimensions(file);
    result.metadata.width = dimensions.width;
    result.metadata.height = dimensions.height;

    if (dimensions.width < MIN_WIDTH || dimensions.height < MIN_HEIGHT) {
      result.valid = false;
      result.errors.push(
        `Resolução muito baixa (${dimensions.width}x${dimensions.height}px). Mínimo: ${MIN_WIDTH}x${MIN_HEIGHT}px.`,
      );
    }
  } catch (error) {
    result.valid = false;
    result.errors.push('Não foi possível ler as dimensões da imagem.');
  }

  return result;
}

/**
 * Verifica qualidade da imagem (brilho e blur) - opcional e mais pesado
 */
export async function checkImageQuality(file: File): Promise<ImageQualityCheck> {
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return {};
    }

    // Usar resolução reduzida para performance (sample)
    const sampleWidth = Math.min(bitmap.width, 400);
    const sampleHeight = Math.min(bitmap.height, 400);
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;

    ctx.drawImage(bitmap, 0, 0, sampleWidth, sampleHeight);

    const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
    const brightness = calculateBrightness(imageData);

    return {
      brightness,
    };
  } catch (error) {
    console.error('Erro ao verificar qualidade da imagem:', error);
    return {};
  }
}

/**
 * Calcula o brilho médio da imagem (0-255)
 */
function calculateBrightness(imageData: ImageData): number {
  const data = imageData.data;
  let totalBrightness = 0;
  const pixelCount = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Fórmula de luminância percebida
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    totalBrightness += brightness;
  }

  return totalBrightness / pixelCount;
}

/**
 * Obtém dimensões da imagem
 */
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Falha ao carregar imagem'));
    };

    img.src = url;
  });
}

/**
 * Validação completa com warnings de qualidade
 */
export async function validateImageComplete(
  file: File,
  options: { checkQuality?: boolean } = {},
): Promise<ImageValidationResult> {
  const basicValidation = await validateImageBasics(file);

  if (!basicValidation.valid || !options.checkQuality) {
    return basicValidation;
  }

  // Verificar qualidade adicional
  const quality = await checkImageQuality(file);

  // Avisos de brilho
  if (quality.brightness !== undefined) {
    if (quality.brightness < 60) {
      basicValidation.warnings.push(
        'A imagem está muito escura. Tente fotografar com mais iluminação.',
      );
    } else if (quality.brightness > 220) {
      basicValidation.warnings.push('A imagem está muito clara. Evite luz direta ou flash.');
    }
  }

  return basicValidation;
}

/**
 * Helper para mostrar alertas ao usuário
 */
export function formatValidationMessage(result: ImageValidationResult): string {
  const messages: string[] = [];

  if (result.errors.length > 0) {
    messages.push('Problemas encontrados:', ...result.errors);
  }

  if (result.warnings.length > 0) {
    messages.push('Avisos:', ...result.warnings);
  }

  return messages.join('\n');
}

/**
 * Verifica se deve mostrar aviso ao usuário
 */
export function shouldWarnUser(result: ImageValidationResult): boolean {
  return result.warnings.length > 0 || !result.valid;
}
