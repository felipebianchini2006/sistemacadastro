import { config } from 'dotenv';
import { resolve } from 'node:path';

if (process.env.NODE_ENV !== 'production') {
  config({ path: resolve(__dirname, '../../api/.env') });
}
