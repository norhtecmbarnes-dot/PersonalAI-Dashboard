import { v4 } from 'uuid';

interface IdGenerator {
  generateId: () => string;
}

export function generateId(): string {
  return v4();
}

export default generateId;